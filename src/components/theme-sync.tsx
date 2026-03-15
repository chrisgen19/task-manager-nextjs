"use client";

import { useEffect } from "react";
import { setTheme, type Theme } from "@/components/theme-toggle";

interface ThemeSyncProps {
  theme: Theme;
  accentColor: string;
}

function setAccentCookie(accent: string) {
  document.cookie = `accentColor=${accent};path=/;max-age=31536000;SameSite=Lax`;
}

export function setAccentColor(accent: string) {
  localStorage.setItem("accentColor", accent);
  setAccentCookie(accent);
  document.documentElement.setAttribute("data-accent", accent);
}

/**
 * Syncs the signed-in user's DB-stored theme and accent color
 * to localStorage, cookies, and the DOM, making the DB the source of truth.
 * Runs once on mount to correct any stale values from a previous session.
 */
export function ThemeSync({ theme, accentColor }: ThemeSyncProps) {
  useEffect(() => {
    const currentTheme = localStorage.getItem("theme") ?? "dark";
    if (currentTheme !== theme) {
      setTheme(theme);
    }

    const currentAccent = localStorage.getItem("accentColor") ?? "blue";
    if (currentAccent !== accentColor) {
      setAccentColor(accentColor);
    }
  }, [theme, accentColor]);

  return null;
}
