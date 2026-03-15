import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";
import { linkAttachmentsToComment } from "@/lib/attachments";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await db.task.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await db.comment.findMany({
    where: { taskId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await db.task.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        content: sanitizeHtmlServer(parsed.data.content),
        taskId: id,
        userId: session.user.id,
      },
      include: { user: { select: { name: true } } },
    });

    // Link any unlinked attachments to this comment
    linkAttachmentsToComment(comment.content, id, comment.id, session.user.id).catch(() => {});

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
