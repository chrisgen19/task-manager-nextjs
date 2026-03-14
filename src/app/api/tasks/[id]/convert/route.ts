import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateSubtaskNumber } from "@/lib/subtask";
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
      if (parsed.data.parentId === id) {
        return NextResponse.json({ error: "A task cannot be its own parent" }, { status: 400 });
      }

      const parent = await db.task.findFirst({
        where: { id: parsed.data.parentId, userId: session.user.id },
      });
      if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
      if (parent.parentId) {
        return NextResponse.json({ error: "Cannot nest subtasks more than one level" }, { status: 400 });
      }
      if (parent.workboardId !== task.workboardId) {
        return NextResponse.json({ error: "Parent must be on the same board" }, { status: 400 });
      }

      const updated = await allocateSubtaskNumber(parent.id, async (tx, subtaskNumber, sortOrder) => {
        // Lock the task being converted to prevent concurrent subtask additions
        await tx.$queryRaw`SELECT id FROM "Task" WHERE id = ${id} FOR UPDATE`;

        const childCount = await tx.task.count({ where: { parentId: id } });
        if (childCount > 0) {
          throw new Error("Cannot convert a task with subtasks");
        }

        return tx.task.update({
          where: { id },
          data: { parentId: parent.id, subtaskNumber, sortOrder },
          include: taskInclude,
        });
      });

      return NextResponse.json(updated);
    }

    if (parsed.data.type === "to-standalone") {
      if (!task.parentId) {
        return NextResponse.json({ error: "Task is already a standalone task" }, { status: 400 });
      }
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Cannot convert a task with subtasks" || message === "Cannot add subtasks to a subtask") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    const isDeadlock =
      error !== null && typeof error === "object" && "code" in error && (error as { code: string }).code === "40P01";
    if (isDeadlock) {
      return NextResponse.json({ error: "Conflict — please try again" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
