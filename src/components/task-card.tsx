"use client";

import { ExternalLink, Calendar, Pencil, CornerDownRight } from "lucide-react";
import { formatDate, isOverdue, stripHtml, formatTaskKey } from "@/lib/utils";
import { PRIORITIES, STATUSES, PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS } from "@/types";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

export function TaskCard({ task, onEdit, draggable, onDragStart }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== 4;
  const descText = task.description ? stripHtml(task.description) : "";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onClick={() => onEdit(task)}
      className="group rounded-xl p-3.5 cursor-pointer transition-all"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-primary)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-secondary)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-primary)"; }}
    >
      {/* Priority bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: PRIORITY_COLORS[task.priority] }}
      />

      <div className="relative">
        {/* Task key */}
        <p className="text-xs font-mono mb-1 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
          {task.parentId && <CornerDownRight size={10} />}
          {formatTaskKey(task)}
        </p>

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium leading-snug flex-1" style={{ color: "var(--text-primary)" }}>
            {task.title}
          </h3>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Pencil size={12} />
          </button>
        </div>

        {/* Description preview */}
        {descText && (
          <p className="text-xs mb-2.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {descText}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <span className={`${PRIORITY_LABELS[task.priority]} inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium`}>
            {PRIORITIES[task.priority]}
          </span>
          <span className={`${STATUS_LABELS[task.status]} inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium`}>
            {STATUSES[task.status]}
          </span>
        </div>

        {/* Subtask progress */}
        {task.subtaskCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
              {task.subtasksDone}/{task.subtaskCount} subtasks
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: overdue ? "var(--priority-critical)" : "var(--text-tertiary)" }}
            >
              <Calendar size={11} />
              {overdue ? "Overdue · " : ""}{formatDate(task.dueDate)}
            </span>
          ) : (
            <span />
          )}

          {task.jiraUrl && (
            <a
              href={task.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-xs transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ExternalLink size={11} />
              Jira
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
