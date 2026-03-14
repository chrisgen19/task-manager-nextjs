import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";

const taskInclude = {
  workboard: { select: { key: true, name: true } },
  parent: { select: { taskNumber: true } },
  _count: { select: { subtasks: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await db.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: taskInclude,
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = taskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, jiraUrl, priority, status, dueDate, workboardId, parentId } = parsed.data;

    // Verify the workboard belongs to this user
    const workboard = await db.workboard.findFirst({
      where: { id: workboardId, userId: session.user.id },
    });
    if (!workboard) {
      return NextResponse.json({ error: "Workboard not found" }, { status: 404 });
    }

    let subtaskNumber: number | null = null;
    let sortOrder = 0;

    if (parentId) {
      const parent = await db.task.findFirst({
        where: { id: parentId, userId: session.user.id },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
      }
      if (parent.parentId) {
        return NextResponse.json({ error: "Cannot nest subtasks more than one level" }, { status: 400 });
      }

      const maxSubtask = await db.task.aggregate({
        where: { parentId },
        _max: { subtaskNumber: true, sortOrder: true },
      });
      subtaskNumber = (maxSubtask._max.subtaskNumber ?? 0) + 1;
      sortOrder = (maxSubtask._max.sortOrder ?? -1) + 1;
    }

    // Atomically increment taskCounter and get new taskNumber
    const updatedBoard = await db.workboard.update({
      where: { id: workboardId },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true },
    });

    const task = await db.task.create({
      data: {
        taskNumber: updatedBoard.taskCounter,
        title,
        description: sanitizeHtmlServer(description ?? ""),
        jiraUrl: jiraUrl ?? "",
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: session.user.id,
        workboardId,
        parentId: parentId ?? null,
        subtaskNumber,
        sortOrder,
      },
      include: taskInclude,
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
