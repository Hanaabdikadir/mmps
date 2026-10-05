import { Settings } from "lucide-react";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { SettingsPanel } from "@/components/super-admin/SettingsPanel";
import { SuperAdminProfilePhoto } from "@/components/super-admin/SuperAdminProfilePhoto";
import { getSystemSettings } from "@/lib/system-settings-store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) redirect("/login?mode=super-admin");

  const system = await getSystemSettings();
  const photoRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePicture: true },
  });
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <AdminPageHeader
        title="Settings"
        subtitle="Super Admin Account — login, profile picture, and system contact details."
        icon={Settings}
      />
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4">
        <SuperAdminProfilePhoto
          initials={initials || "SA"}
          photoUrl={photoRow?.profilePicture}
        />
        <div>
          <p className="text-sm font-black text-slate-900">Profile picture</p>
          <p className="text-xs font-medium text-slate-400">
            Click the camera to upload PNG, JPEG, WEBP, or GIF (max 5 MB).
          </p>
        </div>
      </div>
      <SettingsPanel
        initialAccount={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          password: "",
          role: user.role,
        }}
        initialSystem={system}
      />
    </div>
  );
}
