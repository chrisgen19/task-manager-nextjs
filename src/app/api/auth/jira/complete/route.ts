import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cloudId, cloudName } = (await request.json()) as {
    cloudId: string;
    cloudName: string;
  };

  if (!cloudId || !cloudName) {
    return NextResponse.json({ error: "Missing cloudId or cloudName" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const pendingRaw = cookieStore.get("jira_pending_tokens")?.value;
  if (!pendingRaw) {
    return NextResponse.json({ error: "No pending tokens. Please restart the Jira connection flow." }, { status: 400 });
  }

  const pending = JSON.parse(pendingRaw) as {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };

  await db.jiraConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
      expiresAt: new Date(pending.expiresAt),
      cloudId,
      cloudName,
    },
    update: {
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
      expiresAt: new Date(pending.expiresAt),
      cloudId,
      cloudName,
    },
  });

  cookieStore.delete("jira_pending_tokens");

  return NextResponse.json({ success: true });
}
