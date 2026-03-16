"use client";

import { useEffect, useRef, useState } from "react";
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

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

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

const ISSUE_TYPE_COLOR: Record<string, string> = {
  epic: "#904ee2",
  story: "#63ba3c",
  task: "#4bade8",
  bug: "#e5493a",
  "sub-task": "var(--text-tertiary)",
  subtask: "var(--text-tertiary)",
};

export function JiraSyncModal({ workboards, syncHook }: JiraSyncModalProps) {
  const {
    open,
    closeModal,
    search,
    setSearch,
    projectFilter,
    setProjectFilter,
    statusFilters,
    toggleStatusFilter,
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

  // Project combobox state
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const projectRef = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((p) => p.key === projectFilter);
  const filteredProjects = projects.filter(
    (p) =>
      !projectQuery ||
      p.name.toLowerCase().includes(projectQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(projectQuery.toLowerCase()),
  );

  // Status multi-select state
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusLabel =
    statusFilters.length === 0 || statusFilters.length === STATUS_OPTIONS.length
      ? "All Statuses"
      : statusFilters.map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label).filter(Boolean).join(", ");

  // Confirmation dialog state for child auto-import
  const [showChildPrompt, setShowChildPrompt] = useState(false);

  // Count selected parents/epics that have children
  const selectedParentCount = issues.filter((i) => {
    if (!selected.has(i.id)) return false;
    const hasSubtasks = !i.fields.parent && (i.fields.subtasks?.length ?? 0) > 0;
    const isEpic = i.fields.issuetype?.name?.toLowerCase() === "epic";
    return hasSubtasks || isEpic;
  }).length;

  const handleImportClick = () => {
    if (selectedParentCount > 0) {
      setShowChildPrompt(true);
    } else {
      syncSelected(false);
    }
  };

  // Click-outside for project dropdown
  useEffect(() => {
    if (!projectOpen) return;
    function onClick(e: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
        setProjectQuery("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [projectOpen]);

  // Click-outside for status dropdown
  useEffect(() => {
    if (!statusOpen) return;
    function onClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [statusOpen]);

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
            {/* Project combobox */}
            <div className="relative flex-1" ref={projectRef}>
              <input
                value={projectOpen ? projectQuery : (selectedProject ? `${selectedProject.name} (${selectedProject.key})` : "")}
                onChange={(e) => {
                  setProjectQuery(e.target.value);
                  if (!projectOpen) setProjectOpen(true);
                }}
                onFocus={() => {
                  setProjectOpen(true);
                  setProjectQuery("");
                }}
                placeholder="All Projects"
                className="w-full text-xs rounded-lg outline-none pr-7"
                style={{
                  background: "var(--bg-tertiary)",
                  border: `1px solid ${projectOpen ? "var(--accent)" : "var(--border-primary)"}`,
                  color: "var(--text-primary)",
                  padding: "6px 10px",
                }}
              />
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
              {projectOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-10 max-h-48 overflow-y-auto rounded-lg py-1"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <button
                    onClick={() => { setProjectFilter(""); setProjectOpen(false); setProjectQuery(""); }}
                    className="w-full text-left text-xs px-3 py-1.5 transition-colors"
                    style={{ color: !projectFilter ? "var(--accent)" : "var(--text-secondary)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    All Projects
                  </button>
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setProjectFilter(p.key); setProjectOpen(false); setProjectQuery(""); }}
                      className="w-full text-left text-xs px-3 py-1.5 transition-colors"
                      style={{ color: projectFilter === p.key ? "var(--accent)" : "var(--text-primary)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {p.name} <span style={{ color: "var(--text-tertiary)" }}>({p.key})</span>
                    </button>
                  ))}
                  {filteredProjects.length === 0 && (
                    <div className="text-xs px-3 py-1.5" style={{ color: "var(--text-tertiary)" }}>
                      No projects found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status multi-select */}
            <div className="relative flex-1" ref={statusRef}>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className="w-full text-left text-xs rounded-lg pr-7 truncate"
                style={{
                  background: "var(--bg-tertiary)",
                  border: `1px solid ${statusOpen ? "var(--accent)" : "var(--border-primary)"}`,
                  color: statusFilters.length === 0 ? "var(--text-tertiary)" : "var(--text-primary)",
                  padding: "6px 10px",
                }}
              >
                {statusLabel}
              </button>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
              {statusOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg py-1"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const isChecked = statusFilters.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleStatusFilter(opt.value)}
                        className="w-full flex items-center gap-2 text-left text-xs px-3 py-1.5 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0"
                          style={{
                            borderColor: isChecked ? "var(--accent)" : "var(--border-secondary)",
                            background: isChecked ? "var(--accent)" : "transparent",
                          }}
                        >
                          {isChecked && <Check size={9} style={{ color: "var(--accent-contrast)" }} />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
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
                const typeName = issue.fields.issuetype?.name || "Task";
                const typeColor = ISSUE_TYPE_COLOR[typeName.toLowerCase()] || "var(--text-tertiary)";
                const isSubtask = !!issue.fields.parent;
                const subtaskCount = issue.fields.subtasks?.length ?? 0;

                return (
                  <button
                    key={issue.id}
                    onClick={() => toggleSelect(issue.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
                    style={{
                      background: isSelected ? "var(--bg-tertiary)" : "transparent",
                      border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                      paddingLeft: isSubtask ? "28px" : undefined,
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

                    {/* Issue type badge */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                        color: typeColor,
                      }}
                    >
                      {typeName}
                    </span>

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

                    {/* Parent key for subtasks */}
                    {isSubtask && (
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                        ↳ {issue.fields.parent!.key}
                      </span>
                    )}

                    {/* Summary */}
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {issue.fields.summary}
                    </span>

                    {/* Subtask count for parents */}
                    {subtaskCount > 0 && !isSubtask && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          color: "var(--accent)",
                        }}
                        title="Subtasks will be auto-imported"
                      >
                        +{subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""}
                      </span>
                    )}

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
                {syncResult.autoImported > 0 && ` (incl. ${syncResult.autoImported} subtask${syncResult.autoImported !== 1 ? "s" : ""})`}
              </span>
            )}
            {syncError && (
              <span style={{ color: "var(--priority-critical)" }}>{syncError}</span>
            )}
          </div>
          <button
            onClick={handleImportClick}
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

        {/* Child import confirmation dialog */}
        {showChildPrompt && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <div
              className="mx-6 p-5 rounded-xl max-w-sm w-full"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
            >
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Import children?
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                {selectedParentCount} of the selected issue{selectedParentCount !== 1 ? "s" : ""} {selectedParentCount !== 1 ? "have" : "has"} subtasks
                or child issues. Would you like to import them as well?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowChildPrompt(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowChildPrompt(false); syncSelected(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  No, just selected
                </button>
                <button
                  onClick={() => { setShowChildPrompt(false); syncSelected(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                >
                  Yes, include children
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
