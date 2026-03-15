import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getUserAppearance } from "@/lib/user-prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager Pro",
  description: "A full-featured task manager with List, Kanban, Calendar, and Timeline views.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // DB is the source of truth for signed-in users
  const prefs = await getUserAppearance();

  // Fall back to cookies for unauthenticated pages (login/register)
  let theme = prefs?.theme;
  let accent = prefs?.accentColor;

  if (!prefs) {
    const cookieStore = await cookies();
    theme = cookieStore.get("theme")?.value;
    accent = cookieStore.get("accentColor")?.value;
  }

  return (
    <html
      lang="en"
      className={theme === "light" ? "light" : undefined}
      data-accent={accent || undefined}
      suppressHydrationWarning
    >
      <head />
      <body>{children}</body>
    </html>
  );
}
