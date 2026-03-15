import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsPage } from "@/components/settings-page";

export default async function Settings() {
  const session = await auth();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      showSubtasks: true,
      accentColor: true,
    },
  });

  return (
    <SettingsPage
      userName={user.name}
      userEmail={user.email}
      showSubtasks={user.showSubtasks}
      accentColor={user.accentColor}
    />
  );
}
