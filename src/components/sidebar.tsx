"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Plus, Pencil, Trash2, X, Check, LayoutGrid } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS, type TaskFilters } from "@/types";
import type { Task, Workboard } from "@/types";

interface SidebarProps {
  tasks: Task[];
  workboards: Workboard[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onWorkboardCreate: (w: Workboard) => void;
  onWorkboardUpdate: (w: Workboard) => void;
  onWorkboardDelete: (id: string) => void;
  userName: string;
}

function FilterBtn({
  active, dot, label, count, onClick,
}: {
  active: boolean; dot: string; label: string; count: number; onClick: () => void;
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

interface WorkboardFormState {
  name: string;
  key: string;
  description: string;
}

function generateKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "");
  }
  return name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
}

const STATUS_DONE = STATUSES.indexOf("Done");
const STATUS_IN_PROGRESS = STATUSES.indexOf("In Progress");

export function Sidebar({
  tasks, workboards, filters, onFiltersChange,
  onWorkboardCreate, onWorkboardUpdate, onWorkboardDelete,
  userName,
}: SidebarProps) {
  const [showWorkboardForm, setShowWorkboardForm] = useState(false);
  const [editingWorkboard, setEditingWorkboard] = useState<Workboard | null>(null);
  const [formState, setFormState] = useState<WorkboardFormState>({ name: "", key: "", description: "" });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = tasks.length;
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== STATUS_DONE
  ).length;

  const visibleTasks = filters.workboardId
    ? tasks.filter((t) => t.workboardId === filters.workboardId)
    : tasks;

  const priorityCounts = PRIORITIES.map((_, i) => visibleTasks.filter((t) => t.priority === i).length);
  const statusCounts = STATUSES.map((_, i) => visibleTasks.filter((t) => t.status === i).length);

  const openCreateForm = () => {
    setEditingWorkboard(null);
    setFormState({ name: "", key: "", description: "" });
    setFormError("");
    setShowWorkboardForm(true);
  };

  const openEditForm = (w: Workboard) => {
    setEditingWorkboard(w);
    setFormState({ name: w.name, key: w.key, description: w.description ?? "" });
    setFormError("");
    setShowWorkboardForm(true);
  };

  const closeForm = () => {
    setShowWorkboardForm(false);
    setEditingWorkboard(null);
  };

  const handleNameChange = (name: string) => {
    setFormState((prev) => ({
      ...prev,
      name,
      key: editingWorkboard ? prev.key : generateKey(name),
    }));
  };

  const handleSubmit = async () => {
    if (!formState.name.trim()) { setFormError("Name is required"); return; }
    if (!/^[A-Z]{2,5}$/.test(formState.key)) { setFormError("Key must be 2–5 uppercase letters"); return; }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = editingWorkboard ? `/api/workboards/${editingWorkboard.id}` : "/api/workboards";
      const method = editingWorkboard ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to save"); return; }

      const workboard: Workboard = {
        ...data,
        createdAt: new Date(data.createdAt).toISOString(),
        updatedAt: new Date(data.updatedAt).toISOString(),
      };

      if (editingWorkboard) {
        onWorkboardUpdate(workboard);
      } else {
        onWorkboardCreate(workboard);
        onFiltersChange({ ...filters, workboardId: workboard.id });
      }
      closeForm();
    } catch {
      setFormError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (w: Workboard) => {
    if (!confirm(`Delete board "${w.name}" and all its tasks?`)) return;
    const res = await fetch(`/api/workboards/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      onWorkboardDelete(w.id);
    }
  };

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{ width: "240px", background: "var(--bg-secondary)", borderRight: "1px solid var(--border-primary)" }}
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

        {/* Your Boards */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Your Boards
            </p>
            <button
              onClick={openCreateForm}
              className="p-0.5 rounded transition-colors"
              title="Create board"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)"; }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Workboard form */}
          {showWorkboardForm && (
            <div className="mb-2 p-3 rounded-lg" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)" }}>
              <div className="space-y-2">
                <input
                  autoFocus
                  placeholder="Board name"
                  value={formState.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full text-xs rounded px-2 py-1.5 outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                />
                <input
                  placeholder="KEY (e.g. PROJ)"
                  value={formState.key}
                  onChange={(e) => setFormState((prev) => ({ ...prev, key: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) }))}
                  className="w-full text-xs rounded px-2 py-1.5 outline-none font-mono"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                />
                <input
                  placeholder="Description (optional)"
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs rounded px-2 py-1.5 outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                />
                {formError && <p className="text-xs" style={{ color: "var(--priority-critical)" }}>{formError}</p>}
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 text-xs py-1.5 rounded font-medium"
                    style={{ background: "var(--status-todo)", color: "#fff" }}
                  >
                    {isSubmitting ? "Saving…" : editingWorkboard ? "Update" : "Create"}
                  </button>
                  <button
                    onClick={closeForm}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {workboards.length === 0 && !showWorkboardForm && (
            <p className="text-xs py-2 text-center" style={{ color: "var(--text-tertiary)" }}>
              No boards yet. Create one to get started.
            </p>
          )}

          <div className="space-y-0.5">
            {/* All boards */}
            {workboards.length > 0 && (
              <button
                onClick={() => onFiltersChange({ ...filters, workboardId: null })}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
                style={{
                  background: !filters.workboardId ? "var(--bg-tertiary)" : "transparent",
                  color: !filters.workboardId ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <LayoutGrid size={13} className="shrink-0" />
                <span className="flex-1 truncate">All Boards</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>
                  {total}
                </span>
              </button>
            )}

            {workboards.map((w) => {
              const boardTaskCount = tasks.filter((t) => t.workboardId === w.id).length;
              const isActive = filters.workboardId === w.id;
              return (
                <div
                  key={w.id}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: isActive ? "var(--bg-tertiary)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <button
                    onClick={() => onFiltersChange({ ...filters, workboardId: w.id })}
                    className="flex items-center gap-2 flex-1 min-w-0 text-sm text-left"
                    style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    <span
                      className="text-xs font-bold px-1 rounded shrink-0"
                      style={{ background: "var(--status-todo)", color: "#fff", fontSize: "0.625rem" }}
                    >
                      {w.key}
                    </span>
                    <span className="flex-1 truncate">{w.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}>
                      {boardTaskCount}
                    </span>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => openEditForm(w)}
                      className="p-0.5 rounded"
                      style={{ color: "var(--text-tertiary)" }}
                      title="Edit board"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(w)}
                      className="p-0.5 rounded"
                      style={{ color: "var(--priority-critical)" }}
                      title="Delete board"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overview */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            Overview
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total", value: visibleTasks.length, color: "var(--text-secondary)" },
              { label: "Done", value: visibleTasks.filter((t) => t.status === STATUS_DONE).length, color: "var(--status-done)" },
              { label: "Active", value: visibleTasks.filter((t) => t.status === STATUS_IN_PROGRESS).length, color: "var(--status-in-progress)" },
              { label: "Overdue", value: visibleTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== STATUS_DONE).length, color: overdue > 0 ? "var(--priority-critical)" : "var(--text-secondary)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--bg-tertiary)" }}>
                <div className="text-lg font-bold leading-none mb-0.5" style={{ color }}>{value}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</div>
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
              count={visibleTasks.length}
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
              count={visibleTasks.length}
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
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--status-in-progress)", color: "#fff" }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{total} task{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <ThemeToggle />
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

      {/* Unused icon imports to avoid TS errors */}
      <span className="hidden"><Check size={0} /><X size={0} /></span>
    </aside>
  );
}
