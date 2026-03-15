"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ExternalLink, Copy, Check, Trash2, Calendar,
  ChevronDown, Pencil, X, Plus, GripVertical,
  ArrowUpRight, Info, Tag, User, Briefcase, Link2, Clock,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { ActivityFeed } from "./activity-feed";
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: `color-mix(in srgb, ${PRIORITY_COLORS[priority]} 14%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${PRIORITY_COLORS[priority]} 25%, transparent)`,
        color: PRIORITY_COLORS[priority],
        cursor: onClick ? "pointer" : "default",
        boxShadow: `0 1px 3px color-mix(in srgb, ${PRIORITY_COLORS[priority]} 10%, transparent)`,
      }}
      title={onClick ? "Click to change priority" : undefined}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[priority] }} />
      {PRIORITIES[priority]}
      {onClick && <ChevronDown size={11} className="opacity-60" />}
    </button>
  );
}

function StatusBadge({ status, onClick }: { status: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: `color-mix(in srgb, ${STATUS_COLORS[status]} 14%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${STATUS_COLORS[status]} 25%, transparent)`,
        color: STATUS_COLORS[status],
        cursor: onClick ? "pointer" : "default",
        boxShadow: `0 1px 3px color-mix(in srgb, ${STATUS_COLORS[status]} 10%, transparent)`,
      }}
      title={onClick ? "Click to change status" : undefined}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[status] }} />
      {STATUSES[status]}
      {onClick && <ChevronDown size={11} className="opacity-60" />}
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
      className="absolute z-50 rounded-xl overflow-hidden"
      style={{
        top: "calc(100% + 6px)",
        left: 0,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-secondary)",
        minWidth: "160px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div className="py-1.5">
        {options.map((_, i) => (
          <button
            key={i}
            onClick={() => { onSelect(i); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition-colors"
            style={{
              background: value === i ? "var(--bg-tertiary)" : "transparent",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = value === i ? "var(--bg-tertiary)" : "transparent"; }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i] }} />
            <span className="font-medium">{options[i]}</span>
            {value === i && <Check size={12} className="ml-auto" style={{ color: colors[i] }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-2 w-[100px] shrink-0">
        {Icon && <Icon size={13} style={{ color: "var(--text-tertiary)" }} />}
        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
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
  const [activityRefresh, setActivityRefresh] = useState(0);

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
      setActivityRefresh((c) => c + 1);
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
        setActivityRefresh((c) => c + 1);
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

  const statusColor = STATUS_COLORS[task.status];

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Status accent bar */}
      <div
        className="shrink-0"
        style={{
          height: "3px",
          background: `linear-gradient(90deg, ${statusColor}, color-mix(in srgb, ${statusColor} 40%, transparent))`,
        }}
      />

      {/* Top breadcrumb bar */}
      <div
        className="flex items-center gap-2 px-6 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-secondary)",
        }}
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: copied ? "color-mix(in srgb, var(--status-done) 15%, transparent)" : "var(--bg-tertiary)",
            color: copied ? "var(--status-done)" : "var(--text-secondary)",
            border: copied ? "1px solid color-mix(in srgb, var(--status-done) 30%, transparent)" : "1px solid transparent",
          }}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            <ExternalLink size={12} />
            Open in Jira
          </a>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <span className="text-xs animate-pulse" style={{ color: "var(--status-in-progress)" }}>Saving…</span>
        )}
      </div>

      {saveError && (
        <div
          className="px-6 py-2.5 text-xs font-medium flex items-center gap-2"
          style={{
            background: "color-mix(in srgb, var(--priority-critical) 12%, transparent)",
            color: "var(--priority-critical)",
            borderBottom: "1px solid color-mix(in srgb, var(--priority-critical) 25%, transparent)",
          }}
        >
          <Info size={13} />
          {saveError}
        </div>
      )}

      {/* Main content: left + right panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Title + Description */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <div className="flex flex-col gap-8 w-full pt-8 pb-24 px-8">

          {/* Parent breadcrumb for subtasks */}
          {isSubtask && task.parentTaskNumber != null && (
            <div>
              <Link
                href={`/t/${task.workboardKey}-${task.parentTaskNumber}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "color-mix(in srgb, var(--status-todo) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--status-todo) 20%, transparent)",
                  color: "var(--status-todo)",
                }}
              >
                <ArrowUpRight size={12} />
                Subtask of {task.workboardKey}-{task.parentTaskNumber}
              </Link>
            </div>
          )}

          {/* Task type badge + task key */}
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest"
              style={{
                background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                color: statusColor,
                border: `1px solid color-mix(in srgb, ${statusColor} 20%, transparent)`,
              }}
            >
              {isSubtask ? "Subtask" : "Task"}
            </span>
            <span
              className="text-xs font-mono font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              {taskSlug}
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
                  className="flex-1 text-2xl font-bold rounded-xl px-4 py-3 resize-none outline-none leading-tight"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: `2px solid ${statusColor}`,
                    color: "var(--text-primary)",
                    minHeight: "80px",
                    boxShadow: `0 0 0 3px color-mix(in srgb, ${statusColor} 15%, transparent)`,
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
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Description</h3>
              {!editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="p-1 rounded-md opacity-0 hover:opacity-100 transition-opacity"
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
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid ${statusColor}`,
                    boxShadow: `0 0 0 3px color-mix(in srgb, ${statusColor} 15%, transparent)`,
                    minHeight: "180px",
                  }}
                >
                  <RichTextEditor value={descValue} onChange={setDescValue} onUploadingChange={setIsUploadingFile} taskId={task.id} />
                </div>
                <div
                  className="flex items-center gap-2 sticky bottom-0 py-3"
                  style={{ background: "var(--bg-primary)" }}
                >
                  <button
                    onClick={handleDescriptionSave}
                    disabled={isUploadingFile}
                    className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: statusColor,
                      color: "var(--accent-contrast)",
                      boxShadow: `0 2px 8px color-mix(in srgb, ${statusColor} 35%, transparent)`,
                    }}
                  >
                    {isUploadingFile ? "Uploading…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setDescValue(task.description); setEditingDescription(false); }}
                    className="px-5 py-2 rounded-lg text-xs font-semibold"
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
                className="cursor-text rounded-xl transition-all"
                style={{
                  border: "1.5px solid transparent",
                  padding: "12px 14px",
                  minHeight: "80px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1.5px solid var(--border-secondary)";
                  (e.currentTarget as HTMLDivElement).style.background = "color-mix(in srgb, var(--bg-tertiary) 30%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1.5px solid transparent";
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
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setShowSubtasks((v) => !v)}
                  className="flex items-center gap-1.5"
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
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: subtasksDone === subtasks.length
                        ? "color-mix(in srgb, var(--status-done) 15%, transparent)"
                        : "var(--bg-tertiary)",
                      color: subtasksDone === subtasks.length
                        ? "var(--status-done)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {subtasksDone}/{subtasks.length}
                  </span>
                )}
                {subtasks.length > 0 && (
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-tertiary)", maxWidth: "120px" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(subtasksDone / subtasks.length) * 100}%`,
                        background: subtasksDone === subtasks.length
                          ? "var(--status-done)"
                          : `linear-gradient(90deg, var(--status-todo), var(--status-in-progress))`,
                      }}
                    />
                  </div>
                )}
              </div>

              {showSubtasks && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid var(--border-primary)",
                    background: "color-mix(in srgb, var(--bg-secondary) 50%, transparent)",
                  }}
                >
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
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer group transition-colors"
                      style={{
                        background: dragIdx === idx ? "var(--bg-tertiary)" : "transparent",
                        borderBottom: idx < subtasks.length - 1 ? "1px solid var(--border-primary)" : "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-tertiary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = dragIdx === idx ? "var(--bg-tertiary)" : "transparent"; }}
                    >
                      <GripVertical size={12} className="opacity-0 group-hover:opacity-50 shrink-0 cursor-grab" style={{ color: "var(--text-tertiary)" }} />
                      <span
                        className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors"
                        style={{
                          borderWidth: "2px",
                          borderStyle: "solid",
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
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5"
                    style={{
                      borderTop: subtasks.length > 0 ? "1px solid var(--border-primary)" : "none",
                      background: "color-mix(in srgb, var(--bg-tertiary) 30%, transparent)",
                    }}
                  >
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

          {/* Activity & Comments */}
          <ActivityFeed taskId={task.id} refreshTrigger={activityRefresh} />
        </div>
        </div>

        {/* RIGHT: Details panel */}
        <div
          className="shrink-0 overflow-y-auto py-6 px-5 flex flex-col gap-2"
          style={{
            width: "320px",
            borderLeft: "1px solid var(--border-primary)",
            background: "color-mix(in srgb, var(--bg-secondary) 60%, var(--bg-primary))",
          }}
        >
          {/* Status */}
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-tertiary)" }}>
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
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid var(--border-primary)",
              background: "var(--bg-secondary)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{
                background: "color-mix(in srgb, var(--bg-tertiary) 60%, transparent)",
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              <Info size={12} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Details</p>
            </div>
            <div className="px-4 py-1">

              {/* Priority */}
              <DetailRow label="Priority" icon={Tag}>
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

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-primary)" }} />

              {/* Board */}
              <DetailRow label="Board" icon={Briefcase}>
                <Link
                  href="/dashboard"
                  className="text-xs font-medium flex items-center gap-1.5 transition-colors"
                  style={{ color: "var(--status-todo)" }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "var(--status-todo)", color: "var(--accent-contrast)" }}
                  >
                    {task.workboardKey}
                  </span>
                  {task.workboardName}
                </Link>
              </DetailRow>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-primary)" }} />

              {/* Assignee */}
              <DetailRow label="Assignee" icon={User}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--status-in-progress)", color: "var(--accent-contrast)" }}
                  >
                    {task.workboardName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Me</span>
                </div>
              </DetailRow>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-primary)" }} />

              {/* Reporter */}
              <DetailRow label="Reporter" icon={User}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--status-in-progress)", color: "var(--accent-contrast)" }}
                  >
                    {task.workboardName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Me</span>
                </div>
              </DetailRow>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-primary)" }} />

              {/* Due Date */}
              <DetailRow label="Due Date" icon={Calendar}>
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
                    className="text-xs rounded-lg px-2.5 py-1.5 outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: `1.5px solid ${statusColor}`,
                      color: "var(--text-primary)",
                      boxShadow: `0 0 0 2px color-mix(in srgb, ${statusColor} 15%, transparent)`,
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingDueDate(true)}
                    className="flex items-center gap-1.5 text-xs transition-colors group"
                    style={{ color: task.dueDate ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    <Clock size={12} />
                    <span className="font-medium">{task.dueDate ? formatDateTime(task.dueDate) : "None"}</span>
                    <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                  </button>
                )}
              </DetailRow>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-primary)" }} />

              {/* Jira URL */}
              <DetailRow label="Jira Link" icon={Link2}>
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
                      className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: `1.5px solid ${statusColor}`,
                        color: "var(--text-primary)",
                        boxShadow: `0 0 0 2px color-mix(in srgb, ${statusColor} 15%, transparent)`,
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
                        className="text-xs flex items-center gap-1 truncate font-medium"
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
          <div
            className="mt-3 rounded-xl px-4 py-3 space-y-2"
            style={{
              background: "color-mix(in srgb, var(--bg-tertiary) 30%, transparent)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <p className="text-xs flex items-center justify-between" style={{ color: "var(--text-tertiary)" }}>
              <span>Created</span>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{formatDateTime(task.createdAt)}</span>
            </p>
            <p className="text-xs flex items-center justify-between" style={{ color: "var(--text-tertiary)" }}>
              <span>Updated</span>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{formatDateTime(task.updatedAt)}</span>
            </p>
          </div>

          {/* Convert / Delete actions */}
          <div className="mt-auto pt-6 space-y-2">
            {/* Convert to standalone (only for subtasks) */}
            {isSubtask && (
              <button
                onClick={handleConvertToStandalone}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: "var(--status-todo)",
                  background: "color-mix(in srgb, var(--status-todo) 8%, transparent)",
                  border: "1.5px solid color-mix(in srgb, var(--status-todo) 20%, transparent)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--status-todo) 15%, transparent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--status-todo) 8%, transparent)"; }}
              >
                <ArrowUpRight size={14} />
                Convert to standalone task
              </button>
            )}

            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                color: "var(--priority-critical)",
                background: "color-mix(in srgb, var(--priority-critical) 8%, transparent)",
                border: "1.5px solid color-mix(in srgb, var(--priority-critical) 20%, transparent)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--priority-critical) 15%, transparent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--priority-critical) 8%, transparent)"; }}
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
