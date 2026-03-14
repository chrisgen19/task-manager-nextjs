"use client";

import { Search, Plus, LayoutList, Columns3, Calendar, GitBranch, SlidersHorizontal, X } from "lucide-react";
import type { ViewType, TaskFilters, TaskSort, SortField } from "@/types";

const VIEW_TABS: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "list",     label: "List",     icon: <LayoutList size={15} /> },
  { view: "kanban",   label: "Kanban",   icon: <Columns3 size={15} /> },
  { view: "calendar", label: "Calendar", icon: <Calendar size={15} /> },
  { view: "timeline", label: "Timeline", icon: <GitBranch size={15} /> },
];

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  filters: TaskFilters;
  sort: TaskSort;
  onFiltersChange: (f: TaskFilters) => void;
  onSortChange: (s: TaskSort) => void;
  onNewTask: () => void;
  showSort: boolean;
  onToggleSort: () => void;
  showSubtasks: boolean;
  onToggleSubtasks: () => void;
}

export function Header({
  currentView,
  onViewChange,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onNewTask,
  showSort,
  onToggleSort,
  showSubtasks,
  onToggleSubtasks,
}: HeaderProps) {
  const selectStyle = {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-primary)",
    color: "var(--text-primary)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "0.8125rem",
    outline: "none",
  };

  return (
    <header
      className="shrink-0"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Main header row */}
      <div className="flex items-center gap-3 px-5" style={{ height: "56px" }}>
        {/* Search */}
        <div className="relative" style={{ width: "220px" }}>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="search"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full text-sm rounded-lg outline-none"
            style={{
              paddingLeft: "2rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* View tabs */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {VIEW_TABS.map(({ view, label, icon }) => {
            const isActive = currentView === view;
            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isActive ? "var(--bg-tertiary)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  border: `1px solid ${isActive ? "var(--border-secondary)" : "transparent"}`,
                }}
              >
                <span style={{ color: isActive ? "var(--status-todo)" : "var(--text-tertiary)" }}>
                  {icon}
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right: Subtasks toggle + Sort + New Task */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={showSubtasks}
              onChange={onToggleSubtasks}
              className="rounded"
            />
            Subtasks
          </label>

          <button
            onClick={onToggleSort}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: showSort ? "color-mix(in srgb, var(--status-todo) 15%, transparent)" : "var(--bg-tertiary)",
              color: showSort ? "var(--status-todo)" : "var(--text-secondary)",
              border: `1px solid ${showSort ? "color-mix(in srgb, var(--status-todo) 30%, transparent)" : "var(--border-primary)"}`,
            }}
          >
            <SlidersHorizontal size={14} />
            Sort
          </button>

          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--status-todo)", color: "#fff" }}
          >
            <Plus size={15} />
            New Task
          </button>
        </div>
      </div>

      {/* Sort bar */}
      {showSort && (
        <div
          className="flex items-center gap-3 px-5 pb-3"
          style={{ borderTop: "1px solid var(--border-primary)", paddingTop: "10px" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Sort:</span>
          <select
            value={`${sort.field}:${sort.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split(":") as [SortField, "asc" | "desc"];
              onSortChange({ field, direction });
            }}
            style={selectStyle}
          >
            <option value="created:desc">Newest first</option>
            <option value="created:asc">Oldest first</option>
            <option value="title:asc">Title A–Z</option>
            <option value="title:desc">Title Z–A</option>
            <option value="priority:desc">Priority (high → low)</option>
            <option value="priority:asc">Priority (low → high)</option>
            <option value="dueDate:asc">Due date (earliest)</option>
            <option value="dueDate:desc">Due date (latest)</option>
          </select>
          <button
            onClick={onToggleSort}
            className="p-1 rounded"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  );
}
