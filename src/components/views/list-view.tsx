"use client";

import { ChevronUp, ChevronDown, ExternalLink, Calendar, ClipboardList, CornerDownRight } from "lucide-react";
import { formatDate, isOverdue, formatTaskKey } from "@/lib/utils";
import { PRIORITIES, STATUSES, PRIORITY_LABELS, STATUS_LABELS, type SortField } from "@/types";
import type { Task, TaskSort } from "@/types";

interface ListViewProps {
  tasks: Task[];
  sort: TaskSort;
  onSortChange: (sort: TaskSort) => void;
  onNavigate: (task: Task) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort: TaskSort }) {
  if (sort.field !== field) return null;
  return sort.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

const thStyle = {
  padding: "10px 12px",
  textAlign: "left" as const,
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--text-tertiary)",
  borderBottom: "1px solid var(--border-primary)",
  background: "var(--bg-secondary)",
  whiteSpace: "nowrap" as const,
  userSelect: "none" as const,
  cursor: "pointer",
};

const tdStyle = {
  padding: "12px 12px",
  fontSize: "0.875rem",
  borderBottom: "1px solid var(--border-primary)",
  verticalAlign: "middle" as const,
};

export function ListView({ tasks, sort, onSortChange, onNavigate }: ListViewProps) {
  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      onSortChange({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ field, direction: "asc" });
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-tertiary)" }}>
        <ClipboardList size={48} strokeWidth={1} />
        <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>No tasks found</p>
        <p className="text-sm">Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>N</kbd> or click &ldquo;New Task&rdquo; to create one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ ...thStyle, cursor: "default", width: "80px" }}>Key</th>
            <th style={thStyle} onClick={() => handleSort("priority")}>
              <span className="flex items-center gap-1">Priority <SortIcon field="priority" sort={sort} /></span>
            </th>
            <th style={{ ...thStyle, width: "40%" }} onClick={() => handleSort("title")}>
              <span className="flex items-center gap-1">Title <SortIcon field="title" sort={sort} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort("status")}>
              <span className="flex items-center gap-1">Status <SortIcon field="status" sort={sort} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort("dueDate")}>
              <span className="flex items-center gap-1">Due Date <SortIcon field="dueDate" sort={sort} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort("created")}>
              <span className="flex items-center gap-1">Created <SortIcon field="created" sort={sort} /></span>
            </th>
            <th style={{ ...thStyle, cursor: "default" }}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const overdue = isOverdue(task.dueDate) && task.status !== 4;
            return (
              <tr
                key={task.id}
                onClick={() => onNavigate(task)}
                className="cursor-pointer transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-secondary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
              >
                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.75rem" }}>
                  <span className="flex items-center gap-1" style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>
                    {task.parentId && <CornerDownRight size={10} />}
                    {formatTaskKey(task)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span className={`${PRIORITY_LABELS[task.priority]} px-2 py-0.5 rounded text-xs font-medium`}>
                    {PRIORITIES[task.priority]}
                  </span>
                </td>
                <td style={{ ...tdStyle, paddingLeft: task.parentId ? "24px" : "12px" }}>
                  <span className="flex items-center gap-2" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {task.title}
                    {task.subtaskCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                        {task.subtasksDone}/{task.subtaskCount}
                      </span>
                    )}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span className={`${STATUS_LABELS[task.status]} px-2 py-0.5 rounded text-xs font-medium`}>
                    {STATUSES[task.status]}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: overdue ? "var(--priority-critical)" : "var(--text-secondary)" }}>
                  <span className="flex items-center gap-1">
                    {task.dueDate && <Calendar size={12} />}
                    {formatDate(task.dueDate)}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                  {formatDate(task.createdAt)}
                </td>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  {task.jiraUrl && (
                    <a href={task.jiraUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <ExternalLink size={12} /> Jira
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
