import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";
import { detectChanges } from "@/lib/activity";

const taskInclude = {
  workboard: { select: { key: true, name: true } },
  parent: { select: { taskNumber: true } },
  _count: { select: { subtasks: true } },
} as const;

async function getTaskOrFail(id: string, userId: string) {
  return db.task.findFirst({ where: { id, userId }, include: taskInclude });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTaskOrFail(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getTaskOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = taskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, description, jiraUrl, priority, status, dueDate } = parsed.data;

    const changes = detectChanges(existing, {
      status,
      priority,
      title,
      description: sanitizeHtmlServer(description ?? ""),
      dueDate: dueDate ? new Date(dueDate) : null,
      jiraUrl: jiraUrl ?? "",
    });

    const task = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: {
          title,
          description: sanitizeHtmlServer(description ?? ""),
          jiraUrl: jiraUrl ?? "",
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: taskInclude,
      });

      if (changes.length > 0) {
        await tx.activityLog.createMany({
          data: changes.map((c) => ({
            taskId: id,
            userId: session.user.id,
            action: c.action,
            field: c.field,
            oldValue: c.oldValue,
            newValue: c.newValue,
          })),
        });
      }

      return updated;
    });

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getTaskOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.parentId) {
    await db.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          taskId: existing.parentId!,
          userId: session.user.id,
          action: "subtask_deleted",
          metadata: { subtaskTitle: existing.title },
        },
      });
      await tx.task.delete({ where: { id } });
    });
  } else {
    await db.task.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
