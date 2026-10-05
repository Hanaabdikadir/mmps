import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";

/** Broker with several markets picks the one shown on the public page. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!auth.user.brokerId) return jsonError("Broker account required", 403);

  const body = await request.json().catch(() => ({}));
  const marketId = Number(body.marketId);
  if (!Number.isFinite(marketId)) return jsonError("marketId is required");

  const assigned = await prisma.livestockBrokerMarket.findUnique({
    where: { brokerId_marketId: { brokerId: auth.user.brokerId, marketId } },
  });
  if (!assigned) return jsonError("You are not assigned to this market", 403);

  await prisma.livestockBroker.update({
    where: { id: auth.user.brokerId },
    data: { marketId },
  });

  return jsonOk({ marketId });
}
