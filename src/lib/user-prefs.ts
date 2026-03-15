import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface UserAppearance {
  theme: string;
  accentColor: string;
}

/**
 * Fetches the signed-in user's appearance preferences (theme, accentColor).
 * Wrapped with React `cache()` so it deduplicates within a single request
 * (e.g. root layout + dashboard layout both call it).
 * Returns null if not authenticated.
 */
export const getUserAppearance = cache(async (): Promise<UserAppearance | null> => {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { theme: true, accentColor: true },
    });

    return user ? { theme: user.theme, accentColor: user.accentColor } : null;
  } catch {
    return null;
  }
});
