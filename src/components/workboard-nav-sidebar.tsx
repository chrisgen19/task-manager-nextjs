"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, ArrowLeft, LayoutGrid } from "lucide-react";
import type { Workboard } from "@/types";

interface WorkboardNavSidebarProps {
  workboards: Workboard[];
  activeWorkboardId: string;
  userName: string;
}

export function WorkboardNavSidebar({ workboards, activeWorkboardId, userName }: WorkboardNavSidebarProps) {
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
          style={{ background: "var(--status-todo)", color: "var(--accent-contrast)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 7l3 3 5-6" />
            <rect x="1" y="1" width="12" height="12" rx="2" />
          </svg>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Task Manager Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Back to dashboard */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-tertiary)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
            }}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>

        {/* Boards */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Your Boards
          </p>
          <div className="space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <LayoutGrid size={13} className="shrink-0" />
              <span className="truncate">All Boards</span>
            </Link>
            {workboards.map((w) => {
              const isActive = w.id === activeWorkboardId;
              return (
                <Link
                  key={w.id}
                  href={`/dashboard?board=${w.id}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: isActive ? "var(--bg-tertiary)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <span
                    className="text-xs font-bold px-1 rounded shrink-0"
                    style={{ background: "var(--status-todo)", color: "var(--accent-contrast)", fontSize: "0.625rem" }}
                  >
                    {w.key}
                  </span>
                  <span className="truncate">{w.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 shrink-0 space-y-1" style={{ borderTop: "1px solid var(--border-primary)" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--status-in-progress)", color: "var(--accent-contrast)" }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
          </div>
        </div>
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
    </aside>
  );
}
