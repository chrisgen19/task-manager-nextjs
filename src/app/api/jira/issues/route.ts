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
  const assignee = searchParams.get("assignee") || "me";
  const statusParam = searchParams.get("status") || "";
  const statuses = statusParam ? statusParam.split(",") : [];
  const nextPageToken = searchParams.get("nextPageToken") || undefined;
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "50", 10), 100);

  const STATUS_JQL: Record<string, string> = {
    todo: '"To Do"',
    inprogress: '"In Progress"',
    done: "Done",
  };

  // Build JQL
  const jqlParts: string[] = [];
  if (assignee === "me") jqlParts.push("assignee = currentUser()");
  else if (assignee === "unassigned") jqlParts.push("assignee is EMPTY");
  if (search) jqlParts.push(`text ~ "${search.replace(/"/g, '\\"')}"`);
  if (project) jqlParts.push(`project = "${project.replace(/"/g, '\\"')}"`);
  if (statuses.length === 1 && STATUS_JQL[statuses[0]]) {
    jqlParts.push(`statusCategory = ${STATUS_JQL[statuses[0]]}`);
  } else if (statuses.length > 1) {
    const cats = statuses.map((s) => STATUS_JQL[s]).filter(Boolean);
    if (cats.length > 0) jqlParts.push(`statusCategory IN (${cats.join(", ")})`);
  }
  jqlParts.push("ORDER BY updated DESC");

  try {
    const result = await fetchJiraIssues(session.user.id, {
      jql: jqlParts.join(" AND ").replace(" AND ORDER", " ORDER"),
      nextPageToken,
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
      nextPageToken: result.nextPageToken ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Jira issues";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
