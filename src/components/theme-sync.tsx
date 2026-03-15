"use client";

import { useEffect } from "react";
import { setTheme, type Theme } from "@/components/theme-toggle";

interface ThemeSyncProps {
  theme: Theme;
  accentColor: string;
}

export function setAccentColor(accent: string) {
  document.cookie = `accentColor=${accent};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.setAttribute("data-accent", accent);
}

/**
 * Syncs the signed-in user's DB-stored theme and accent color
 * to cookies and the DOM. Runs on mount to ensure the client-side
 * state matches the server-rendered values from the DB.
 */
export function ThemeSync({ theme, accentColor }: ThemeSyncProps) {
  useEffect(() => {
    setTheme(theme);
    setAccentColor(accentColor);
  }, [theme, accentColor]);

  return null;
}
