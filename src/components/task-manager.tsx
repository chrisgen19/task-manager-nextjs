"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { formatTaskKey } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TaskModal } from "./task-modal";
import { ListView } from "./views/list-view";
import { KanbanView } from "./views/kanban-view";
import { CalendarView } from "./views/calendar-view";
import { TimelineView } from "./views/timeline-view";
import { ToastContainer, type Toast } from "./ui/toast";
import type { Task, Workboard, ViewType, TaskFilters, TaskSort } from "@/types";
import type { TaskInput } from "@/schemas";

interface TaskManagerProps {
  initialTasks: Task[];
  initialWorkboards: Workboard[];
  initialShowSubtasks: boolean;
  userName: string;
}

interface ModalState {
  open: boolean;
  defaultStatus?: number;
  defaultDueDate?: string;
  defaultWorkboardId?: string;
}

function applyFiltersAndSort(tasks: Task[], filters: TaskFilters, sort: TaskSort): Task[] {
  let result = [...tasks];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }
  if (filters.workboardId) result = result.filter((t) => t.workboardId === filters.workboardId);
  if (filters.priority >= 0) result = result.filter((t) => t.priority === filters.priority);
  if (filters.status >= 0) result = result.filter((t) => t.status === filters.status);

  result.sort((a, b) => {
    const dir = sort.direction === "asc" ? 1 : -1;
    const field = sort.field === "created" ? "createdAt" : sort.field;
    const va = a[field as keyof Task];
    const vb = b[field as keyof Task];

    if (field === "dueDate") {
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
    }

    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb) * dir;
    }
    return (((va as number) ?? 0) - ((vb as number) ?? 0)) * dir;
  });

  return result;
}

function makeToastId() {
  return Math.random().toString(36).slice(2);
}


function normalizeTask(raw: Task & { workboard?: { key: string; name: string }; parent?: { taskNumber: number } | null; _count?: { subtasks: number } }): Task {
  return {
    ...raw,
    workboardKey: raw.workboard?.key ?? raw.workboardKey ?? "",
    workboardName: raw.workboard?.name ?? raw.workboardName ?? "",
    dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
    parentId: raw.parentId ?? null,
    subtaskNumber: raw.subtaskNumber ?? null,
    sortOrder: raw.sortOrder ?? 0,
    parentTaskNumber: raw.parent?.taskNumber ?? raw.parentTaskNumber ?? null,
    subtaskCount: raw._count?.subtasks ?? raw.subtaskCount ?? 0,
    subtasksDone: raw.subtasksDone ?? 0,
  };
}

export function TaskManager({ initialTasks, initialWorkboards, initialShowSubtasks, userName }: TaskManagerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [workboards, setWorkboards] = useState<Workboard[]>(initialWorkboards);
  const [view, setView] = useState<ViewType>("list");
  const [filters, setFilters] = useState<TaskFilters>({ search: "", priority: -1, status: -1, workboardId: null });
  const [sort, setSort] = useState<TaskSort>({ field: "created", direction: "desc" });
  const [showSort, setShowSort] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSubtasks, setShowSubtasks] = useState(initialShowSubtasks);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  // Clear selection when filters, view, or subtask visibility change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, view, showSubtasks]);

  // Compute subtasksDone for parent tasks
  const tasksWithSubtasksDone = useMemo(() => {
    const doneByParent = new Map<string, number>();
    for (const t of tasks) {
      if (t.parentId && t.status === 4) {
        doneByParent.set(t.parentId, (doneByParent.get(t.parentId) ?? 0) + 1);
      }
    }
    return tasks.map((t) =>
      t.subtaskCount > 0 ? { ...t, subtasksDone: doneByParent.get(t.id) ?? 0 } : t
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (showSubtasks) return tasksWithSubtasksDone;
    return tasksWithSubtasksDone.filter((t) => !t.parentId);
  }, [tasksWithSubtasksDone, showSubtasks]);

  const filteredTasks = useMemo(
    () => applyFiltersAndSort(visibleTasks, filters, sort),
    [visibleTasks, filters, sort]
  );

  // Prune selected IDs that no longer exist in the visible task list
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(filteredTasks.map((t) => t.id));
      const pruned = new Set([...prev].filter((id) => visibleIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [filteredTasks]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Keyboard shortcut: N = new task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "n" &&
        !modal.open &&
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !target.isContentEditable
      ) {
        setModal({ open: true });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal.open]);

  const openNewTask = useCallback(
    (opts?: { status?: number; dueDate?: string }) => {
      setModal({
        open: true,
        defaultStatus: opts?.status,
        defaultDueDate: opts?.dueDate,
        defaultWorkboardId: filters.workboardId ?? workboards[0]?.id,
      });
    },
    [filters.workboardId, workboards]
  );

  const navigateToTask = useCallback((task: Task) => {
    router.push(`/t/${formatTaskKey(task)}`);
  }, [router]);

  const closeModal = useCallback(() => {
    setModal({ open: false });
  }, []);

  const handleSave = useCallback(
    async (data: TaskInput) => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          addToast(body.error ?? "Failed to create task. Please try again.", "error");
          return;
        }

        const saved = await res.json();
        const normalized = normalizeTask(saved);
        setTasks((prev) => [normalized, ...prev]);

        // Update workboard taskCounter in local state
        setWorkboards((prev) =>
          prev.map((w) =>
            w.id === data.workboardId ? { ...w, taskCounter: w.taskCounter + 1 } : w
          )
        );

        addToast("Task created.", "success");
        closeModal();

        // Navigate to the new task page
        router.push(`/t/${formatTaskKey(normalized)}`);
      } catch {
        addToast("Network error. Please check your connection.", "error");
      }
    },
    [closeModal, addToast, router]
  );

  const toggleShowSubtasks = useCallback(() => {
    const next = !showSubtasks;
    setShowSubtasks(next);
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSubtasks: next }),
    }).catch(() => {
      setShowSubtasks(!next);
      addToast("Failed to save preference", "error");
    });
  }, [showSubtasks, addToast]);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Warn when moving parent task to Done with open subtasks
      if (newStatus === 4 && task.subtaskCount > 0) {
        const openSubtasks = tasks.filter((t) => t.parentId === taskId && t.status !== 4);
        if (openSubtasks.length > 0) {
          if (!confirm(`This task has ${openSubtasks.length} open subtask(s). Mark as Done anyway?`)) {
            return;
          }
        }
      }

      const prevStatus = task.status;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t))
      );

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            jiraUrl: task.jiraUrl,
            priority: task.priority,
            status: newStatus,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null,
            workboardId: task.workboardId,
          }),
        });

        if (!res.ok) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
          );
          addToast("Failed to update task status.", "error");
        }
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
        );
        addToast("Network error. Status change reverted.", "error");
      }
    },
    [tasks, addToast]
  );

  const handleWorkboardCreate = useCallback((workboard: Workboard) => {
    setWorkboards((prev) => [...prev, workboard]);
  }, []);

  const handleWorkboardUpdate = useCallback((workboard: Workboard) => {
    setWorkboards((prev) => prev.map((w) => (w.id === workboard.id ? workboard : w)));
  }, []);

  const handleWorkboardDelete = useCallback((workboardId: string) => {
    setWorkboards((prev) => prev.filter((w) => w.id !== workboardId));
    setTasks((prev) => prev.filter((t) => t.workboardId !== workboardId));
    if (filters.workboardId === workboardId) {
      setFilters((prev) => ({ ...prev, workboardId: null }));
    }
  }, [filters.workboardId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || deletingRef.current) return;
    if (!confirm(`Delete ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    deletingRef.current = true;
    setDeleting(true);

    try {
      const res = await fetch("/api/tasks/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error ?? "Failed to delete tasks.", "error");
        return;
      }

      const data = await res.json();
      // Remove deleted tasks and any subtasks whose parent was deleted, then recompute parent subtaskCounts
      setTasks((prev) => {
        const remaining = prev.filter((t) => !selectedIds.has(t.id) && (!t.parentId || !selectedIds.has(t.parentId)));
        // Count surviving subtasks per parent
        const subtaskCounts = new Map<string, number>();
        for (const t of remaining) {
          if (t.parentId) {
            subtaskCounts.set(t.parentId, (subtaskCounts.get(t.parentId) ?? 0) + 1);
          }
        }
        return remaining.map((t) =>
          t.subtaskCount > 0 || subtaskCounts.has(t.id)
            ? { ...t, subtaskCount: subtaskCounts.get(t.id) ?? 0 }
            : t
        );
      });
      setSelectedIds(new Set());
      addToast(`${data.deleted} task${data.deleted !== 1 ? "s" : ""} deleted.`, "success");
    } catch {
      addToast("Network error. Please try again.", "error");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [selectedIds, addToast]);

  return (
    <>
      <Sidebar
        tasks={visibleTasks}
        workboards={workboards}
        filters={filters}
        onFiltersChange={setFilters}
        onWorkboardCreate={handleWorkboardCreate}
        onWorkboardUpdate={handleWorkboardUpdate}
        onWorkboardDelete={handleWorkboardDelete}
        userName={userName}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          currentView={view}
          onViewChange={setView}
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onNewTask={() => openNewTask()}
          showSort={showSort}
          onToggleSort={() => setShowSort((v) => !v)}
          showSubtasks={showSubtasks}
          onToggleSubtasks={toggleShowSubtasks}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {selectedIds.size > 0 && (
            <div
              className="flex items-center gap-3 px-4 py-2 text-sm shrink-0"
              style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-primary)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{ background: "var(--priority-critical)", color: "#fff", opacity: deleting ? 0.6 : 1 }}
              >
                <Trash2 size={13} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X size={13} />
                Clear
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
          {view === "list" && (
            <ListView
              tasks={filteredTasks}
              sort={sort}
              onSortChange={setSort}
              onNavigate={navigateToTask}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
          {view === "kanban" && (
            <KanbanView
              tasks={filteredTasks}
              onNavigate={navigateToTask}
              onNewTask={(status) => openNewTask({ status })}
              onStatusChange={handleStatusChange}
            />
          )}
          {view === "calendar" && (
            <CalendarView
              tasks={filteredTasks}
              onNavigate={navigateToTask}
              onNewTask={(dueDate) => openNewTask({ dueDate })}
            />
          )}
          {view === "timeline" && (
            <TimelineView tasks={filteredTasks} onNavigate={navigateToTask} />
          )}
          </div>
        </main>
      </div>

      {modal.open && (
        <TaskModal
          workboards={workboards}
          defaultStatus={modal.defaultStatus}
          defaultDueDate={modal.defaultDueDate}
          defaultWorkboardId={modal.defaultWorkboardId}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
