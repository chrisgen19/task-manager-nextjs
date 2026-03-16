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

  const { workboardId, issueIds, includeChildren } = parsed.data;

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

  // Auto-fetch children for parent issues and epics (opt-in)
  const selectedIds = new Set(issueIds);
  let autoImported = 0;

  if (includeChildren) {
    // Collect keys of issues that have subtasks OR are Epics
    const parentKeys = result.issues
      .filter((i: JiraIssue) => {
        const hasSubtasks = !i.fields.parent && i.fields.subtasks && i.fields.subtasks.length > 0;
        const isEpic = i.fields.issuetype?.name?.toLowerCase() === "epic";
        return hasSubtasks || isEpic;
      })
      .map((i: JiraIssue) => i.key);

    if (parentKeys.length > 0) {
      const childrenJql = `parent in (${parentKeys.join(",")})`;
      const childrenResult = await fetchJiraIssues(session.user.id, {
        jql: childrenJql,
        maxResults: 100,
      });

      for (const child of childrenResult.issues) {
        if (!selectedIds.has(child.id)) {
          selectedIds.add(child.id);
          issueMap.set(child.id, child);
        }
      }
    }
  }

  // Build parent-child relationships from Jira data
  const allIds = Array.from(selectedIds);
  const jiraParentOf = new Map<string, string>(); // childJiraId → parentJiraId
  for (const [id, issue] of issueMap) {
    if (issue.fields.parent) {
      jiraParentOf.set(id, issue.fields.parent.id);
    }
  }

  // Pre-lookup local IDs for Jira parents not in current batch (previously synced)
  const externalParentJiraIds = [...new Set(
    [...jiraParentOf.values()].filter((pid) => !selectedIds.has(pid)),
  )];
  const preSyncedParents = externalParentJiraIds.length > 0
    ? await db.task.findMany({
        where: {
          userId: session.user.id,
          jiraIssueId: { in: externalParentJiraIds },
          parentId: null, // only top-level tasks can be parents
        },
        select: { id: true, jiraIssueId: true },
      })
    : [];

  // Seed jiraIssueId → local task ID map with pre-synced parents
  const jiraToLocalId = new Map<string, string>();
  for (const t of preSyncedParents) {
    if (t.jiraIssueId) jiraToLocalId.set(t.jiraIssueId, t.id);
  }

  // Sort: parents first, then children (so parent local IDs are available)
  const parentIssueIds = allIds.filter((id) => !jiraParentOf.has(id));
  const childIssueIds = allIds.filter((id) => jiraParentOf.has(id));
  const sortedIds = [...parentIssueIds, ...childIssueIds];

  // Check which issues are already synced
  const existingTasks = await db.task.findMany({
    where: { userId: session.user.id, jiraIssueId: { in: allIds } },
    select: { id: true, jiraIssueId: true, parentId: true },
  });
  const existingMap = new Map(existingTasks.map((t) => [t.jiraIssueId, { id: t.id, parentId: t.parentId }]));

  let created = 0;
  let updated = 0;
  const tasks: Array<{ id: string; jiraIssueKey: string | null }> = [];

  await db.$transaction(async (tx) => {
    for (const issueId of sortedIds) {
      const issue = issueMap.get(issueId);
      if (!issue) continue;

      const isAutoImported = !issueIds.includes(issueId);
      const mapped = mapJiraIssueToTask(issue, connection.cloudName);
      const existing = existingMap.get(issueId);
      const parentJiraId = jiraParentOf.get(issueId);
      const parentLocalId = parentJiraId ? jiraToLocalId.get(parentJiraId) : undefined;

      if (existing) {
        // Re-sync: update fields
        const updateData: Record<string, unknown> = {
          title: mapped.title,
          description: mapped.description,
          priority: mapped.priority,
          status: mapped.status,
          dueDate: mapped.dueDate ? new Date(mapped.dueDate) : null,
          jiraUrl: mapped.jiraUrl,
          jiraSyncedAt: new Date(),
        };

        // Link to parent if not already linked and parent exists locally
        if (parentLocalId && !existing.parentId) {
          const maxSub = await tx.task.aggregate({
            where: { parentId: parentLocalId },
            _max: { subtaskNumber: true, sortOrder: true },
          });
          updateData.parentId = parentLocalId;
          updateData.subtaskNumber = (maxSub._max.subtaskNumber ?? 0) + 1;
          updateData.sortOrder = (maxSub._max.sortOrder ?? -1) + 1;
        }

        const task = await tx.task.update({
          where: { id: existing.id },
          data: updateData,
          select: { id: true, jiraIssueKey: true },
        });
        tasks.push(task);
        updated++;
        if (isAutoImported) autoImported++;
        jiraToLocalId.set(issueId, existing.id);
      } else {
        // New task — increment workboard counter
        const board = await tx.workboard.update({
          where: { id: workboardId },
          data: { taskCounter: { increment: 1 } },
          select: { taskCounter: true },
        });

        const createData: Record<string, unknown> = {
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
        };

        // Link to parent if parent exists locally
        if (parentLocalId) {
          const maxSub = await tx.task.aggregate({
            where: { parentId: parentLocalId },
            _max: { subtaskNumber: true, sortOrder: true },
          });
          createData.parentId = parentLocalId;
          createData.subtaskNumber = (maxSub._max.subtaskNumber ?? 0) + 1;
          createData.sortOrder = (maxSub._max.sortOrder ?? -1) + 1;
        }

        const task = await tx.task.create({
          data: createData as Parameters<typeof tx.task.create>[0]["data"],
          select: { id: true, jiraIssueKey: true },
        });
        tasks.push(task);
        created++;
        if (isAutoImported) autoImported++;
        jiraToLocalId.set(issueId, task.id);
      }
    }
  });

  return NextResponse.json({ created, updated, autoImported, tasks });
}
