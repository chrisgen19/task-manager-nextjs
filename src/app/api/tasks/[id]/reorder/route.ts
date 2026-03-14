import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reorderSubtasksSchema } from "@/schemas";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: parentId } = await params;

  const parent = await db.task.findFirst({
    where: { id: parentId, userId: session.user.id },
  });
  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = reorderSubtasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updates = parsed.data.subtaskIds.map((subtaskId, index) =>
      db.task.updateMany({
        where: { id: subtaskId, parentId, userId: session.user.id },
        data: { sortOrder: index },
      })
    );

    await db.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
