import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SessionProvider from "@/components/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        {children}
      </div>
    </SessionProvider>
  );
}
