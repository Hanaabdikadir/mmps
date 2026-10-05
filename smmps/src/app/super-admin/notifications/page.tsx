import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSystemNotifications } from "@/lib/super-admin-service";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { NotificationsPanel } from "@/components/super-admin/NotificationsPanel";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser("super");
  const notifications = await getSystemNotifications(100);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <AdminPageHeader
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"} across the system.`
            : "Real-time alerts for registrations, approvals, and price updates."
        }
        icon={Bell}
      />
      <NotificationsPanel
        initialNotifications={notifications}
        currentUserId={user?.id ?? 0}
      />
    </div>
  );
}
