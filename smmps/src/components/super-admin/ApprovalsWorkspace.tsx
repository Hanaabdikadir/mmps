"use client";

import { ClipboardCheck } from "lucide-react";
import type { DeletedRequestRecord } from "@/lib/company-overrides-types";
import type {
  CompanyRecord,
  RegistrationApprovalStats,
} from "@/lib/super-admin-service";
import { PendingApprovalsPanel } from "@/components/super-admin/PendingApprovalsPanel";

export function ApprovalsWorkspace({
  initialCompanies,
  initialDeletedRequests = [],
  initialStats,
}: {
  initialCompanies: CompanyRecord[];
  initialDeletedRequests?: DeletedRequestRecord[];
  initialStats: RegistrationApprovalStats;
}) {
  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <div className="flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
          <ClipboardCheck className="h-6 w-6 text-white" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Pending Approvals
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Review company and broker registrations, documents, and applicant
            data.
          </p>
        </div>
      </div>

      <PendingApprovalsPanel
        initialCompanies={initialCompanies}
        initialDeletedRequests={initialDeletedRequests}
        initialStats={initialStats}
        hideHeader
      />
    </div>
  );
}
