import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskManager } from "@/components/task-manager";
import type { Task } from "@/types";
import type { Task as PrismaTask } from "@/generated/prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  const rawTasks = await db.task.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  const tasks: Task[] = rawTasks.map((t: PrismaTask) => ({
    id: t.id,
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

  return <TaskManager initialTasks={tasks} userName={session!.user.name ?? "User"} />;
}
