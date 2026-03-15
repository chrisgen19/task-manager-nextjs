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

  // Check which issues are already synced
  const existingTasks = await db.task.findMany({
    where: { userId: session.user.id, jiraIssueId: { in: issueIds } },
    select: { id: true, jiraIssueId: true },
  });
  const existingMap = new Map(existingTasks.map((t) => [t.jiraIssueId, t.id]));

  let created = 0;
  let updated = 0;
  const tasks: Array<{ id: string; jiraIssueKey: string | null }> = [];

  // Use a transaction for batch creation with counter increment
  await db.$transaction(async (tx) => {
    for (const issueId of issueIds) {
      const issue = issueMap.get(issueId);
      if (!issue) continue;

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
      }
    }
  });

  return NextResponse.json({ created, updated, tasks });
}
