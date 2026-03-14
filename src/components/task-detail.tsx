"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ExternalLink, Copy, Check, Trash2, Calendar,
  ChevronDown, Pencil, X, Plus, GripVertical,
  ArrowUpRight,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { formatTaskKey } from "@/lib/utils";
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS } from "@/types";
import type { Task } from "@/types";

interface TaskDetailProps {
  task: Task;
  subtasks?: Task[];
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
}

function SelectDropdown({ options, colors, value, onSelect, onClose }: SelectDropdownProps) {
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

export function TaskDetail({ task: initialTask, subtasks: initialSubtasks = [] }: TaskDetailProps) {
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
  const [subtasks, setSubtasks] = useState<Task[]>(initialSubtasks);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const taskSlug = formatTaskKey(task);
  const isSubtask = !!task.parentId;
  const hasSubtasks = subtasks.length > 0;
  const subtasksDone = subtasks.filter((s) => s.status === 4).length;

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
      setTask((prev) => ({
        ...prev,
        ...raw,
        workboardKey: prev.workboardKey,
        workboardName: prev.workboardName,
        parentId: prev.parentId,
        parentTaskNumber: raw.parent?.taskNumber ?? prev.parentTaskNumber,
        subtaskNumber: prev.subtaskNumber,
        dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
        createdAt: new Date(raw.createdAt).toISOString(),
        updatedAt: new Date(raw.updatedAt).toISOString(),
      }));
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
    const msg = hasSubtasks
      ? `Delete "${task.title}" and its ${subtasks.length} subtask(s)? This cannot be undone.`
      : `Delete "${task.title}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "Failed to delete task");
      }
    } catch {
      setSaveError("Failed to delete task");
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setIsCreatingSubtask(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      if (res.ok) {
        const raw = await res.json();
        const newSubtask: Task = {
          ...raw,
          workboardKey: raw.workboard?.key ?? task.workboardKey,
          workboardName: raw.workboard?.name ?? task.workboardName,
          dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
          createdAt: new Date(raw.createdAt).toISOString(),
          updatedAt: new Date(raw.updatedAt).toISOString(),
          parentTaskNumber: raw.parent?.taskNumber ?? task.taskNumber,
          subtaskCount: raw._count?.subtasks ?? 0,
          subtasksDone: 0,
        };
        setSubtasks((prev) => [...prev, newSubtask]);
        setNewSubtaskTitle("");
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "Failed to create subtask");
      }
    } catch {
      setSaveError("Failed to create subtask");
    } finally {
      setIsCreatingSubtask(false);
    }
  };

  const handleReorderSubtasks = async (fromIdx: number, toIdx: number) => {
    const previous = subtasks;
    const reordered = [...previous];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setSubtasks(reordered);

    try {
      setSaveError("");
      const res = await fetch(`/api/tasks/${task.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskIds: reordered.map((s) => s.id) }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubtasks(previous);
        setSaveError(body.error ?? "Failed to reorder subtasks");
      }
    } catch {
      setSubtasks(previous);
      setSaveError("Failed to reorder subtasks");
    }
  };

  const handleConvertToStandalone = async () => {
    try {
      setSaveError("");
      const res = await fetch(`/api/tasks/${task.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "to-standalone" }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "Failed to convert to standalone task");
      }
    } catch {
      setSaveError("Failed to convert to standalone task");
    }
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
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <div className="flex flex-col gap-6 w-full py-6 px-8">

          {/* Parent breadcrumb for subtasks */}
          {isSubtask && task.parentTaskNumber != null && (
            <div>
              <Link
                href={`/t/${task.workboardKey}-${task.parentTaskNumber}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: "var(--bg-tertiary)", color: "var(--status-todo)" }}
              >
                <ArrowUpRight size={12} />
                Subtask of {task.workboardKey}-{task.parentTaskNumber}
              </Link>
            </div>
          )}

          {/* Task type badge */}
          <div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wider"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
            >
              {isSubtask ? "Subtask" : "Task"} · {taskSlug}
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
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) return;
                  setEditingTitle(true);
                }}
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
                <div
                  className="flex items-center gap-2 sticky bottom-0 py-3"
                  style={{ background: "var(--bg-primary)" }}
                >
                  <button
                    onClick={handleDescriptionSave}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--status-todo)", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setDescValue(task.description); setEditingDescription(false); }}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) return;
                  setEditingDescription(true);
                }}
                className="cursor-text rounded-lg transition-colors"
                style={{ border: "1px solid transparent", padding: "10px 12px", minHeight: "80px" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid var(--border-primary)";
                  (e.currentTarget as HTMLDivElement).style.background = "color-mix(in srgb, var(--bg-tertiary) 40%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid transparent";
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
                title="Click to edit description"
              >
                {task.description ? (
                  <div
                    className="rich-content"
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

          {/* Subtasks section (only for non-subtask tasks) */}
          {!isSubtask && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowSubtasks((v) => !v)}
                  className="flex items-center gap-1"
                >
                  <ChevronDown
                    size={14}
                    className="transition-transform"
                    style={{
                      color: "var(--text-tertiary)",
                      transform: showSubtasks ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Subtasks</h3>
                </button>
                {subtasks.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    {subtasksDone}/{subtasks.length}
                  </span>
                )}
                {subtasks.length > 0 && (
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)", maxWidth: "120px" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(subtasksDone / subtasks.length) * 100}%`,
                        background: subtasksDone === subtasks.length ? "var(--status-done)" : "var(--status-todo)",
                      }}
                    />
                  </div>
                )}
              </div>

              {showSubtasks && (
                <div className="space-y-1">
                  {/* Subtask list */}
                  {subtasks.map((sub, idx) => (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null && dragIdx !== idx) {
                          handleReorderSubtasks(dragIdx, idx);
                        }
                        setDragIdx(null);
                      }}
                      onDragEnd={() => setDragIdx(null)}
                      onClick={() => router.push(`/t/${formatTaskKey(sub)}`)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors"
                      style={{ background: dragIdx === idx ? "var(--bg-tertiary)" : "transparent" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-tertiary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = dragIdx === idx ? "var(--bg-tertiary)" : "transparent"; }}
                    >
                      <GripVertical size={12} className="opacity-0 group-hover:opacity-50 shrink-0 cursor-grab" style={{ color: "var(--text-tertiary)" }} />
                      <span
                        className="w-3.5 h-3.5 rounded-sm border-2 shrink-0 flex items-center justify-center"
                        style={{
                          borderColor: STATUS_COLORS[sub.status],
                          background: sub.status === 4 ? STATUS_COLORS[4] : "transparent",
                        }}
                      >
                        {sub.status === 4 && <Check size={10} className="text-white" />}
                      </span>
                      <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-tertiary)" }}>
                        {formatTaskKey(sub)}
                      </span>
                      <span
                        className="text-sm flex-1 truncate"
                        style={{
                          color: sub.status === 4 ? "var(--text-tertiary)" : "var(--text-primary)",
                          textDecoration: sub.status === 4 ? "line-through" : "none",
                        }}
                      >
                        {sub.title}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: PRIORITY_COLORS[sub.priority] }}
                        title={PRIORITIES[sub.priority]}
                      />
                    </div>
                  ))}

                  {/* Inline creation */}
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Plus size={14} style={{ color: "var(--text-tertiary)" }} />
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateSubtask();
                        if (e.key === "Escape") setNewSubtaskTitle("");
                      }}
                      placeholder="Add subtask…"
                      disabled={isCreatingSubtask}
                      className="flex-1 text-sm bg-transparent outline-none"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
                  onSelect={(v) => {
                    if (v === 4 && subtasks.length > 0) {
                      const open = subtasks.filter((s) => s.status !== 4);
                      if (open.length > 0 && !confirm(`This task has ${open.length} open subtask(s). Mark as Done anyway?`)) return;
                    }
                    saveField({ status: v });
                  }}
                  onClose={() => setShowStatusDropdown(false)}

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

          {/* Convert / Delete actions */}
          <div className="mt-auto pt-6 space-y-2">
            {/* Convert to standalone (only for subtasks) */}
            {isSubtask && (
              <button
                onClick={handleConvertToStandalone}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: "var(--status-todo)",
                  background: "color-mix(in srgb, var(--status-todo) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--status-todo) 20%, transparent)",
                }}
              >
                <ArrowUpRight size={14} />
                Convert to standalone task
              </button>
            )}

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
              Delete {isSubtask ? "subtask" : "task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
