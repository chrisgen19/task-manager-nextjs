"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS, type TaskFilters } from "@/types";
import type { Task } from "@/types";

interface SidebarProps {
  tasks: Task[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  userName: string;
}

function FilterBtn({
  active,
  dot,
  label,
  count,
  onClick,
}: {
  active: boolean;
  dot: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
      style={{
        background: active ? "var(--bg-tertiary)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <span className="flex-1">{label}</span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
        style={{
          background: active ? "var(--bg-hover)" : "var(--bg-tertiary)",
          color: "var(--text-tertiary)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

const STATUS_DONE = STATUSES.indexOf("Done");           // 4
const STATUS_IN_PROGRESS = STATUSES.indexOf("In Progress"); // 2

export function Sidebar({ tasks, filters, onFiltersChange, userName }: SidebarProps) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === STATUS_DONE).length;
  const active = tasks.filter((t) => t.status === STATUS_IN_PROGRESS).length;
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== STATUS_DONE
  ).length;

  const priorityCounts = PRIORITIES.map((_, i) => tasks.filter((t) => t.priority === i).length);
  const statusCounts = STATUSES.map((_, i) => tasks.filter((t) => t.status === i).length);

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{
        width: "240px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-primary)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 shrink-0"
        style={{ height: "56px", borderBottom: "1px solid var(--border-primary)" }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "var(--status-todo)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M2 7l3 3 5-6" />
            <rect x="1" y="1" width="12" height="12" rx="2" />
          </svg>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Task Manager Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Overview */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            Overview
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total", value: total, color: "var(--text-secondary)" },
              { label: "Done", value: done, color: "var(--status-done)" },
              { label: "Active", value: active, color: "var(--status-in-progress)" },
              { label: "Overdue", value: overdue, color: overdue > 0 ? "var(--priority-critical)" : "var(--text-secondary)" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-lg p-2.5 text-center"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <div className="text-lg font-bold leading-none mb-0.5" style={{ color }}>
                  {value}
                </div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter by Priority */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Filter by Priority
          </p>
          <div className="space-y-0.5">
            <FilterBtn
              active={filters.priority === -1}
              dot="var(--text-tertiary)"
              label="All"
              count={total}
              onClick={() => onFiltersChange({ ...filters, priority: -1 })}
            />
            {PRIORITIES.map((name, i) => (
              <FilterBtn
                key={i}
                active={filters.priority === i}
                dot={PRIORITY_COLORS[i]}
                label={name}
                count={priorityCounts[i]}
                onClick={() => onFiltersChange({ ...filters, priority: i })}
              />
            ))}
          </div>
        </div>

        {/* Filter by Status */}
        <div className="px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Filter by Status
          </p>
          <div className="space-y-0.5">
            <FilterBtn
              active={filters.status === -1}
              dot="var(--text-tertiary)"
              label="All"
              count={total}
              onClick={() => onFiltersChange({ ...filters, status: -1 })}
            />
            {STATUSES.map((name, i) => (
              <FilterBtn
                key={i}
                active={filters.status === i}
                dot={STATUS_COLORS[i]}
                label={name}
                count={statusCounts[i]}
                onClick={() => onFiltersChange({ ...filters, status: i })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 shrink-0 space-y-1" style={{ borderTop: "1px solid var(--border-primary)" }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--status-in-progress)", color: "#fff" }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {userName}
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {total} task{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--bg-tertiary)";
            el.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "transparent";
            el.style.color = "var(--text-secondary)";
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
