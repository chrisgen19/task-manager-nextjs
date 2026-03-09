"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ExternalLink, Copy, Check, Trash2, Calendar,
  ChevronDown, Pencil, X,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS } from "@/types";
import type { Task } from "@/types";

interface TaskDetailProps {
  task: Task;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function PriorityBadge({ priority, onClick }: { priority: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-opacity"
      style={{
        background: `color-mix(in srgb, ${PRIORITY_COLORS[priority]} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${PRIORITY_COLORS[priority]} 30%, transparent)`,
        color: PRIORITY_COLORS[priority],
        cursor: onClick ? "pointer" : "default",
      }}
      title={onClick ? "Click to change priority" : undefined}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[priority] }} />
      {PRIORITIES[priority]}
      {onClick && <ChevronDown size={11} />}
    </button>
  );
}

function StatusBadge({ status, onClick }: { status: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-opacity"
      style={{
        background: `color-mix(in srgb, ${STATUS_COLORS[status]} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${STATUS_COLORS[status]} 30%, transparent)`,
        color: STATUS_COLORS[status],
        cursor: onClick ? "pointer" : "default",
      }}
      title={onClick ? "Click to change status" : undefined}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
      {STATUSES[status]}
      {onClick && <ChevronDown size={11} />}
    </button>
  );
}

interface SelectDropdownProps {
  options: readonly string[];
  colors: Record<number, string>;
  value: number;
  onSelect: (value: number) => void;
  onClose: () => void;
  BadgeComponent: typeof PriorityBadge | typeof StatusBadge;
}

function SelectDropdown({ options, colors, value, onSelect, onClose, BadgeComponent }: SelectDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-lg shadow-xl overflow-hidden"
      style={{
        top: "calc(100% + 4px)",
        left: 0,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-primary)",
        minWidth: "140px",
      }}
    >
      {options.map((_, i) => (
        <button
          key={i}
          onClick={() => { onSelect(i); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
          style={{
            background: value === i ? "var(--bg-tertiary)" : "transparent",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = value === i ? "var(--bg-tertiary)" : "transparent"; }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i] }} />
          {options[i]}
          {value === i && <Check size={11} className="ml-auto" style={{ color: colors[i] }} />}
        </button>
      ))}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
      <span className="text-xs w-24 shrink-0 pt-1" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function TaskDetail({ task: initialTask }: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Inline edit states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descValue, setDescValue] = useState(task.description);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [editingJiraUrl, setEditingJiraUrl] = useState(false);
  const [jiraUrlValue, setJiraUrlValue] = useState(task.jiraUrl);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const taskSlug = `${task.workboardKey}-${task.taskNumber}`;

  const buildPayload = useCallback((updates: Record<string, unknown>) => ({
    title: task.title,
    description: task.description,
    jiraUrl: task.jiraUrl,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null,
    workboardId: task.workboardId,
    ...updates,
  }), [task]);

  const saveField = useCallback(async (updates: Record<string, unknown>) => {
    setIsSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(updates)),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "Failed to save");
        return;
      }

      const raw = await res.json();
      setTask({
        ...raw,
        workboardKey: task.workboardKey,
        workboardName: task.workboardName,
        dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
        createdAt: new Date(raw.createdAt).toISOString(),
        updatedAt: new Date(raw.updatedAt).toISOString(),
      });
    } catch {
      setSaveError("Network error");
    } finally {
      setIsSaving(false);
    }
  }, [task, buildPayload]);

  const handleTitleSave = useCallback(async () => {
    if (!titleValue.trim()) { setTitleValue(task.title); setEditingTitle(false); return; }
    setEditingTitle(false);
    if (titleValue !== task.title) await saveField({ title: titleValue });
  }, [titleValue, task.title, saveField]);

  const handleDescriptionSave = useCallback(async () => {
    setEditingDescription(false);
    if (descValue !== task.description) await saveField({ description: descValue });
  }, [descValue, task.description, saveField]);

  const handleDueDateSave = useCallback(async (val: string) => {
    setEditingDueDate(false);
    await saveField({ dueDate: val || null });
  }, [saveField]);

  const handleJiraUrlSave = useCallback(async () => {
    setEditingJiraUrl(false);
    if (jiraUrlValue !== task.jiraUrl) await saveField({ jiraUrl: jiraUrlValue });
  }, [jiraUrlValue, task.jiraUrl, saveField]);

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Top breadcrumb bar */}
      <div
        className="flex items-center gap-2 px-6 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}
      >
        <Link
          href="/dashboard"
          className="text-sm transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-tertiary)"; }}
        >
          {task.workboardName}
        </Link>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
        <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {taskSlug}
        </span>

        <div className="flex-1" />

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: "var(--bg-tertiary)", color: copied ? "var(--status-done)" : "var(--text-secondary)" }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy link"}
        </button>

        {/* Open Jira */}
        {task.jiraUrl && (
          <a
            href={task.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            <ExternalLink size={12} />
            Open in Jira
          </a>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Saving…</span>
        )}
      </div>

      {saveError && (
        <div className="px-6 py-2 text-xs" style={{ background: "color-mix(in srgb, var(--priority-critical) 10%, transparent)", color: "var(--priority-critical)" }}>
          {saveError}
        </div>
      )}

      {/* Main content: left + right panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Title + Description */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto px-8 py-6 gap-6">

          {/* Task type badge */}
          <div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wider"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
            >
              Task · {taskSlug}
            </span>
          </div>

          {/* Title — inline edit */}
          <div>
            {editingTitle ? (
              <div className="flex items-start gap-2">
                <textarea
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTitleSave(); }
                    if (e.key === "Escape") { setTitleValue(task.title); setEditingTitle(false); }
                  }}
                  className="flex-1 text-2xl font-bold rounded-lg px-3 py-2 resize-none outline-none leading-tight"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "2px solid var(--status-todo)",
                    color: "var(--text-primary)",
                    minHeight: "80px",
                  }}
                  rows={2}
                />
              </div>
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-2xl font-bold leading-tight cursor-text group flex items-start gap-2"
                style={{ color: "var(--text-primary)" }}
                title="Click to edit title"
              >
                <span>{task.title}</span>
                <Pencil size={14} className="opacity-0 group-hover:opacity-40 mt-1.5 shrink-0 transition-opacity" />
              </h1>
            )}
          </div>

          {/* Description — inline edit */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Description</h3>
              {!editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                  title="Edit description"
                  id="edit-desc-btn"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>

            {editingDescription ? (
              <div>
                <div style={{ minHeight: "180px" }}>
                  <RichTextEditor value={descValue} onChange={setDescValue} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleDescriptionSave}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--status-todo)", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setDescValue(task.description); setEditingDescription(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDescription(true)}
                className="cursor-text rounded-lg p-3 min-h-20 transition-colors"
                style={{ border: "1px solid transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid var(--border-primary)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-tertiary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid transparent"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                title="Click to edit description"
              >
                {task.description ? (
                  <div
                    className="prose-sm text-sm leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                    dangerouslySetInnerHTML={{ __html: task.description }}
                  />
                ) : (
                  <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
                    Add a description…
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Activity placeholder */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Activity</h3>
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--status-in-progress)", color: "#fff" }}
              >
                {task.workboardName.charAt(0).toUpperCase()}
              </div>
              <div
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-tertiary)" }}
              >
                Activity &amp; comments coming soon…
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Details panel */}
        <div
          className="shrink-0 overflow-y-auto py-6 px-5 flex flex-col gap-1"
          style={{ width: "300px", borderLeft: "1px solid var(--border-primary)" }}
        >
          {/* Status */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
              Status
            </p>
            <div className="relative inline-block">
              <StatusBadge
                status={task.status}
                onClick={() => { setShowStatusDropdown(true); setShowPriorityDropdown(false); }}
              />
              {showStatusDropdown && (
                <SelectDropdown
                  options={STATUSES}
                  colors={STATUS_COLORS}
                  value={task.status}
                  onSelect={(v) => saveField({ status: v })}
                  onClose={() => setShowStatusDropdown(false)}
                  BadgeComponent={StatusBadge}
                />
              )}
            </div>
          </div>

          {/* Details section */}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-primary)" }}>
            <div className="px-4 py-2" style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-primary)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Details</p>
            </div>
            <div className="px-4 divide-y" style={{ borderColor: "var(--border-primary)" }}>

              {/* Priority */}
              <DetailRow label="Priority">
                <div className="relative inline-block">
                  <PriorityBadge
                    priority={task.priority}
                    onClick={() => { setShowPriorityDropdown(true); setShowStatusDropdown(false); }}
                  />
                  {showPriorityDropdown && (
                    <SelectDropdown
                      options={PRIORITIES}
                      colors={PRIORITY_COLORS}
                      value={task.priority}
                      onSelect={(v) => saveField({ priority: v })}
                      onClose={() => setShowPriorityDropdown(false)}
                      BadgeComponent={PriorityBadge}
                    />
                  )}
                </div>
              </DetailRow>

              {/* Board */}
              <DetailRow label="Board">
                <Link
                  href="/dashboard"
                  className="text-xs font-medium flex items-center gap-1.5 transition-colors"
                  style={{ color: "var(--status-todo)" }}
                >
                  <span
                    className="text-xs font-bold px-1 rounded"
                    style={{ background: "var(--status-todo)", color: "#fff", fontSize: "0.625rem" }}
                  >
                    {task.workboardKey}
                  </span>
                  {task.workboardName}
                </Link>
              </DetailRow>

              {/* Assignee */}
              <DetailRow label="Assignee">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--status-in-progress)", color: "#fff", fontSize: "0.625rem" }}
                  >
                    {task.workboardName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>Me</span>
                </div>
              </DetailRow>

              {/* Reporter */}
              <DetailRow label="Reporter">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--status-in-progress)", color: "#fff", fontSize: "0.625rem" }}
                  >
                    {task.workboardName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>Me</span>
                </div>
              </DetailRow>

              {/* Due Date */}
              <DetailRow label="Due Date">
                {editingDueDate ? (
                  <input
                    type="date"
                    autoFocus
                    value={dueDateValue}
                    onChange={(e) => setDueDateValue(e.target.value)}
                    onBlur={() => handleDueDateSave(dueDateValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleDueDateSave(dueDateValue);
                      if (e.key === "Escape") setEditingDueDate(false);
                    }}
                    className="text-xs rounded px-2 py-1 outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--status-todo)",
                      color: "var(--text-primary)",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingDueDate(true)}
                    className="flex items-center gap-1.5 text-xs transition-colors group"
                    style={{ color: task.dueDate ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    <Calendar size={12} />
                    <span>{task.dueDate ? formatDateTime(task.dueDate) : "None"}</span>
                    <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                  </button>
                )}
              </DetailRow>

              {/* Jira URL */}
              <DetailRow label="Jira Link">
                {editingJiraUrl ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="url"
                      autoFocus
                      value={jiraUrlValue}
                      onChange={(e) => setJiraUrlValue(e.target.value)}
                      onBlur={handleJiraUrlSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleJiraUrlSave();
                        if (e.key === "Escape") { setJiraUrlValue(task.jiraUrl); setEditingJiraUrl(false); }
                      }}
                      placeholder="https://…"
                      className="flex-1 text-xs rounded px-2 py-1 outline-none"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--status-todo)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <button onClick={() => setEditingJiraUrl(false)} style={{ color: "var(--text-tertiary)" }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {task.jiraUrl ? (
                      <a
                        href={task.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 truncate"
                        style={{ color: "var(--status-todo)" }}
                      >
                        <ExternalLink size={11} />
                        <span className="truncate max-w-32">{task.jiraUrl}</span>
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>None</span>
                    )}
                    <button
                      onClick={() => setEditingJiraUrl(true)}
                      className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <Pencil size={10} />
                    </button>
                  </div>
                )}
              </DetailRow>

            </div>
          </div>

          {/* Dates */}
          <div className="mt-4 space-y-1.5">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Created <span style={{ color: "var(--text-secondary)" }}>{formatDateTime(task.createdAt)}</span>
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Updated <span style={{ color: "var(--text-secondary)" }}>{formatDateTime(task.updatedAt)}</span>
            </p>
          </div>

          {/* Delete */}
          <div className="mt-auto pt-6">
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: "var(--priority-critical)",
                background: "color-mix(in srgb, var(--priority-critical) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--priority-critical) 20%, transparent)",
              }}
            >
              <Trash2 size={14} />
              Delete task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
