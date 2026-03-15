import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema } from "@/schemas";
import { sanitizeHtmlServer } from "@/lib/sanitize";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, commentId } = await params;

  const comment = await db.comment.findFirst({
    where: { id: commentId, taskId: id, userId: session.user.id },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await db.comment.update({
      where: { id: commentId },
      data: { content: sanitizeHtmlServer(parsed.data.content) },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, commentId } = await params;

  const comment = await db.comment.findFirst({
    where: { id: commentId, taskId: id, userId: session.user.id },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
