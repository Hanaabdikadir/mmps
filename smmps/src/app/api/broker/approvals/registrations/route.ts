import { requireAuth, jsonError } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Livestock Manager / broker registration approval API retired.
 * Use Super Admin → Pending Approvals (`/api/super-admin/companies`).
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return jsonError(
    "Broker registration approvals moved to Super Admin → Pending Approvals.",
    403
  );
}

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return jsonError(
    "Broker registration approvals moved to Super Admin → Pending Approvals.",
    403
  );
}
