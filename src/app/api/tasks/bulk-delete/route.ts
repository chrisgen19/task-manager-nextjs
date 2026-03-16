import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteManyFromR2 } from "@/lib/r2";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { taskIds } = parsed.data;

  // Verify all tasks belong to the user
  const tasks = await db.task.findMany({
    where: { id: { in: taskIds }, userId: session.user.id },
    select: { id: true, parentId: true, title: true },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ error: "No matching tasks found" }, { status: 404 });
  }

  const verifiedIds = tasks.map((t) => t.id);

  // Collect R2 keys before deleting (includes subtask attachments via cascade)
  const attachments = await db.attachment.findMany({
    where: {
      OR: [
        { taskId: { in: verifiedIds } },
        { task: { parentId: { in: verifiedIds } } },
      ],
    },
    select: { r2Key: true },
  });

  // Log subtask deletions for parent activity feeds
  const subtasks = tasks.filter((t) => t.parentId && !verifiedIds.includes(t.parentId));

  await db.$transaction(async (tx) => {
    if (subtasks.length > 0) {
      await tx.activityLog.createMany({
        data: subtasks.map((t) => ({
          taskId: t.parentId!,
          userId: session.user.id,
          action: "subtask_deleted" as const,
          metadata: { subtaskTitle: t.title },
        })),
      });
    }

    await tx.task.deleteMany({
      where: { id: { in: verifiedIds } },
    });
  });

  // Delete files from R2 after DB deletion succeeds
  if (attachments.length > 0) {
    deleteManyFromR2(attachments.map((a) => a.r2Key)).catch(() => {});
  }

  return NextResponse.json({ deleted: verifiedIds.length });
}
