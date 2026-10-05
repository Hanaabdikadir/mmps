import {
  getDeletedRegistrationRequests,
  getManagedCompaniesAsync,
  getRegistrationApprovalStats,
} from "@/lib/super-admin-service";
import { ApprovalsWorkspace } from "@/components/super-admin/ApprovalsWorkspace";

export const dynamic = "force-dynamic";

export default async function PendingApprovalsPage() {
  const [companies, deletedRequests, stats] = await Promise.all([
    getManagedCompaniesAsync(),
    getDeletedRegistrationRequests(),
    getRegistrationApprovalStats(),
  ]);

  return (
    <ApprovalsWorkspace
      initialCompanies={companies}
      initialDeletedRequests={deletedRequests}
      initialStats={stats}
    />
  );
}
