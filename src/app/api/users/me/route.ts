import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateUserSchema } from "@/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, currentPassword, newPassword } = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;

    if (email) {
      const existing = await db.user.findFirst({
        where: { email, NOT: { id: session.user.id } },
      });
      if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      updateData.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }
      const user = await db.user.findUnique({ where: { id: session.user.id } });
      if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ success: true });
}
