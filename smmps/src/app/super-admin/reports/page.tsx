import { FileText } from "lucide-react";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { SuperAdminReportsWorkspace } from "@/components/super-admin/SuperAdminReportsWorkspace";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-none space-y-6">
      <AdminPageHeader
        title="Reports & Analytics"
        icon={FileText}
      />
      <SuperAdminReportsWorkspace />
    </div>
  );
}
