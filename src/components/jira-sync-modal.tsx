"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Search,
  Check,
  Loader2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useJiraSync } from "@/hooks/use-jira-sync";
import { PRIORITY_COLORS, STATUS_COLORS, STATUSES } from "@/types";

interface JiraSyncModalProps {
  workboards: Array<{ id: string; name: string; key: string }>;
  syncHook: ReturnType<typeof useJiraSync>;
}

const STATUS_CATEGORY_LABEL: Record<string, string> = {
  new: "To Do",
  indeterminate: "In Progress",
  done: "Done",
};

const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "var(--status-todo)",
  indeterminate: "var(--status-in-progress)",
  done: "var(--status-done)",
};

const PRIORITY_NAME_TO_LOCAL: Record<string, number> = {
  lowest: 0, trivial: 0,
  low: 1, minor: 1, medium: 1,
  high: 2, major: 2,
  highest: 3, critical: 3, blocker: 3,
};

export function JiraSyncModal({ workboards, syncHook }: JiraSyncModalProps) {
  const {
    open,
    closeModal,
    search,
    setSearch,
    projectFilter,
    setProjectFilter,
    statusFilter,
    setStatusFilter,
    workboardId,
    setWorkboardId,
    projects,
    issues,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    selected,
    toggleSelect,
    selectAll,
    deselectAll,
    syncing,
    syncResult,
    syncError,
    syncSelected,
  } = syncHook;

  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === backdropRef.current) closeModal(); }}
    >
      <div
        className="flex flex-col w-full max-w-3xl mx-4 rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Import from Jira
          </h2>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Workboard selector */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Import to workboard
          </label>
          <div className="relative">
            <select
              value={workboardId}
              onChange={(e) => setWorkboardId(e.target.value)}
              className="w-full text-sm rounded-lg outline-none appearance-none pr-8"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
                padding: "8px 12px",
              }}
            >
              <option value="">Select a workboard...</option>
              {workboards.map((wb) => (
                <option key={wb.id} value={wb.id}>
                  {wb.name} ({wb.key})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
        </div>

        {/* Search + filters */}
        <div className="px-5 py-3 space-y-2 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Jira issues..."
              className="w-full text-sm rounded-lg outline-none pl-9 pr-3"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
                padding: "8px 12px",
                paddingLeft: "36px",
              }}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full text-xs rounded-lg outline-none appearance-none pr-7"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                  padding: "6px 10px",
                }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
            <div className="relative flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs rounded-lg outline-none appearance-none pr-7"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                  padding: "6px 10px",
                }}
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-5 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={selected.size === issues.length && issues.length > 0 ? deselectAll : selectAll}
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--accent)" }}
            >
              {selected.size === issues.length && issues.length > 0 ? "Deselect all" : "Select all"}
            </button>
            {selected.size > 0 && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {selected.size} selected
              </span>
            )}
          </div>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {issues.length} issue{issues.length !== 1 ? "s" : ""} loaded
          </span>
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No issues found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {issues.map((issue) => {
                const isSelected = selected.has(issue.id);
                const catKey = issue.fields.status.statusCategory.key;
                const priorityName = (issue.fields.priority?.name || "medium").toLowerCase();
                const localPriority = PRIORITY_NAME_TO_LOCAL[priorityName] ?? 1;
                const localStatus = catKey === "new" ? 1 : catKey === "indeterminate" ? 2 : catKey === "done" ? 4 : 1;

                return (
                  <button
                    key={issue.id}
                    onClick={() => toggleSelect(issue.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                    style={{
                      background: isSelected ? "var(--bg-tertiary)" : "transparent",
                      border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--border-secondary)",
                        background: isSelected ? "var(--accent)" : "transparent",
                      }}
                    >
                      {isSelected && <Check size={10} style={{ color: "var(--accent-contrast)" }} />}
                    </div>

                    {/* Issue key badge */}
                    <span
                      className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: "var(--bg-primary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      {issue.key}
                    </span>

                    {/* Summary */}
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {issue.fields.summary}
                    </span>

                    {/* Priority dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: PRIORITY_COLORS[localPriority] }}
                      title={issue.fields.priority?.name}
                    />

                    {/* Status badge */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${STATUS_CATEGORY_COLOR[catKey] || STATUS_COLORS[localStatus]} 15%, transparent)`,
                        color: STATUS_CATEGORY_COLOR[catKey] || STATUS_COLORS[localStatus],
                      }}
                    >
                      {STATUS_CATEGORY_LABEL[catKey] || STATUSES[localStatus]}
                    </span>

                    {/* Due date */}
                    {issue.fields.duedate && (
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(issue.fields.duedate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}

                    {/* Synced indicator */}
                    {issue.alreadySynced && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--status-done) 15%, transparent)",
                          color: "var(--status-done)",
                        }}
                      >
                        <RefreshCw size={9} />
                        Synced
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2 pb-1">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-primary)",
                    }}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {syncResult && (
              <span style={{ color: "var(--status-done)" }}>
                {syncResult.created > 0 && `${syncResult.created} imported`}
                {syncResult.created > 0 && syncResult.updated > 0 && ", "}
                {syncResult.updated > 0 && `${syncResult.updated} updated`}
              </span>
            )}
            {syncError && (
              <span style={{ color: "var(--priority-critical)" }}>{syncError}</span>
            )}
          </div>
          <button
            onClick={syncSelected}
            disabled={syncing || selected.size === 0 || !workboardId}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {syncing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                Importing...
              </span>
            ) : (
              `Import ${selected.size > 0 ? selected.size + " " : ""}Selected`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
