"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  Sun,
  Moon,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Palette,
  User,
  SlidersHorizontal,
  Shield,
} from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/components/theme-toggle";

const ACCENT_COLORS = [
  { name: "blue", value: "#3b82f6", label: "Blue" },
  { name: "indigo", value: "#6366f1", label: "Indigo" },
  { name: "purple", value: "#a855f7", label: "Purple" },
  { name: "teal", value: "#14b8a6", label: "Teal" },
  { name: "orange", value: "#f97316", label: "Orange" },
  { name: "rose", value: "#f43f5e", label: "Rose" },
] as const;

type AccentColor = (typeof ACCENT_COLORS)[number]["name"];

type Section = "appearance" | "preferences" | "profile" | "security";

const NAV_ITEMS: { id: Section; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
];

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
  const router = useRouter();
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState<Section>("appearance");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Appearance
  const [accentColor, setAccentColorState] = useState<AccentColor>(
    (initialAccentColor as AccentColor) || "blue"
  );

  // Preferences
  const [showSubtasks, setShowSubtasks] = useState(initialShowSubtasks);

  // Profile
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
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

  // Sync accent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("accentColor") as AccentColor | null;
    if (stored && ACCENT_COLORS.some((c) => c.name === stored)) {
      setAccentColorState(stored);
    }
  }, []);

  // Scroll tracking for active section highlight
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function onScroll() {
      const sections = container!.querySelectorAll<HTMLElement>("[data-section]");
      let current: Section = "appearance";
      for (const section of sections) {
        if (section.offsetTop - container!.scrollTop <= 80) {
          current = section.dataset.section as Section;
        }
      }
      setActiveSection(current);
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToSection(id: Section) {
    const el = scrollRef.current?.querySelector(`[data-section="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveSection(id);
  }

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
    localStorage.setItem("accentColor", color);
    document.documentElement.setAttribute("data-accent", color);
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
    if (name.trim() && name.trim() !== userName) body.name = name.trim();
    if (email.trim() && email.trim() !== userEmail) body.email = email.trim();

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
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-6 shrink-0"
        style={{
          height: "56px",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-2 py-1.5 -ml-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div
          className="w-px h-5"
          style={{ background: "var(--border-primary)" }}
        />
        <h1
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h1>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left nav */}
        <nav
          className="shrink-0 py-6 px-3 overflow-y-auto"
          style={{
            width: "220px",
            borderRight: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
          }}
        >
          <div className="space-y-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                  style={{
                    background: active ? "var(--bg-tertiary)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sign out at bottom of nav */}
          <div
            className="mt-6 pt-4"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "var(--bg-tertiary)";
                el.style.color = "var(--priority-critical)";
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
        </nav>

        {/* Main content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--bg-primary)" }}
        >
          <div className="max-w-2xl mx-auto px-8 py-8 space-y-12">
            {/* ─── APPEARANCE ───────────────────────────── */}
            <section data-section="appearance">
              <div className="mb-6">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Appearance
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Customize the look and feel of your workspace.
                </p>
              </div>

              {/* Theme */}
              <div className="mb-8">
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Theme
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["dark", "light"] as const).map((t) => {
                    const active = theme === t;
                    const isDark = t === "dark";
                    return (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className="group relative rounded-xl overflow-hidden transition-all"
                        style={{
                          border: active
                            ? "2px solid var(--accent)"
                            : "2px solid var(--border-primary)",
                        }}
                      >
                        {/* Preview */}
                        <div
                          className="px-3 pt-3 pb-2"
                          style={{
                            background: isDark ? "#0f172a" : "#f8fafc",
                          }}
                        >
                          <div className="flex gap-2 mb-2">
                            <div
                              className="h-1.5 rounded-full flex-1"
                              style={{
                                background: isDark ? "#334155" : "#e2e8f0",
                              }}
                            />
                            <div
                              className="h-1.5 rounded-full w-6"
                              style={{
                                background: isDark ? "#334155" : "#e2e8f0",
                              }}
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <div
                              className="h-6 rounded w-full"
                              style={{
                                background: isDark ? "#1e293b" : "#ffffff",
                                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                              }}
                            />
                            <div
                              className="h-6 rounded w-full"
                              style={{
                                background: isDark ? "#1e293b" : "#ffffff",
                                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                              }}
                            />
                          </div>
                        </div>
                        {/* Label */}
                        <div
                          className="flex items-center justify-between px-3 py-2.5"
                          style={{
                            background: "var(--bg-secondary)",
                            borderTop: "1px solid var(--border-primary)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isDark ? (
                              <Moon size={14} style={{ color: "var(--text-secondary)" }} />
                            ) : (
                              <Sun size={14} style={{ color: "var(--text-secondary)" }} />
                            )}
                            <span
                              className="text-sm font-medium capitalize"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {t}
                            </span>
                          </div>
                          {active && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: "var(--accent)" }}
                            >
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Accent Color
                </p>
                <div className="grid grid-cols-6 gap-3">
                  {ACCENT_COLORS.map((c) => {
                    const active = accentColor === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleAccentChange(c.name)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                        style={{
                          background: active ? "var(--bg-tertiary)" : "transparent",
                          border: active
                            ? `1.5px solid ${c.value}`
                            : "1.5px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!active)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "var(--bg-secondary)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "transparent";
                        }}
                      >
                        <div
                          className="relative w-9 h-9 rounded-full"
                          style={{
                            background: c.value,
                            boxShadow: active
                              ? `0 0 0 2px var(--bg-primary), 0 0 0 4px ${c.value}`
                              : `0 2px 8px ${c.value}40`,
                          }}
                        >
                          {active && (
                            <Check
                              size={16}
                              className="absolute inset-0 m-auto text-white"
                              strokeWidth={2.5}
                            />
                          )}
                        </div>
                        <span
                          className="text-xs font-medium capitalize"
                          style={{
                            color: active
                              ? "var(--text-primary)"
                              : "var(--text-tertiary)",
                          }}
                        >
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--border-primary)" }} />

            {/* ─── PREFERENCES ──────────────────────────── */}
            <section data-section="preferences">
              <div className="mb-6">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Preferences
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Control how tasks are displayed.
                </p>
              </div>

              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Show subtasks in list
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Display subtasks alongside parent tasks in list and kanban views.
                  </p>
                </div>
                <button
                  onClick={handleToggleSubtasks}
                  className="relative w-10 h-[22px] rounded-full transition-colors shrink-0 ml-4"
                  style={{
                    background: showSubtasks ? "var(--accent)" : "var(--bg-hover)",
                  }}
                >
                  <span
                    className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      transform: showSubtasks
                        ? "translateX(18px)"
                        : "translateX(0)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>
            </section>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--border-primary)" }} />

            {/* ─── PROFILE ──────────────────────────────── */}
            <section data-section="profile">
              <div className="mb-6">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Profile
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Update your name and email address.
                </p>
              </div>

              <div
                className="rounded-xl p-5 space-y-4"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                {/* Avatar preview */}
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {name || userName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {email || userEmail}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm rounded-lg outline-none transition-colors"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-primary)",
                      padding: "8px 12px",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-primary)";
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm rounded-lg outline-none transition-colors"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-primary)",
                      padding: "8px 12px",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-primary)";
                    }}
                  />
                </div>

                {profileMessage && (
                  <p
                    className="text-xs"
                    style={{
                      color:
                        profileMessage.type === "success"
                          ? "var(--status-done)"
                          : "var(--priority-critical)",
                    }}
                  >
                    {profileMessage.text}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {profileLoading ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--border-primary)" }} />

            {/* ─── SECURITY ─────────────────────────────── */}
            <section data-section="security">
              <div className="mb-6">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Security
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Update your password to keep your account secure.
                </p>
              </div>

              <div
                className="rounded-xl p-5 space-y-4"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div className="relative">
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Current Password
                  </label>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-sm rounded-lg outline-none transition-colors pr-10"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-primary)",
                      padding: "8px 12px",
                    }}
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
                    className="absolute right-3 top-[30px] p-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="relative">
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    New Password
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full text-sm rounded-lg outline-none transition-colors pr-10"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-primary)",
                      padding: "8px 12px",
                    }}
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
                    className="absolute right-3 top-[30px] p-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {securityMessage && (
                  <p
                    className="text-xs"
                    style={{
                      color:
                        securityMessage.type === "success"
                          ? "var(--status-done)"
                          : "var(--priority-critical)",
                    }}
                  >
                    {securityMessage.text}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handlePasswordChange}
                    disabled={securityLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {securityLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </section>

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
