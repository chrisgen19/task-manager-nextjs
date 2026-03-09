import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workboardSchema } from "@/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workboards = await db.workboard.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json(workboards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = workboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, key, description } = parsed.data;

    // Check key uniqueness for this user
    const existing = await db.workboard.findUnique({
      where: { userId_key: { userId: session.user.id, key } },
    });
    if (existing) {
      return NextResponse.json({ error: `Key "${key}" is already in use` }, { status: 409 });
    }

    const workboard = await db.workboard.create({
      data: { name, key, description, userId: session.user.id },
    });

    return NextResponse.json(workboard, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
