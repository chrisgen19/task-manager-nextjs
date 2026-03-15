import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchJiraIssues, type JiraIssue } from "@/lib/jira";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const project = searchParams.get("project") || "";
  const status = searchParams.get("status") || "";
  const startAt = parseInt(searchParams.get("startAt") || "0", 10);
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "50", 10), 100);

  // Build JQL
  const jqlParts: string[] = ["assignee = currentUser()"];
  if (search) jqlParts.push(`text ~ "${search.replace(/"/g, '\\"')}"`);
  if (project) jqlParts.push(`project = "${project.replace(/"/g, '\\"')}"`);
  if (status === "todo") jqlParts.push("statusCategory = \"To Do\"");
  else if (status === "inprogress") jqlParts.push("statusCategory = \"In Progress\"");
  else if (status === "done") jqlParts.push("statusCategory = Done");
  jqlParts.push("ORDER BY updated DESC");

  try {
    const result = await fetchJiraIssues(session.user.id, {
      jql: jqlParts.join(" AND ").replace(" AND ORDER", " ORDER"),
      startAt,
      maxResults,
    });

    // Batch lookup already-synced issues
    const jiraIds = result.issues.map((i: JiraIssue) => i.id);
    const syncedTasks = await db.task.findMany({
      where: { userId: session.user.id, jiraIssueId: { in: jiraIds } },
      select: { jiraIssueId: true, id: true },
    });
    const syncedMap = new Map(syncedTasks.map((t) => [t.jiraIssueId, t.id]));

    const issues = result.issues.map((issue: JiraIssue) => ({
      ...issue,
      alreadySynced: syncedMap.has(issue.id),
      localTaskId: syncedMap.get(issue.id) || null,
    }));

    return NextResponse.json({
      issues,
      total: result.total,
      startAt: result.startAt,
      maxResults: result.maxResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Jira issues";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
