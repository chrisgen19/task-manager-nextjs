"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

let currentTheme: Theme = "dark";
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners = [...listeners, onStoreChange];
  return () => {
    listeners = listeners.filter((l) => l !== onStoreChange);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function setTheme(theme: Theme) {
  currentTheme = theme;
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.classList.toggle("light", theme === "light");
  emitChange();
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ThemeToggle() {
  const theme = useTheme();

  // Sync in-memory store with DOM on hydration
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    currentTheme = isLight ? "light" : "dark";
    emitChange();
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return (
    <button
      onClick={toggle}
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
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
