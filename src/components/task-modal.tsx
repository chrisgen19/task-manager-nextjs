"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ExternalLink } from "lucide-react";
import { taskSchema } from "@/schemas";
import type { TaskInput } from "@/schemas";
import { z } from "zod";
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS } from "@/types";
import { RichTextEditor } from "./rich-text-editor";
import type { Workboard } from "@/types";

type TaskFormValues = z.input<typeof taskSchema>;

interface TaskModalProps {
  workboards: Workboard[];
  defaultStatus?: number;
  defaultDueDate?: string;
  defaultWorkboardId?: string;
  onSave: (data: TaskInput) => Promise<void>;
  onClose: () => void;
}

const fieldStyle = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border-primary)",
  color: "var(--text-primary)",
  borderRadius: "6px",
  padding: "7px 10px",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-tertiary)" }}>
      {children}
    </label>
  );
}

export function TaskModal({ workboards, defaultStatus, defaultDueDate, defaultWorkboardId, onSave, onClose }: TaskModalProps) {
  const firstWorkboardId = workboards[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues, unknown, TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      jiraUrl: "",
      priority: 1,
      status: defaultStatus ?? 1,
      dueDate: defaultDueDate ?? null,
      workboardId: defaultWorkboardId ?? firstWorkboardId,
    },
  });

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const watchedPriority = useWatch({ control, name: "priority" });
  const watchedStatus = useWatch({ control, name: "status" });

  useEffect(() => {
    reset({
      title: "",
      description: "",
      jiraUrl: "",
      priority: 1,
      status: defaultStatus ?? 1,
      dueDate: defaultDueDate ?? null,
      workboardId: defaultWorkboardId ?? firstWorkboardId,
    });
  }, [defaultStatus, defaultDueDate, defaultWorkboardId, firstWorkboardId, reset]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit(onSave)();
  }, [onClose, handleSubmit, onSave]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (workboards.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "var(--modal-backdrop)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", maxWidth: "360px" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Create a board first</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Tasks belong to boards. Create your first board from the sidebar to get started.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--modal-backdrop)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-xl shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          maxHeight: "min(92vh, 960px)",
          maxWidth: "1280px",
          width: "calc(100vw - 48px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            New Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form — 2-column layout */}
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* LEFT: Title + Description */}
            <div
              className="flex flex-col flex-1 min-w-0 p-6 gap-5 overflow-y-auto"
              style={{ borderRight: "1px solid var(--border-primary)" }}
            >
              {/* Title */}
              <div>
                <Label>Title *</Label>
                <input
                  {...register("title")}
                  placeholder="What needs to be done?"
                  autoFocus
                  className="w-full text-sm rounded-lg outline-none transition-colors"
                  style={{ ...fieldStyle, fontSize: "0.9375rem", fontWeight: 500, padding: "9px 12px" }}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--status-todo)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-primary)"; }}
                />
                {errors.title && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--priority-critical)" }}>
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col flex-1 min-h-0">
                <Label>
                  Description{" "}
                  <span className="normal-case tracking-normal font-normal" style={{ color: "var(--text-tertiary)" }}>
                    — supports rich text, paste from Jira
                  </span>
                </Label>
                <div className="flex-1 [&>div]:h-full">
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor value={field.value ?? ""} onChange={field.onChange} fillHeight onUploadingChange={setIsUploadingFile} />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Metadata fields */}
            <div className="flex flex-col shrink-0 p-6 gap-5 overflow-y-auto" style={{ width: "280px" }}>

              {/* Board */}
              <div>
                <Label>Board *</Label>
                <select
                  {...register("workboardId")}
                  className="w-full appearance-none"
                  style={fieldStyle}
                >
                  {workboards.map((w) => (
                    <option key={w.id} value={w.id}>{w.key} — {w.name}</option>
                  ))}
                </select>
                {errors.workboardId && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--priority-critical)" }}>
                    {errors.workboardId.message}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <div className="relative">
                  <select
                    {...register("priority", { valueAsNumber: true })}
                    className="w-full appearance-none pr-8"
                    style={{
                      ...fieldStyle,
                      borderColor: `color-mix(in srgb, ${PRIORITY_COLORS[Number(watchedPriority) ?? 1]} 40%, var(--border-primary))`,
                    }}
                  >
                    {PRIORITIES.map((p, i) => (
                      <option key={i} value={i}>{p}</option>
                    ))}
                  </select>
                  <span
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                    style={{ background: PRIORITY_COLORS[Number(watchedPriority) ?? 1] }}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <div className="relative">
                  <select
                    {...register("status", { valueAsNumber: true })}
                    className="w-full appearance-none pr-8"
                    style={{
                      ...fieldStyle,
                      borderColor: `color-mix(in srgb, ${STATUS_COLORS[Number(watchedStatus) ?? 1]} 40%, var(--border-primary))`,
                    }}
                  >
                    {STATUSES.map((s, i) => (
                      <option key={i} value={i}>{s}</option>
                    ))}
                  </select>
                  <span
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                    style={{ background: STATUS_COLORS[Number(watchedStatus) ?? 1] }}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label>Due Date</Label>
                <input
                  {...register("dueDate")}
                  type="date"
                  style={fieldStyle}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--status-todo)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-primary)"; }}
                />
              </div>

              {/* Jira URL */}
              <div>
                <Label>
                  Jira URL <ExternalLink size={10} className="inline ml-0.5 mb-0.5" />
                </Label>
                <input
                  {...register("jiraUrl")}
                  type="url"
                  placeholder="https://…"
                  style={fieldStyle}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--status-todo)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-primary)"; }}
                />
                {errors.jiraUrl && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--priority-critical)" }}>
                    {errors.jiraUrl.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-3 shrink-0"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Ctrl+Enter to save · Esc to close
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingFile}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                style={{ background: "var(--status-todo)", color: "var(--accent-contrast)" }}
              >
                {isUploadingFile ? "Uploading…" : isSubmitting ? "Creating…" : "Create task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
