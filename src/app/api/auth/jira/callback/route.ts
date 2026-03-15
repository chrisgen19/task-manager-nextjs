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

  const site = resources[0];
  // Extract hostname from URL (e.g. "https://mycompany.atlassian.net" → "mycompany.atlassian.net")
  const cloudName = new URL(site.url).hostname;

  // Upsert connection
  await db.jiraConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      cloudId: site.id,
      cloudName,
    },
    update: {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      cloudId: site.id,
      cloudName,
    },
  });

  return NextResponse.redirect(new URL("/settings?jira=connected", request.url));
}
