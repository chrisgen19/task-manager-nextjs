import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAppearance } from "@/lib/user-prefs";
import SessionProvider from "@/components/session-provider";
import { ThemeSync } from "@/components/theme-sync";
import type { Theme } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Reuses the same cached query from root layout (no duplicate DB call)
  const prefs = await getUserAppearance();

  return (
    <SessionProvider session={session}>
      <ThemeSync
        theme={(prefs?.theme ?? "dark") as Theme}
        accentColor={prefs?.accentColor ?? "blue"}
      />
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        {children}
      </div>
    </SessionProvider>
  );
}
