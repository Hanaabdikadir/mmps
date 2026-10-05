import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { getSmlpmsDashboardStats } from "@/lib/smlpms-dashboard";
import { SmlpmsDashboard } from "@/components/super-admin/SmlpmsDashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const user = await getCurrentUser("super");
  if (!user) redirect("/login?mode=super-admin");
  if (!isSuperAdmin(user)) redirect("/login?mode=super-admin");

  const stats = await getSmlpmsDashboardStats();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          System overview for {user.fullName}
        </p>
      </div>
      <SmlpmsDashboard stats={JSON.parse(JSON.stringify(stats))} />
    </div>
  );
}
