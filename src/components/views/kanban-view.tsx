"use client";

import { useRef, useState } from "react";
import { Plus, CornerDownRight } from "lucide-react";
import { formatTaskKey } from "@/lib/utils";
import { STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/types";
import type { Task } from "@/types";

interface KanbanViewProps {
  tasks: Task[];
  onNavigate: (task: Task) => void;
  onNewTask: (status: number) => void;
  onStatusChange: (taskId: string, newStatus: number) => void;
  showSubtasks: boolean;
  onToggleSubtasks: () => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  0: "var(--priority-low)",
  1: "var(--priority-medium)",
  2: "var(--priority-high)",
  3: "var(--priority-critical)",
};

function KanbanCard({ task, onNavigate, onDragStart }: { task: Task; onNavigate: (t: Task) => void; onDragStart: (e: React.DragEvent, id: string) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onNavigate(task)}
      className="rounded-lg p-3 cursor-pointer group relative overflow-hidden"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border-primary)",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-secondary)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-primary)"; }}
    >
      {/* Priority accent */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg" style={{ background: PRIORITY_COLORS[task.priority] }} />
      <p className="text-xs font-mono mb-0.5 pl-2 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
        {task.parentId && <CornerDownRight size={10} />}
        {formatTaskKey(task)}
      </p>
      <p className="text-sm font-medium mb-1.5 pl-2" style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{task.title}</p>
      <div className="flex items-center gap-2 pl-2">
        {task.subtaskCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
            {task.subtasksDone}/{task.subtaskCount}
          </span>
        )}
        {task.dueDate && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

export function KanbanView({ tasks, onNavigate, onNewTask, onStatusChange, showSubtasks, onToggleSubtasks }: KanbanViewProps) {
  const draggedId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, statusIdx: number) => {
    e.preventDefault();
    setDragOver(null);
    if (draggedId.current) {
      onStatusChange(draggedId.current, statusIdx);
      draggedId.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-5 pt-3 pb-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={showSubtasks}
            onChange={onToggleSubtasks}
            className="rounded"
          />
          Show subtasks
        </label>
      </div>
    <div className="flex gap-4 flex-1 overflow-x-auto px-5 pb-4">
      {STATUSES.map((statusName, statusIdx) => {
        const colTasks = tasks.filter((t) => t.status === statusIdx);
        const isDragOver = dragOver === statusIdx;

        return (
          <div
            key={statusIdx}
            className="flex flex-col shrink-0 rounded-xl overflow-hidden"
            style={{
              width: "280px",
              background: isDragOver ? "var(--bg-hover)" : "var(--bg-secondary)",
              border: `1px solid ${isDragOver ? "var(--status-todo)" : "var(--border-primary)"}`,
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(statusIdx); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
            onDrop={(e) => handleDrop(e, statusIdx)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[statusIdx] }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{statusName}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => onNewTask(statusIdx)}
                className="p-1 rounded transition-colors"
                style={{ color: "var(--text-tertiary)" }}
                title={`Add task to ${statusName}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {colTasks.length === 0 ? (
                <div className="text-xs text-center py-6" style={{ color: "var(--text-tertiary)" }}>
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => (
                  <KanbanCard key={task.id} task={task} onNavigate={onNavigate} onDragStart={handleDragStart} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
