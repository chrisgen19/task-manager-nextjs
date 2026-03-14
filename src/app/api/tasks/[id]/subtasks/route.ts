import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateSubtaskNumber } from "@/lib/subtask";
import { subtaskSchema } from "@/schemas";

const taskInclude = {
  workboard: { select: { key: true, name: true } },
  parent: { select: { taskNumber: true } },
  _count: { select: { subtasks: true } },
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: parentId } = await params;

  const parent = await db.task.findFirst({
    where: { id: parentId, userId: session.user.id },
  });
  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
  if (parent.parentId) {
    return NextResponse.json({ error: "Cannot nest subtasks more than one level" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = subtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const subtask = await allocateSubtaskNumber(parentId, async (tx, subtaskNumber, sortOrder) => {
      const updatedBoard = await tx.workboard.update({
        where: { id: parent.workboardId },
        data: { taskCounter: { increment: 1 } },
        select: { taskCounter: true },
      });

      return tx.task.create({
        data: {
          taskNumber: updatedBoard.taskCounter,
          title: parsed.data.title,
          description: "",
          jiraUrl: "",
          priority: parent.priority,
          status: 1,
          userId: session.user.id,
          workboardId: parent.workboardId,
          parentId,
          subtaskNumber,
          sortOrder,
        },
        include: taskInclude,
      });
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Parent task not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Cannot add subtasks to a subtask") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
