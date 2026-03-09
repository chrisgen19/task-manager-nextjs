import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";

async function getTaskOrFail(id: string, userId: string) {
  const task = await db.task.findFirst({ where: { id, userId } });
  return task;
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

    const task = await db.task.update({
      where: { id },
      data: {
        title,
        description: sanitizeHtmlServer(description ?? ""),
        jiraUrl: jiraUrl ?? "",
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
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

  await db.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
