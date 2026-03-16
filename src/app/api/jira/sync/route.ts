import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jiraSyncSchema } from "@/schemas";
import { fetchJiraIssues, mapJiraIssueToTask, type JiraIssue } from "@/lib/jira";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = jiraSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workboardId, issueIds } = parsed.data;

  // Verify workboard ownership
  const workboard = await db.workboard.findFirst({
    where: { id: workboardId, userId: session.user.id },
  });
  if (!workboard) {
    return NextResponse.json({ error: "Workboard not found" }, { status: 404 });
  }

  // Get Jira connection for cloudName
  const connection = await db.jiraConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json({ error: "No Jira connection" }, { status: 400 });
  }

  // Fetch issues from Jira by IDs
  const jql = `id in (${issueIds.join(",")})`;
  const result = await fetchJiraIssues(session.user.id, { jql, maxResults: 100 });
  const issueMap = new Map(result.issues.map((i: JiraIssue) => [i.id, i]));

  // Auto-fetch subtasks for selected parent issues
  const selectedIds = new Set(issueIds);
  const parentKeys = result.issues
    .filter((i: JiraIssue) => !i.fields.parent && i.fields.subtasks && i.fields.subtasks.length > 0)
    .map((i: JiraIssue) => i.key);

  let autoImported = 0;

  if (parentKeys.length > 0) {
    const subtaskJql = `parent in (${parentKeys.join(",")})`;
    const subtaskResult = await fetchJiraIssues(session.user.id, {
      jql: subtaskJql,
      maxResults: 100,
    });

    for (const subtask of subtaskResult.issues) {
      if (!selectedIds.has(subtask.id)) {
        selectedIds.add(subtask.id);
        issueMap.set(subtask.id, subtask);
      }
    }
  }

  // Check which issues are already synced (selected + auto-fetched)
  const allIds = Array.from(selectedIds);
  const existingTasks = await db.task.findMany({
    where: { userId: session.user.id, jiraIssueId: { in: allIds } },
    select: { id: true, jiraIssueId: true },
  });
  const existingMap = new Map(existingTasks.map((t) => [t.jiraIssueId, t.id]));

  let created = 0;
  let updated = 0;
  const tasks: Array<{ id: string; jiraIssueKey: string | null }> = [];

  // Use a transaction for batch creation with counter increment
  await db.$transaction(async (tx) => {
    for (const issueId of allIds) {
      const issue = issueMap.get(issueId);
      if (!issue) continue;

      const isAutoImported = !issueIds.includes(issueId);

      const mapped = mapJiraIssueToTask(issue, connection.cloudName);
      const existingId = existingMap.get(issueId);

      if (existingId) {
        // Re-sync: update existing task
        const task = await tx.task.update({
          where: { id: existingId },
          data: {
            title: mapped.title,
            description: mapped.description,
            priority: mapped.priority,
            status: mapped.status,
            dueDate: mapped.dueDate ? new Date(mapped.dueDate) : null,
            jiraUrl: mapped.jiraUrl,
            jiraSyncedAt: new Date(),
          },
          select: { id: true, jiraIssueKey: true },
        });
        tasks.push(task);
        updated++;
        if (isAutoImported) autoImported++;
      } else {
        // New: create task and increment workboard counter
        const board = await tx.workboard.update({
          where: { id: workboardId },
          data: { taskCounter: { increment: 1 } },
          select: { taskCounter: true },
        });

        const task = await tx.task.create({
          data: {
            taskNumber: board.taskCounter,
            title: mapped.title,
            description: mapped.description,
            priority: mapped.priority,
            status: mapped.status,
            dueDate: mapped.dueDate ? new Date(mapped.dueDate) : null,
            jiraUrl: mapped.jiraUrl,
            jiraIssueId: mapped.jiraIssueId,
            jiraIssueKey: mapped.jiraIssueKey,
            jiraSyncedAt: new Date(),
            userId: session.user.id,
            workboardId,
          },
          select: { id: true, jiraIssueKey: true },
        });
        tasks.push(task);
        created++;
        if (isAutoImported) autoImported++;
      }
    }
  });

  return NextResponse.json({ created, updated, autoImported, tasks });
}
