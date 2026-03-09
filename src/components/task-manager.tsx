"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TaskModal } from "./task-modal";
import { ListView } from "./views/list-view";
import { KanbanView } from "./views/kanban-view";
import { CalendarView } from "./views/calendar-view";
import { TimelineView } from "./views/timeline-view";
import { ToastContainer, type Toast } from "./ui/toast";
import type { Task, ViewType, TaskFilters, TaskSort } from "@/types";
import type { TaskInput } from "@/schemas";

interface TaskManagerProps {
  initialTasks: Task[];
  userName: string;
}

interface ModalState {
  open: boolean;
  task?: Task | null;
  defaultStatus?: number;
  defaultDueDate?: string;
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
  if (filters.priority >= 0) result = result.filter((t) => t.priority === filters.priority);
  if (filters.status >= 0) result = result.filter((t) => t.status === filters.status);

  result.sort((a, b) => {
    const dir = sort.direction === "asc" ? 1 : -1;
    // "created" maps to the actual Task field "createdAt"
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

function normalizeTask(raw: Task): Task {
  return {
    ...raw,
    dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
  };
}

export function TaskManager({ initialTasks, userName }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<ViewType>("list");
  const [filters, setFilters] = useState<TaskFilters>({ search: "", priority: -1, status: -1 });
  const [sort, setSort] = useState<TaskSort>({ field: "created", direction: "desc" });
  const [showSort, setShowSort] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const filteredTasks = useMemo(
    () => applyFiltersAndSort(tasks, filters, sort),
    [tasks, filters, sort]
  );

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
      setModal({ open: true, task: null, defaultStatus: opts?.status, defaultDueDate: opts?.dueDate });
    },
    []
  );

  const openEditTask = useCallback((task: Task) => {
    setModal({ open: true, task });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false });
  }, []);

  const handleSave = useCallback(
    async (data: TaskInput) => {
      const isEditing = !!modal.task;
      const url = isEditing ? `/api/tasks/${modal.task!.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          addToast(body.error ?? "Failed to save task. Please try again.", "error");
          return;
        }

        const saved: Task = await res.json();
        const normalized = normalizeTask(saved);

        if (isEditing) {
          setTasks((prev) => prev.map((t) => (t.id === normalized.id ? normalized : t)));
          addToast("Task updated.", "success");
        } else {
          setTasks((prev) => [normalized, ...prev]);
          addToast("Task created.", "success");
        }
        closeModal();
      } catch {
        addToast("Network error. Please check your connection.", "error");
      }
    },
    [modal.task, closeModal, addToast]
  );

  const handleDelete = useCallback(async () => {
    if (!modal.task) return;
    const taskTitle = modal.task.title;

    try {
      const res = await fetch(`/api/tasks/${modal.task.id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        addToast(body.error ?? "Failed to delete task.", "error");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== modal.task!.id));
      closeModal();
      addToast(`"${taskTitle}" deleted.`, "success");
    } catch {
      addToast("Network error. Please check your connection.", "error");
    }
  }, [modal.task, closeModal, addToast]);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const prevStatus = task.status;

      // Optimistic update
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
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().split("T")[0]
              : null,
          }),
        });

        if (!res.ok) {
          // Revert optimistic update
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
          );
          addToast("Failed to update task status.", "error");
        }
      } catch {
        // Revert on network error
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
        );
        addToast("Network error. Status change reverted.", "error");
      }
    },
    [tasks, addToast]
  );

  return (
    <>
      <Sidebar
        tasks={tasks}
        filters={filters}
        onFiltersChange={setFilters}
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
        />

        <main className="flex-1 overflow-hidden">
          {view === "list" && (
            <ListView
              tasks={filteredTasks}
              sort={sort}
              onSortChange={setSort}
              onEdit={openEditTask}
            />
          )}
          {view === "kanban" && (
            <KanbanView
              tasks={filteredTasks}
              onEdit={openEditTask}
              onNewTask={(status) => openNewTask({ status })}
              onStatusChange={handleStatusChange}
            />
          )}
          {view === "calendar" && (
            <CalendarView
              tasks={filteredTasks}
              onEdit={openEditTask}
              onNewTask={(dueDate) => openNewTask({ dueDate })}
            />
          )}
          {view === "timeline" && (
            <TimelineView tasks={filteredTasks} onEdit={openEditTask} />
          )}
        </main>
      </div>

      {modal.open && (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.defaultStatus}
          defaultDueDate={modal.defaultDueDate}
          onSave={handleSave}
          onDelete={modal.task ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
