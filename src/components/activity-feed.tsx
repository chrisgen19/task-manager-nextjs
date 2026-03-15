"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight, Tag, Pencil, Calendar, Link2, Plus, Trash2,
  MessageSquare, Activity, Check, X,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import type { FeedItem, Comment, ActivityLog, ActivityAction } from "@/types";

interface ActivityFeedProps {
  taskId: string;
  refreshTrigger: number;
}

type FilterTab = "all" | "comments" | "activity";

const ACTION_ICONS: Record<string, typeof ArrowUpRight> = {
  status_changed: ArrowUpRight,
  priority_changed: Tag,
  title_changed: Pencil,
  description_changed: Pencil,
  due_date_changed: Calendar,
  jira_url_changed: Link2,
  subtask_created: Plus,
  subtask_deleted: Trash2,
};

function formatActionMessage(entry: ActivityLog): string {
  const meta = entry.metadata as Record<string, string> | null;

  switch (entry.action as ActivityAction) {
    case "status_changed":
      return `changed status from ${entry.oldValue} → ${entry.newValue}`;
    case "priority_changed":
      return `changed priority from ${entry.oldValue} → ${entry.newValue}`;
    case "title_changed":
      return `changed title from "${entry.oldValue}" → "${entry.newValue}"`;
    case "description_changed":
      return "updated the description";
    case "due_date_changed":
      return `changed due date from ${entry.oldValue} → ${entry.newValue}`;
    case "jira_url_changed":
      return `changed Jira URL from ${entry.oldValue} → ${entry.newValue}`;
    case "subtask_created":
      return `created subtask "${meta?.subtaskTitle ?? ""}"`;
    case "subtask_deleted":
      return `deleted subtask "${meta?.subtaskTitle ?? ""}"`;
    default:
      return entry.action;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: "var(--accent-primary)", color: "var(--accent-contrast)" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ActivityFeed({ taskId, refreshTrigger }: ActivityFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setFeed(data);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, filter]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed, refreshTrigger]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        if (filter === "activity") setFilter("all");
        else fetchFeed();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditText("");
      fetchFeed();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDeletingId(null);
      fetchFeed();
    }
  };

  const tabs: { key: FilterTab; label: string; icon: typeof Activity }[] = [
    { key: "all", label: "All", icon: Activity },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "activity", label: "Activity", icon: ArrowUpRight },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
        Activity
      </h3>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === key
                ? "color-mix(in srgb, var(--accent-primary) 15%, transparent)"
                : "transparent",
              color: filter === key ? "var(--accent-primary)" : "var(--text-tertiary)",
              border: filter === key
                ? "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)"
                : "1px solid transparent",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Feed items */}
      <div className="flex flex-col gap-3 mb-4">
        {loading && feed.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
            Loading…
          </p>
        )}
        {!loading && feed.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
            No activity yet
          </p>
        )}
        {feed.map((item) => {
          if (item.type === "comment") {
            const comment = item.data as Comment;
            const isEditing = editingId === comment.id;
            const isDeleting = deletingId === comment.id;

            return (
              <div key={comment.id} className="flex items-start gap-3 group">
                <Avatar name={comment.user.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {comment.user.name}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {timeAgo(comment.createdAt)}
                      {comment.updatedAt !== comment.createdAt && " (edited)"}
                    </span>
                    {!isEditing && !isDeleting && (
                      <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(comment.id); setEditText(comment.content); }}
                          className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={12} style={{ color: "var(--text-tertiary)" }} />
                        </button>
                        <button
                          onClick={() => setDeletingId(comment.id)}
                          className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} style={{ color: "var(--text-tertiary)" }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isDeleting ? (
                    <div
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
                      style={{
                        background: "color-mix(in srgb, var(--priority-critical) 10%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--priority-critical) 25%, transparent)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Delete this comment?
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: "var(--priority-critical)", color: "#fff" }}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : isEditing ? (
                    <div>
                      <div
                        className="rounded-xl overflow-hidden mb-2"
                        style={{ border: "1px solid var(--border-primary)" }}
                      >
                        <RichTextEditor
                          value={editText}
                          onChange={setEditText}
                          placeholder="Edit comment…"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: "var(--accent-primary)", color: "var(--accent-contrast)" }}
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditText(""); }}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none rounded-xl px-4 py-3 text-sm [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1"
                      style={{
                        background: "color-mix(in srgb, var(--bg-tertiary) 50%, transparent)",
                        border: "1px solid var(--border-primary)",
                        color: "var(--text-primary)",
                      }}
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                  )}
                </div>
              </div>
            );
          }

          // Activity item
          const entry = item.data as ActivityLog;
          const ActionIcon = ACTION_ICONS[entry.action] ?? Activity;

          return (
            <div key={entry.id} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
                }}
              >
                <ActionIcon size={13} style={{ color: "var(--text-tertiary)" }} />
              </div>
              <p className="flex-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {entry.user.name}
                </span>{" "}
                {formatActionMessage(entry)}
              </p>
              <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                {timeAgo(entry.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Comment input */}
      <div>
        <div
          className="rounded-xl overflow-hidden mb-2"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          <RichTextEditor
            value={commentText}
            onChange={setCommentText}
            placeholder="Write a comment…"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              background: "var(--accent-primary)",
              color: "var(--accent-contrast)",
            }}
          >
            <MessageSquare size={12} />
            {submitting ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
