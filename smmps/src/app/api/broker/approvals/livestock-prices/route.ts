import { requireAuth, jsonError } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Livestock Manager approval API retired.
 * Use Super Admin → Livestock Prices (`/api/livestock-prices`).
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return jsonError(
    "Livestock Manager approvals removed. Use Super Admin → Livestock Prices.",
    403
  );
}
