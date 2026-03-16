import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clear Jira metadata from tasks to prevent cross-site ID collisions
  // if the user later connects a different Jira site. Synced tasks remain
  // as local tasks — only the Jira linkage is removed.
  await db.$transaction([
    db.task.updateMany({
      where: { userId: session.user.id, jiraIssueId: { not: null } },
      data: { jiraIssueId: null, jiraIssueKey: null, jiraSyncedAt: null },
    }),
    db.jiraConnection.deleteMany({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
