import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { encryptToken } from "@/lib/jira-crypto";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  // Validate state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("jira_oauth_state")?.value;
  cookieStore.delete("jira_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch accessible resources to get cloudId
  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } },
  );

  if (!resourcesRes.ok) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  const resources = (await resourcesRes.json()) as Array<{
    id: string;
    name: string;
    url: string;
  }>;

  if (resources.length === 0) {
    return NextResponse.redirect(new URL("/settings?jira=error", request.url));
  }

  const encryptedAccess = encryptToken(tokens.access_token);
  const encryptedRefresh = encryptToken(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  if (resources.length === 1) {
    // Single site — connect immediately
    const site = resources[0];
    const cloudName = new URL(site.url).hostname;

    // Clear stale Jira metadata if switching to a different site
    const existing = await db.jiraConnection.findUnique({ where: { userId: session.user.id } });
    if (existing && existing.cloudId !== site.id) {
      await db.task.updateMany({
        where: { userId: session.user.id, jiraIssueId: { not: null } },
        data: { jiraIssueId: null, jiraIssueKey: null, jiraSyncedAt: null },
      });
    }

    await db.jiraConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt,
        cloudId: site.id,
        cloudName,
      },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt,
        cloudId: site.id,
        cloudName,
      },
    });

    return NextResponse.redirect(new URL("/settings?jira=connected", request.url));
  }

  // Multiple sites — store tokens temporarily, let user pick
  const sitesPayload = resources.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
  }));

  cookieStore.set("jira_pending_tokens", JSON.stringify({
    accessToken: encryptedAccess,
    refreshToken: encryptedRefresh,
    expiresAt: expiresAt.toISOString(),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const sitesParam = encodeURIComponent(JSON.stringify(sitesPayload));
  return NextResponse.redirect(
    new URL(`/settings?jira=select-site&sites=${sitesParam}`, request.url),
  );
}
