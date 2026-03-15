export type Priority = 0 | 1 | 2 | 3;
export type Status = 0 | 1 | 2 | 3 | 4;
export type ViewType = "list" | "kanban" | "calendar" | "timeline";
export type SortField = "created" | "title" | "priority" | "status" | "dueDate";
export type SortDirection = "asc" | "desc";

export interface Workboard {
  id: string;
  name: string;
  key: string;
  description: string | null;
  taskCounter: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  taskNumber: number;
  workboardId: string;
  workboardKey: string;
  workboardName: string;
  title: string;
  description: string;
  jiraUrl: string;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  parentId: string | null;
  subtaskNumber: number | null;
  sortOrder: number;
  parentTaskNumber: number | null;
  subtasks?: Task[];
  subtaskCount: number;
  subtasksDone: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  search: string;
  priority: number;
  status: number;
  workboardId: string | null;
}

export interface TaskSort {
  field: SortField;
  direction: SortDirection;
}

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const STATUSES = ["Backlog", "To Do", "In Progress", "Review", "Done"] as const;

export const PRIORITY_COLORS: Record<number, string> = {
  0: "var(--priority-low)",
  1: "var(--priority-medium)",
  2: "var(--priority-high)",
  3: "var(--priority-critical)",
};

export const STATUS_COLORS: Record<number, string> = {
  0: "var(--status-backlog)",
  1: "var(--status-todo)",
  2: "var(--status-in-progress)",
  3: "var(--status-review)",
  4: "var(--status-done)",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "priority-low",
  1: "priority-medium",
  2: "priority-high",
  3: "priority-critical",
};

export const STATUS_LABELS: Record<number, string> = {
  0: "status-backlog",
  1: "status-todo",
  2: "status-in-progress",
  3: "status-review",
  4: "status-done",
};
