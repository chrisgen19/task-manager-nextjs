import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskManager } from "@/components/task-manager";
import type { Task, Workboard } from "@/types";
import type { Task as PrismaTask, Workboard as PrismaWorkboard } from "@/generated/prisma/client";

export default async function DashboardPage() {
  const session = await auth();

  const [rawTasks, rawWorkboards] = await Promise.all([
    db.task.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
      include: { workboard: { select: { key: true, name: true } } },
    }),
    db.workboard.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const tasks: Task[] = rawTasks.map((t: PrismaTask & { workboard: { key: string; name: string } }) => ({
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
    userId: t.userId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

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
    <TaskManager
      initialTasks={tasks}
      initialWorkboards={workboards}
      userName={session!.user.name ?? "User"}
    />
  );
}
