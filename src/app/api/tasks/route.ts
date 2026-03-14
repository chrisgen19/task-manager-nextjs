import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateSubtaskNumber } from "@/lib/subtask";
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

      const task = await allocateSubtaskNumber(parentId, async (tx, subtaskNumber, sortOrder) => {
        const updatedBoard = await tx.workboard.update({
          where: { id: workboardId },
          data: { taskCounter: { increment: 1 } },
          select: { taskCounter: true },
        });

        return tx.task.create({
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
            parentId,
            subtaskNumber,
            sortOrder,
          },
          include: taskInclude,
        });
      });

      return NextResponse.json(task, { status: 201 });
    }

    // Standalone task — no subtask allocation needed
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
      },
      include: taskInclude,
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
