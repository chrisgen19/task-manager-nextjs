import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await db.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
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

    const { title, description, jiraUrl, priority, status, dueDate } = parsed.data;

    const task = await db.task.create({
      data: {
        title,
        description: sanitizeHtmlServer(description ?? ""),
        jiraUrl: jiraUrl ?? "",
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
