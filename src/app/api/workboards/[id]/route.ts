import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workboardSchema } from "@/schemas";

async function getWorkboardOrFail(id: string, userId: string) {
  return db.workboard.findFirst({ where: { id, userId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workboard = await getWorkboardOrFail(id, session.user.id);
  if (!workboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(workboard);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getWorkboardOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = workboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, key, description } = parsed.data;

    // Check key uniqueness (excluding self)
    if (key !== existing.key) {
      const conflict = await db.workboard.findUnique({
        where: { userId_key: { userId: session.user.id, key } },
      });
      if (conflict) {
        return NextResponse.json({ error: `Key "${key}" is already in use` }, { status: 409 });
      }
    }

    const workboard = await db.workboard.update({
      where: { id },
      data: { name, key, description },
    });

    return NextResponse.json(workboard);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getWorkboardOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.workboard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
