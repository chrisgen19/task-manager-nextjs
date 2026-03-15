import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await db.task.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";

  const includeComments = filter === "all" || filter === "comments";
  const includeActivity = filter === "all" || filter === "activity";

  const [comments, activities] = await Promise.all([
    includeComments
      ? db.comment.findMany({
          where: { taskId: id },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [],
    includeActivity
      ? db.activityLog.findMany({
          where: { taskId: id },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const feed = [
    ...comments.map((c) => ({ type: "comment" as const, data: c, createdAt: c.createdAt })),
    ...activities.map((a) => ({ type: "activity" as const, data: a, createdAt: a.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(feed.map(({ type, data }) => ({ type, data })));
}
