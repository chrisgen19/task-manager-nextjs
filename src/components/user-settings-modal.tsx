"use client";

import { useState, useEffect, useCallback } from "react";
import { X, LogOut, Sun, Moon, Check, Eye, EyeOff } from "lucide-react";
import { signOut } from "next-auth/react";
import { setTheme, useTheme, type Theme } from "@/components/theme-toggle";

const ACCENT_COLORS = [
  { name: "blue", value: "#3b82f6" },
  { name: "indigo", value: "#6366f1" },
  { name: "purple", value: "#a855f7" },
  { name: "teal", value: "#14b8a6" },
  { name: "orange", value: "#f97316" },
  { name: "rose", value: "#f43f5e" },
] as const;

type AccentColor = (typeof ACCENT_COLORS)[number]["name"];

interface UserSettingsModalProps {
  userName: string;
  initialAccentColor: string;
  showSubtasks: boolean;
  onToggleSubtasks: () => void;
  onUserNameChange: (name: string) => void;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
      {children}
    </p>
  );
}

export function UserSettingsModal({
  userName,
  initialAccentColor,
  showSubtasks,
  onToggleSubtasks,
  onUserNameChange,
  onClose,
}: UserSettingsModalProps) {
  const theme = useTheme();
  const [accentColor, setAccentColor] = useState<AccentColor>(
    (initialAccentColor as AccentColor) || "blue"
  );

  // Profile form
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user email on mount
  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.email) setEmail(data.email);
      })
      .catch(() => {});
  }, []);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Sync accent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("accentColor") as AccentColor | null;
    if (stored && ACCENT_COLORS.some((c) => c.name === stored)) {
      setAccentColor(stored);
    }
  }, []);

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    // Persist to DB
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  }

  function handleAccentChange(color: AccentColor) {
    setAccentColor(color);
    localStorage.setItem("accentColor", color);
    document.documentElement.setAttribute("data-accent", color);
    // Persist to DB
    fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: color }),
    }).catch(() => {});
  }

  async function handleProfileSave() {
    setProfileLoading(true);
    setProfileMessage(null);

    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== userName) body.name = name.trim();
    if (email.trim()) body.email = email.trim();
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

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

      if (data.name) onUserNameChange(data.name);
      setCurrentPassword("");
      setNewPassword("");
      setProfileMessage({ type: "success", text: "Profile updated" });
    } catch {
      setProfileMessage({ type: "error", text: "Network error" });
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--modal-backdrop)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full rounded-xl shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          maxHeight: "90vh",
          maxWidth: "480px",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            User Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Appearance */}
          <div>
            <SectionLabel>Appearance</SectionLabel>

            {/* Theme toggle cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["dark", "light"] as const).map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: active ? "var(--bg-tertiary)" : "transparent",
                      border: active
                        ? "1.5px solid var(--accent)"
                        : "1.5px solid var(--border-primary)",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {t === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                    <span className="capitalize">{t}</span>
                    {active && (
                      <Check size={14} className="ml-auto" style={{ color: "var(--accent)" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Accent color */}
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Accent Color
            </p>
            <div className="flex gap-2.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleAccentChange(c.name)}
                  className="relative w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c.value,
                    boxShadow:
                      accentColor === c.name
                        ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${c.value}`
                        : "none",
                  }}
                  title={c.name}
                >
                  {accentColor === c.name && (
                    <Check size={14} className="absolute inset-0 m-auto text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <SectionLabel>Preferences</SectionLabel>
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                Show subtasks in list
              </span>
              <button
                onClick={onToggleSubtasks}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{
                  background: showSubtasks ? "var(--accent)" : "var(--bg-hover)",
                }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: "#fff",
                    transform: showSubtasks ? "translateX(16px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Profile */}
          <div>
            <SectionLabel>Profile</SectionLabel>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div>
            <SectionLabel>Change Password</SectionLabel>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Current Password
                </label>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2.5 top-[26px] p-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  New Password
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-primary)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2.5 top-[26px] p-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Profile message */}
          {profileMessage && (
            <p
              className="text-xs px-1"
              style={{
                color: profileMessage.type === "success" ? "var(--status-done)" : "var(--priority-critical)",
              }}
            >
              {profileMessage.text}
            </p>
          )}

          {/* Save button */}
          <button
            onClick={handleProfileSave}
            disabled={profileLoading}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {profileLoading ? "Saving…" : "Save Changes"}
          </button>

          {/* Divider + Sign out */}
          <div style={{ borderTop: "1px solid var(--border-primary)", paddingTop: "16px" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors"
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
        </div>
      </div>
    </div>
  );
}
