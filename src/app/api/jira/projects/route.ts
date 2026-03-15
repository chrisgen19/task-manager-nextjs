import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchJiraProjects } from "@/lib/jira";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await fetchJiraProjects(session.user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Jira projects";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
