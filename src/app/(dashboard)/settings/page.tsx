import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsPage } from "@/components/settings-page";

export default async function Settings() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, jiraConnection, workboards] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        showSubtasks: true,
        accentColor: true,
      },
    }),
    db.jiraConnection.findUnique({
      where: { userId },
      select: { id: true, cloudName: true, connectedAt: true },
    }),
    db.workboard.findMany({
      where: { userId },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SettingsPage
      userName={user.name}
      userEmail={user.email}
      showSubtasks={user.showSubtasks}
      accentColor={user.accentColor}
      jiraConnection={
        jiraConnection
          ? {
              id: jiraConnection.id,
              cloudName: jiraConnection.cloudName,
              connectedAt: jiraConnection.connectedAt.toISOString(),
            }
          : null
      }
      workboards={workboards}
    />
  );
}
