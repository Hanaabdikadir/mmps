import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export const dynamic = "force-dynamic";

export default async function CompanyNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <NotificationCenter canMessageSuperAdmin currentUserId={user.id} />
  );
}
