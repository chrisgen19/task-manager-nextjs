"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  Sun,
  Moon,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Settings,
} from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/components/theme-toggle";
import { setAccentColor } from "@/components/theme-sync";

const ACCENT_COLORS = [
  { name: "blue", value: "#3b82f6", label: "Blue" },
  { name: "indigo", value: "#6366f1", label: "Indigo" },
  { name: "purple", value: "#a855f7", label: "Purple" },
  { name: "teal", value: "#14b8a6", label: "Teal" },
  { name: "orange", value: "#f97316", label: "Orange" },
  { name: "rose", value: "#f43f5e", label: "Rose" },
] as const;

type AccentColor = (typeof ACCENT_COLORS)[number]["name"];

interface SettingsPageProps {
  userName: string;
  userEmail: string;
  showSubtasks: boolean;
  accentColor: string;
}

export function SettingsPage({
  userName,
  userEmail,
  showSubtasks: initialShowSubtasks,
  accentColor: initialAccentColor,
}: SettingsPageProps) {
  const theme = useTheme();

  // Appearance
  const [accentColor, setAccentColorState] = useState<AccentColor>(
    (initialAccentColor as AccentColor) || "blue"
  );

  // Preferences
  const [showSubtasks, setShowSubtasks] = useState(initialShowSubtasks);

  // Profile
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [savedName, setSavedName] = useState(userName);
  const [savedEmail, setSavedEmail] = useState(userEmail);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  }

  function handleAccentChange(color: AccentColor) {
    setAccentColorState(color);
    setAccentColor(color);
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: color }),
    }).catch(() => {});
  }

  function handleToggleSubtasks() {
    const next = !showSubtasks;
    setShowSubtasks(next);
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSubtasks: next }),
    }).catch(() => {
      setShowSubtasks(!next);
    });
  }

  async function handleProfileSave() {
    setProfileLoading(true);
    setProfileMessage(null);

    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== savedName) body.name = name.trim();
    if (email.trim() && email.trim() !== savedEmail) body.email = email.trim();

    if (Object.keys(body).length === 0) {
      setProfileLoading(false);
      setProfileMessage({ type: "error", text: "No changes to save" });
      return;
    }

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: "error", text: data.error ?? "Failed to save" });
        return;
      }
      if (body.name) setSavedName(body.name);
      if (body.email) setSavedEmail(body.email);
      setProfileMessage({ type: "success", text: "Profile updated" });
    } catch {
      setProfileMessage({ type: "error", text: "Network error" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword) {
      setSecurityMessage({ type: "error", text: "Both fields are required" });
      return;
    }
    if (newPassword.length < 8) {
      setSecurityMessage({
        type: "error",
        text: "New password must be at least 8 characters",
      });
      return;
    }

    setSecurityLoading(true);
    setSecurityMessage(null);

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecurityMessage({ type: "error", text: data.error ?? "Failed to update" });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setSecurityMessage({ type: "success", text: "Password updated" });
    } catch {
      setSecurityMessage({ type: "error", text: "Network error" });
    } finally {
      setSecurityLoading(false);
    }
  }

  return (
    <>
      {/* ─── Sidebar (matches app sidebar pattern) ─── */}
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

          {/* Settings label */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
              <Settings size={13} style={{ color: "var(--text-primary)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Settings</span>
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
              {(name || userName).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{name || userName}</p>
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

      {/* ─── Main content ─── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header (matches 56px app header) */}
        <div
          className="flex items-center px-6 shrink-0"
          style={{
            height: "56px",
            borderBottom: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
          }}
        >
          <h1
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Settings
          </h1>
        </div>

        {/* Content — two-column grid, left column only */}
        <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
          <div className="grid grid-cols-2 gap-6 p-6" style={{ alignContent: "start" }}>
            {/* Left column — all settings */}
            <div className="space-y-5">

              {/* ─── Appearance ─── */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Appearance
                </h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                  Customize the look and feel of your workspace.
                </p>

                {/* Theme */}
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-tertiary)" }}>
                  Theme
                </p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(["dark", "light"] as const).map((t) => {
                    const active = theme === t;
                    const isDark = t === "dark";
                    return (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className="rounded-lg overflow-hidden transition-all"
                        style={{
                          border: active ? "2px solid var(--accent)" : "2px solid var(--border-primary)",
                        }}
                      >
                        <div className="px-3 pt-3 pb-2" style={{ background: isDark ? "#0f172a" : "#f8fafc" }}>
                          <div className="flex gap-2 mb-2">
                            <div className="h-1.5 rounded-full flex-1" style={{ background: isDark ? "#334155" : "#e2e8f0" }} />
                            <div className="h-1.5 rounded-full w-6" style={{ background: isDark ? "#334155" : "#e2e8f0" }} />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="h-6 rounded w-full" style={{ background: isDark ? "#1e293b" : "#ffffff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }} />
                            <div className="h-6 rounded w-full" style={{ background: isDark ? "#1e293b" : "#ffffff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }} />
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-primary)" }}
                        >
                          <div className="flex items-center gap-2">
                            {isDark ? <Moon size={13} style={{ color: "var(--text-secondary)" }} /> : <Sun size={13} style={{ color: "var(--text-secondary)" }} />}
                            <span className="text-xs font-medium capitalize" style={{ color: "var(--text-primary)" }}>{t}</span>
                          </div>
                          {active && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                              <Check size={10} style={{ color: "var(--accent-contrast)" }} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color */}
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-tertiary)" }}>
                  Accent Color
                </p>
                <div className="flex gap-2.5">
                  {ACCENT_COLORS.map((c) => {
                    const active = accentColor === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleAccentChange(c.name)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all"
                        style={{
                          background: active ? "var(--bg-tertiary)" : "transparent",
                          border: active ? `1.5px solid ${c.value}` : "1.5px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <div
                          className="relative w-7 h-7 rounded-full"
                          style={{
                            background: c.value,
                            boxShadow: active ? `0 0 0 2px var(--bg-secondary), 0 0 0 3.5px ${c.value}` : "none",
                          }}
                        >
                          {active && <Check size={13} className="absolute inset-0 m-auto text-white" strokeWidth={2.5} />}
                        </div>
                        <span
                          className="text-[10px] font-medium capitalize"
                          style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}
                        >
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Preferences ─── */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Preferences
                </h2>
                <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
                  Control how tasks are displayed.
                </p>

                <div
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Show subtasks in list
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Display subtasks alongside parent tasks.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSubtasks}
                    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0 ml-4"
                    style={{ background: showSubtasks ? "var(--accent)" : "var(--bg-hover)" }}
                  >
                    <span
                      className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform"
                      style={{
                        background: "#fff",
                        transform: showSubtasks ? "translateX(18px)" : "translateX(0)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* ─── Profile ─── */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Profile
                </h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                  Update your name and email address.
                </p>

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {name || userName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {email || userEmail}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm rounded-lg outline-none transition-colors"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", padding: "8px 12px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-sm rounded-lg outline-none transition-colors"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", padding: "8px 12px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                    />
                  </div>
                </div>

                {profileMessage && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: profileMessage.type === "success" ? "var(--status-done)" : "var(--priority-critical)" }}
                  >
                    {profileMessage.text}
                  </p>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                  >
                    {profileLoading ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              {/* ─── Security ─── */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Security
                </h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                  Update your password to keep your account secure.
                </p>

                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Current Password</label>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full text-sm rounded-lg outline-none transition-colors pr-10"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", padding: "8px 12px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      className="absolute right-3 top-[30px] p-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>New Password</label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full text-sm rounded-lg outline-none transition-colors pr-10"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", padding: "8px 12px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-[30px] p-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {securityMessage && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: securityMessage.type === "success" ? "var(--status-done)" : "var(--priority-critical)" }}
                  >
                    {securityMessage.text}
                  </p>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handlePasswordChange}
                    disabled={securityLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                  >
                    {securityLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

            </div>

            {/* Right column — intentionally empty */}
            <div />
          </div>
        </div>
      </div>
    </>
  );
}
