import { prisma } from "@/lib/prisma";

export function isLivestockBrokerRole(role?: string | null) {
  return role === "LIVESTOCK_BROKER_USER";
}

export function marketNamesFromBroker(broker: {
  name?: string | null;
  market?: { name: string } | null;
  assignedMarkets?: { market: { name: string; deletedAt: Date | null } | null }[];
} | null | undefined) {
  const names = new Set<string>();
  if (broker?.market?.name?.trim()) names.add(broker.market.name.trim());
  for (const row of broker?.assignedMarkets || []) {
    if (row.market && !row.market.deletedAt && row.market.name.trim()) {
      names.add(row.market.name.trim());
    }
  }
  return [...names];
}

export async function livestockBrokerChatMeta(userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      brokerId: true,
      companyName: true,
      broker: {
        select: {
          name: true,
          market: { select: { name: true } },
          assignedMarkets: {
            include: {
              market: { select: { name: true, deletedAt: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return null;
  const markets = marketNamesFromBroker(user.broker);
  const marketLabel =
    markets.join(" · ") ||
    user.companyName?.trim() ||
    user.broker?.name?.trim() ||
    "Suuq lama cayimin";
  return {
    userId: user.id,
    name: user.fullName,
    email: user.email,
    marketLabel,
    isBroker: Boolean(user.brokerId) || isLivestockBrokerRole(user.role),
  };
}
