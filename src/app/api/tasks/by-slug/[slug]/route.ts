import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  // Parse slug: "PROJ-123" or "PROJ-123.1" (subtask)
  const match = slug.match(/^([A-Z]+)-(\d+)(?:\.(\d+))?$/);
  if (!match) return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });

  const [, key, numStr, subtaskNumStr] = match;
  const taskNumber = parseInt(numStr, 10);

  const workboard = await db.workboard.findUnique({
    where: { userId_key: { userId: session.user.id, key } },
  });
  if (!workboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const taskInclude = {
    workboard: { select: { key: true, name: true } },
    parent: { select: { taskNumber: true } },
    _count: { select: { subtasks: true } },
  };

  if (subtaskNumStr) {
    // Find parent first, then subtask
    const parent = await db.task.findFirst({
      where: { workboardId: workboard.id, taskNumber, parentId: null },
    });
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const subtask = await db.task.findUnique({
      where: { parentId_subtaskNumber: { parentId: parent.id, subtaskNumber: parseInt(subtaskNumStr, 10) } },
      include: taskInclude,
    });
    if (!subtask) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(subtask);
  }

  const task = await db.task.findFirst({
    where: { workboardId: workboard.id, taskNumber, parentId: null },
    include: taskInclude,
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}
