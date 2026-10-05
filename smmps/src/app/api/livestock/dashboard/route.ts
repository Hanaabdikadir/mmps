import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { ensureLivestockCatalog, backfillLivestockAssignments, ensureLivestockPermissions } from "@/lib/livestock-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  try {
  await ensureLivestockPermissions();
  await ensureLivestockCatalog();
  await backfillLivestockAssignments();

  const [
    totalBrokers,
    activeBrokers,
    suspendedBrokers,
    inactiveBrokers,
    pendingBrokers,
    totalMarkets,
    totalReports,
    categories,
    recentPrices,
  ] = await Promise.all([
    prisma.livestockBroker.count({ where: { deletedAt: null } }),
    prisma.livestockBroker.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.livestockBroker.count({ where: { deletedAt: null, status: "SUSPENDED" } }),
    prisma.livestockBroker.count({ where: { deletedAt: null, status: "INACTIVE" } }),
    prisma.livestockBroker.count({
      where: { deletedAt: null, approvalStatus: "PENDING" },
    }),
    prisma.market.count({
      where: { deletedAt: null, marketType: "LIVESTOCK" },
    }),
    prisma.livestockPrice.count({ where: { deletedAt: null } }),
    prisma.livestockCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        nameSomali: true,
        _count: { select: { brokers: true, prices: true } },
      },
    }),
    prisma.livestockPrice.findMany({
      where: { deletedAt: null },
      include: {
        broker: { select: { id: true, name: true, code: true } },
        market: { select: { id: true, name: true } },
        livestockCategory: { select: { id: true, name: true, slug: true } },
        livestockType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const marketActivity = await prisma.market.findMany({
    where: { deletedAt: null, marketType: "LIVESTOCK" },
    select: {
      id: true,
      name: true,
      location: true,
      status: true,
      _count: {
        select: {
          livestockBrokerLinks: true,
          livestockPrices: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: 12,
  });

  return jsonOk({
    kpis: {
      totalBrokers,
      activeBrokers,
      suspendedBrokers,
      inactiveBrokers,
      pendingBrokers,
      totalMarkets,
      totalReports,
      categoryBrokers: Object.fromEntries(
        categories.map((c) => [c.slug, c._count.brokers])
      ),
    },
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameSomali: c.nameSomali,
      brokers: c._count.brokers,
      prices: c._count.prices,
    })),
    recentPrices: recentPrices.map((p) => ({
      id: p.id,
      price: Number(p.price),
      currency: p.currency,
      status: p.status,
      dateRecorded: p.dateRecorded,
      createdAt: p.createdAt,
      broker: p.broker,
      market: p.market,
      category: p.livestockCategory,
      animalType: p.livestockType,
      fallbackCategory: p.category,
      animalTypeEnum: p.animalType,
    })),
    marketActivity,
  });
  } catch (error) {
    console.error("[api/livestock/dashboard GET]", error);
    return jsonError("Could not load livestock dashboard", 500);
  }
}
