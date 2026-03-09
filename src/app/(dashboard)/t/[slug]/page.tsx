import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskDetail } from "@/components/task-detail";
import { WorkboardNavSidebar } from "@/components/workboard-nav-sidebar";
import type { Task, Workboard } from "@/types";
import type { Task as PrismaTask, Workboard as PrismaWorkboard } from "@/generated/prisma/client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TaskDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  // Parse slug: PROJ-123
  const match = slug.match(/^([A-Z]+)-(\d+)$/);
  if (!match) notFound();

  const [, key, numStr] = match;
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

  const rawTask = await db.task.findUnique({
    where: { workboardId_taskNumber: { workboardId: workboard.id, taskNumber } },
    include: { workboard: { select: { key: true, name: true } } },
  });

  if (!rawTask) notFound();

  const task: Task = {
    id: rawTask.id,
    taskNumber: rawTask.taskNumber,
    workboardId: rawTask.workboardId,
    workboardKey: rawTask.workboard.key,
    workboardName: rawTask.workboard.name,
    title: rawTask.title,
    description: rawTask.description ?? "",
    jiraUrl: rawTask.jiraUrl ?? "",
    priority: rawTask.priority as Task["priority"],
    status: rawTask.status as Task["status"],
    dueDate: rawTask.dueDate ? rawTask.dueDate.toISOString() : null,
    userId: rawTask.userId,
    createdAt: rawTask.createdAt.toISOString(),
    updatedAt: rawTask.updatedAt.toISOString(),
  };

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
      <TaskDetail task={task} />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} — Task Manager Pro` };
}
