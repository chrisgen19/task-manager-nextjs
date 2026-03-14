import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { convertTaskSchema } from "@/schemas";

const taskInclude = {
  workboard: { select: { key: true, name: true } },
  parent: { select: { taskNumber: true } },
  _count: { select: { subtasks: true } },
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await db.task.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { subtasks: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = convertTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    if (parsed.data.type === "to-subtask") {
      if (!parsed.data.parentId) {
        return NextResponse.json({ error: "parentId is required" }, { status: 400 });
      }
      if (task._count.subtasks > 0) {
        return NextResponse.json({ error: "Cannot convert a task with subtasks" }, { status: 400 });
      }

      const parent = await db.task.findFirst({
        where: { id: parsed.data.parentId, userId: session.user.id },
      });
      if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
      if (parent.parentId) {
        return NextResponse.json({ error: "Cannot nest subtasks more than one level" }, { status: 400 });
      }

      const maxSubtask = await db.task.aggregate({
        where: { parentId: parent.id },
        _max: { subtaskNumber: true, sortOrder: true },
      });

      const updated = await db.task.update({
        where: { id },
        data: {
          parentId: parent.id,
          subtaskNumber: (maxSubtask._max.subtaskNumber ?? 0) + 1,
          sortOrder: (maxSubtask._max.sortOrder ?? -1) + 1,
        },
        include: taskInclude,
      });

      return NextResponse.json(updated);
    }

    if (parsed.data.type === "to-standalone") {
      const updated = await db.task.update({
        where: { id },
        data: {
          parentId: null,
          subtaskNumber: null,
          sortOrder: 0,
        },
        include: taskInclude,
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
