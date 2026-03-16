import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskDetail } from "@/components/task-detail";
import { WorkboardNavSidebar } from "@/components/workboard-nav-sidebar";
import type { Task, Workboard } from "@/types";
import type { Workboard as PrismaWorkboard } from "@/generated/prisma/client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TaskDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  // Parse slug: PROJ-123 or PROJ-123.1 (subtask)
  const match = slug.match(/^([A-Z]+)-(\d+)(?:\.(\d+))?$/);
  if (!match) notFound();

  const [, key, numStr, subtaskNumStr] = match;
  const taskNumber = parseInt(numStr, 10);

  const [workboard, rawWorkboards] = await Promise.all([
    db.workboard.findUnique({
      where: { userId_key: { userId: session!.user.id, key } },
    }),
    db.workboard.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!workboard) notFound();

  const taskInclude = {
    workboard: { select: { key: true, name: true } },
    parent: { select: { taskNumber: true } },
    _count: { select: { subtasks: true } },
    subtasks: {
      orderBy: { sortOrder: "asc" as const },
      include: {
        workboard: { select: { key: true, name: true } },
        parent: { select: { taskNumber: true } },
        _count: { select: { subtasks: true } },
      },
    },
  };

  // Plain slugs resolve standalone tasks only.
  let rawTask = await db.task.findFirst({
    where: { workboardId: workboard.id, taskNumber, parentId: null },
    include: taskInclude,
  });

  if (subtaskNumStr) {
    // If subtask slug, use parent to find the subtask
    if (!rawTask) notFound();

    rawTask = await db.task.findUnique({
      where: { parentId_subtaskNumber: { parentId: rawTask.id, subtaskNumber: parseInt(subtaskNumStr, 10) } },
      include: taskInclude,
    });
  }

  if (!rawTask) notFound();

  type RawTask = NonNullable<typeof rawTask>;

  function normalizeRawTask(t: RawTask): Task {
    return {
      id: t.id,
      taskNumber: t.taskNumber,
      workboardId: t.workboardId,
      workboardKey: t.workboard.key,
      workboardName: t.workboard.name,
      title: t.title,
      description: t.description ?? "",
      jiraUrl: t.jiraUrl ?? "",
      priority: t.priority as Task["priority"],
      status: t.status as Task["status"],
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      parentId: t.parentId,
      subtaskNumber: t.subtaskNumber,
      sortOrder: t.sortOrder,
      parentTaskNumber: t.parent?.taskNumber ?? null,
      subtaskCount: t._count.subtasks,
      subtasksDone: 0,
      jiraIssueId: t.jiraIssueId,
      jiraIssueKey: t.jiraIssueKey,
      jiraSyncedAt: t.jiraSyncedAt ? t.jiraSyncedAt.toISOString() : null,
      userId: t.userId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  const task: Task = normalizeRawTask(rawTask);

  const subtasks: Task[] = (rawTask.subtasks ?? []).map((s) => ({
    id: s.id,
    taskNumber: s.taskNumber,
    workboardId: s.workboardId,
    workboardKey: s.workboard.key,
    workboardName: s.workboard.name,
    title: s.title,
    description: s.description ?? "",
    jiraUrl: s.jiraUrl ?? "",
    priority: s.priority as Task["priority"],
    status: s.status as Task["status"],
    dueDate: s.dueDate ? s.dueDate.toISOString() : null,
    parentId: s.parentId,
    subtaskNumber: s.subtaskNumber,
    sortOrder: s.sortOrder,
    parentTaskNumber: s.parent?.taskNumber ?? null,
    subtaskCount: s._count.subtasks,
    subtasksDone: 0,
    jiraIssueId: s.jiraIssueId,
    jiraIssueKey: s.jiraIssueKey,
    jiraSyncedAt: s.jiraSyncedAt ? s.jiraSyncedAt.toISOString() : null,
    userId: s.userId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  task.subtasksDone = subtasks.filter((s) => s.status === 4).length;

  const workboards: Workboard[] = rawWorkboards.map((w: PrismaWorkboard) => ({
    id: w.id,
    name: w.name,
    key: w.key,
    description: w.description,
    taskCounter: w.taskCounter,
    userId: w.userId,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return (
    <>
      <WorkboardNavSidebar
        workboards={workboards}
        activeWorkboardId={task.workboardId}
        userName={session!.user.name ?? "User"}
      />
      <TaskDetail key={slug} task={task} subtasks={subtasks} />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} — Task Manager Pro` };
}
