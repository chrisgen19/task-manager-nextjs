"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const isError = toast.type === "error";

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in"
      style={{
        background: isError
          ? "color-mix(in srgb, var(--priority-critical) 15%, var(--bg-secondary))"
          : "color-mix(in srgb, var(--status-done) 15%, var(--bg-secondary))",
        border: `1px solid ${isError ? "color-mix(in srgb, var(--priority-critical) 40%, transparent)" : "color-mix(in srgb, var(--status-done) 40%, transparent)"}`,
        color: isError ? "var(--priority-critical)" : "var(--status-done)",
        minWidth: "280px",
        maxWidth: "380px",
      }}
    >
      {isError ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
      <span className="flex-1" style={{ color: "var(--text-primary)" }}>{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} style={{ color: "var(--text-tertiary)" }}>
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
