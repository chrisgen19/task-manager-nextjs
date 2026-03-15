import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SessionProvider from "@/components/session-provider";
import { ThemeSync } from "@/components/theme-sync";
import type { Theme } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userPrefs = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { theme: true, accentColor: true },
  });

  return (
    <SessionProvider session={session}>
      <ThemeSync theme={userPrefs.theme as Theme} accentColor={userPrefs.accentColor} />
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        {children}
      </div>
    </SessionProvider>
  );
}
