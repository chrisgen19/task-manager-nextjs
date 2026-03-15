import { STATUSES, PRIORITIES } from "@/types";

interface ChangeEntry {
  action: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface TaskFields {
  status: number;
  priority: number;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  jiraUrl: string | null;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "None";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function detectChanges(
  existing: TaskFields,
  updates: Partial<TaskFields>,
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];

  if (updates.status !== undefined && updates.status !== existing.status) {
    changes.push({
      action: "status_changed",
      field: "status",
      oldValue: STATUSES[existing.status as number] ?? String(existing.status),
      newValue: STATUSES[updates.status as number] ?? String(updates.status),
    });
  }

  if (updates.priority !== undefined && updates.priority !== existing.priority) {
    changes.push({
      action: "priority_changed",
      field: "priority",
      oldValue: PRIORITIES[existing.priority as number] ?? String(existing.priority),
      newValue: PRIORITIES[updates.priority as number] ?? String(updates.priority),
    });
  }

  if (updates.title !== undefined && updates.title !== existing.title) {
    changes.push({
      action: "title_changed",
      field: "title",
      oldValue: existing.title,
      newValue: updates.title,
    });
  }

  if (updates.description !== undefined) {
    const oldDesc = existing.description ?? "";
    const newDesc = updates.description ?? "";
    if (oldDesc !== newDesc) {
      changes.push({
        action: "description_changed",
        field: "description",
        oldValue: "(updated)",
        newValue: "(updated)",
      });
    }
  }

  if (updates.dueDate !== undefined) {
    const oldDate = existing.dueDate ? formatDate(existing.dueDate) : "None";
    const newDate = updates.dueDate ? formatDate(updates.dueDate) : "None";
    if (oldDate !== newDate) {
      changes.push({
        action: "due_date_changed",
        field: "dueDate",
        oldValue: oldDate,
        newValue: newDate,
      });
    }
  }

  if (updates.jiraUrl !== undefined) {
    const oldUrl = existing.jiraUrl || "None";
    const newUrl = (updates.jiraUrl as string) || "None";
    if (oldUrl !== newUrl) {
      changes.push({
        action: "jira_url_changed",
        field: "jiraUrl",
        oldValue: oldUrl,
        newValue: newUrl,
      });
    }
  }

  return changes;
}
