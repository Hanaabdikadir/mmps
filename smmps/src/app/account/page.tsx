import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activateApprovedApplicant } from "@/lib/activate-approved-applicant";
import { AccountProgressDashboard } from "@/components/auth/AccountProgressDashboard";

export const dynamic = "force-dynamic";

/**
 * Track dashboard is for PENDING / REJECTED applicants only.
 * Approved users are activated and sent to their real portal — never shown here.
 */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  if (String(user.status).toUpperCase() === "APPROVED") {
    const activated = await activateApprovedApplicant({
      userId: user.id,
      email: user.email,
    });
    redirect(activated.redirectTo || "/login");
  }

  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center bg-[#eef3f1]">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        </div>
      }
    >
      <AccountProgressDashboard />
    </Suspense>
  );
}
