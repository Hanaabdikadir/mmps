import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPendingApprovalsCount } from "@/lib/super-admin-service";
import { countUnreadNotifications } from "@/lib/system-notifications-store";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminTopbar } from "@/components/super-admin/SuperAdminTopbar";
import { SuperAdminCursorScope } from "@/components/super-admin/SuperAdminCursorScope";
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard";
import { SYSTEM_SHORT } from "@/lib/home-content";
import { LanguageProvider } from "@/lib/language-context";

export const dynamic = "force-dynamic";

async function getShellCounts() {
  try {
    const pending = await getPendingApprovalsCount();
    const unread = await countUnreadNotifications();
    return { pending, unread };
  } catch {
    const pending = await getPendingApprovalsCount().catch(() => 0);
    return { pending, unread: 0 };
  }
}

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const countsPromise = getShellCounts();
  const user = await getCurrentUser("super");
  if (!user) redirect("/login?mode=super-admin");
  if (!isSuperAdmin(user)) redirect("/login?mode=super-admin");

  const { pending, unread } = await countsPromise;
  const photoRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePicture: true },
  });

  return (
    <LanguageProvider forceLang="en" initialLang="en">
      <div className="super-admin-shell fixed inset-0 flex overflow-hidden overscroll-none bg-[#f4f6f5]">
        <SessionIdleGuard loginHref="/login?mode=super-admin" portal="super" />
        <SuperAdminCursorScope />
        <SuperAdminSidebar
          pendingCount={pending}
          notificationCount={unread}
          userEmail={user.email}
          userRole={user.role}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-[280px]">
          <SuperAdminTopbar
            name={user.fullName}
            email={user.email}
            unreadCount={unread}
            photoUrl={photoRow?.profilePicture}
          />
          <main className="w-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-none px-3 py-4 sm:px-6 lg:px-8 xl:px-10">
            {children}
          </main>
          <footer className="shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 text-center text-[11px] font-medium text-slate-400 sm:px-6">
            {SYSTEM_SHORT} — Super Admin Console · {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </LanguageProvider>
  );
}
