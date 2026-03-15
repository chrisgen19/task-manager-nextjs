"use client";

import { useEffect } from "react";
import { setTheme, type Theme } from "@/components/theme-toggle";

interface ThemeSyncProps {
  theme: Theme;
  accentColor: string;
}

/**
 * Syncs the signed-in user's DB-stored theme and accent color
 * to localStorage and the DOM, making the DB the source of truth.
 * Runs once on mount to correct any stale localStorage values
 * (e.g. from a different user on a shared browser).
 */
export function ThemeSync({ theme, accentColor }: ThemeSyncProps) {
  useEffect(() => {
    const currentTheme = localStorage.getItem("theme") ?? "dark";
    if (currentTheme !== theme) {
      setTheme(theme);
    }

    const currentAccent = localStorage.getItem("accentColor") ?? "blue";
    if (currentAccent !== accentColor) {
      localStorage.setItem("accentColor", accentColor);
      document.documentElement.setAttribute("data-accent", accentColor);
    }
  }, [theme, accentColor]);

  return null;
}
