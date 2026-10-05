import { prisma } from "@/lib/prisma";
import { getCurrentUser, isLivestockBroker } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-guard";
import { getActiveSubscriptionForAccount } from "@/lib/subscriptions";
import { getBrokerPlanLimits } from "@/lib/livestock-scope";
import { syncBrokerAssignments } from "@/lib/livestock-assignments";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isLivestockBroker(user)) return jsonError("Forbidden", 403);

  const subscription = user.brokerId
    ? await getActiveSubscriptionForAccount({ brokerId: user.brokerId })
    : null;

  let broker = null;
  if (user.brokerId) {
    broker = await prisma.livestockBroker.findFirst({
      where: { id: user.brokerId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        livestockFocus: true,
        status: true,
      },
    });
  }

  const slots = user.brokerId ? await brokerSlots(user.brokerId) : null;
  return jsonOk({ subscription, broker, slots });
}

async function brokerSlots(brokerId: number) {
  const limits = await getBrokerPlanLimits(brokerId);
  const assignedMarkets = await prisma.livestockBrokerMarket.findMany({
    where: { brokerId },
    select: { market: { select: { id: true, name: true } } },
  });
  const assignedTypes = await prisma.livestockBrokerCategory.findMany({
    where: { brokerId },
    select: { category: { select: { id: true, name: true } } },
  });
  const markets = await prisma.market.findMany({
    where: { status: "ACTIVE", deletedAt: null, marketType: "LIVESTOCK" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const types = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return {
    maxMarkets: limits.maxMarkets,
    maxLivestockTypes: limits.maxLivestockTypes,
    markets: assignedMarkets.map((row) => row.market),
    types: assignedTypes.map((row) => row.category),
    availableMarkets: markets,
    availableTypes: types,
  };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isLivestockBroker(user) || !user.brokerId) return jsonError("Forbidden", 403);

  const body = (await req.json().catch(() => null)) as {
    marketId?: number;
    categoryId?: number;
  } | null;
  const slots = await brokerSlots(user.brokerId);
  const marketIds = slots.markets.map((m) => m.id);
  const typeIds = slots.types.map((t) => t.id);

  if (body?.marketId) {
    const id = Number(body.marketId);
    if (marketIds.includes(id)) return jsonOk({ slots });
    if (slots.maxMarkets != null && marketIds.length >= slots.maxMarkets) {
      return jsonError("Market limit reached", 400);
    }
    if (!slots.availableMarkets.some((m) => m.id === id)) {
      return jsonError("Unknown market", 400);
    }
    marketIds.push(id);
  }

  if (body?.categoryId) {
    const id = Number(body.categoryId);
    if (typeIds.includes(id)) return jsonOk({ slots });
    if (slots.maxLivestockTypes != null && typeIds.length >= slots.maxLivestockTypes) {
      return jsonError("Type limit reached", 400);
    }
    if (!slots.availableTypes.some((t) => t.id === id)) {
      return jsonError("Unknown type", 400);
    }
    typeIds.push(id);
  }

  await syncBrokerAssignments(user.brokerId, {
    marketIds,
    categoryIds: typeIds,
  });
  return jsonOk({ slots: await brokerSlots(user.brokerId) });
}
