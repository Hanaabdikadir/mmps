/**
 * Align each livestock broker to their plan limits:
 *   free → 1 market + 1 livestock type
 *   3 mo → 2 markets + 2 types
 *   6 mo → 3 markets + 3 types
 *   1 yr → all (null)
 * Set registration / subscription start to 1 Jan 2026.
 *
 * Run: npx tsx scripts/align-broker-plan-scopes-2026.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REG_DATE = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));

const FOCUS_BY_SLUG: Record<string, string> = {
  geel: "Camel Market Section",
  loda: "Cattle Market Section",
  arri: "Goat Market Section",
};

function focusFromSlugs(slugs: string[]): string {
  return slugs
    .map((s) => FOCUS_BY_SLUG[s])
    .filter(Boolean)
    .join("|");
}

async function main() {
  const markets = await prisma.market.findMany({
    where: { deletedAt: null, marketType: "LIVESTOCK", status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  if (markets.length < 1) throw new Error("No livestock markets");

  const cats = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE", slug: { in: ["geel", "loda", "arri"] } },
    select: { id: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  const brokers = await prisma.livestockBroker.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    include: {
      assignedMarkets: true,
      authorizedCategories: true,
      subscriptions: {
        include: { plan: true },
        orderBy: { id: "desc" },
        take: 1,
      },
      users: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { id: "asc" },
  });

  /**
   * Preferred markets / categories per broker (respecting current focus),
   * then fill up to plan max.
   */
  const preferred: Record<
    number,
    { marketIds: number[]; categorySlugs: string[] }
  > = {
    // Free — 1+1
    22: { marketIds: [10], categorySlugs: ["geel"] }, // Hana
    23: { marketIds: [7], categorySlugs: ["loda"] }, // Mohamed
    24: { marketIds: [6], categorySlugs: ["arri"] }, // zahra
    // 3 months — 2+2
    25: { marketIds: [8, 9], categorySlugs: ["loda", "arri"] }, // elhan
    27: { marketIds: [8, 7], categorySlugs: ["geel", "loda"] }, // ahmed
    // 6 months — 3+3
    26: { marketIds: [9, 6, 10], categorySlugs: ["geel", "loda", "arri"] }, // ismahaan
  };

  const summary: unknown[] = [];

  for (const broker of brokers) {
    const sub = broker.subscriptions[0];
    const plan = sub?.plan;
    if (!plan) {
      summary.push({ brokerId: broker.id, name: broker.name, skipped: "no plan" });
      continue;
    }

    const maxMarkets = plan.maxMarkets;
    const maxTypes = plan.maxLivestockTypes;
    const marketLimit =
      maxMarkets == null || maxMarkets <= 0 ? markets.length : maxMarkets;
    const typeLimit =
      maxTypes == null || maxTypes <= 0 ? cats.length : maxTypes;

    const pref = preferred[broker.id] ?? {
      marketIds: broker.marketId ? [broker.marketId] : [markets[0]!.id],
      categorySlugs: ["geel"],
    };

    // Build market list up to limit
    const marketIds: number[] = [];
    for (const id of pref.marketIds) {
      if (marketIds.length >= marketLimit) break;
      if (markets.some((m) => m.id === id) && !marketIds.includes(id)) {
        marketIds.push(id);
      }
    }
    for (const m of markets) {
      if (marketIds.length >= marketLimit) break;
      if (!marketIds.includes(m.id)) marketIds.push(m.id);
    }

    // Build category list up to limit
    const categorySlugs: string[] = [];
    for (const slug of pref.categorySlugs) {
      if (categorySlugs.length >= typeLimit) break;
      if (catBySlug.has(slug) && !categorySlugs.includes(slug)) {
        categorySlugs.push(slug);
      }
    }
    for (const c of cats) {
      if (categorySlugs.length >= typeLimit) break;
      if (!categorySlugs.includes(c.slug)) categorySlugs.push(c.slug);
    }

    const categoryIds = categorySlugs
      .map((s) => catBySlug.get(s)?.id)
      .filter((id): id is number => typeof id === "number");

    const primaryMarketId = marketIds[0]!;
    const livestockFocus = focusFromSlugs(categorySlugs);

    // Reset market assignments
    await prisma.livestockBrokerMarket.deleteMany({
      where: { brokerId: broker.id },
    });
    await prisma.livestockBrokerMarket.createMany({
      data: marketIds.map((marketId) => ({
        brokerId: broker.id,
        marketId,
      })),
    });

    // Reset category authorizations
    await prisma.livestockBrokerCategory.deleteMany({
      where: { brokerId: broker.id },
    });
    await prisma.livestockBrokerCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        brokerId: broker.id,
        categoryId,
      })),
    });

    // Registration date + primary market + focus
    await prisma.livestockBroker.update({
      where: { id: broker.id },
      data: {
        marketId: primaryMarketId,
        livestockFocus,
        createdAt: REG_DATE,
        updatedAt: REG_DATE,
      },
    });

    // User registration date
    for (const u of broker.users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { createdAt: REG_DATE, updatedAt: REG_DATE },
      });
    }

    // Subscription window from 1 Jan 2026
    const expiry = new Date(REG_DATE);
    expiry.setUTCDate(expiry.getUTCDate() + plan.durationDays);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        startDate: REG_DATE,
        expiryDate: expiry,
        status: "ACTIVE",
        updatedAt: REG_DATE,
      },
    });

    summary.push({
      brokerId: broker.id,
      name: broker.name,
      plan: plan.name,
      maxMarkets: plan.maxMarkets,
      maxLivestockTypes: plan.maxLivestockTypes,
      markets: marketIds.map(
        (id) => markets.find((m) => m.id === id)?.name ?? id
      ),
      livestock: categorySlugs,
      registeredAt: REG_DATE.toISOString().slice(0, 10),
      subscription: {
        start: REG_DATE.toISOString().slice(0, 10),
        expiry: expiry.toISOString().slice(0, 10),
      },
    });
  }

  // Align plan card copy with actual maxMarkets / maxLivestockTypes
  await prisma.subscriptionPlan.updateMany({
    where: { id: 31 }, // free
    data: {
      description: "Free: 1 market and 1 livestock type.",
      name: "Livestock · Free",
    },
  });
  await prisma.subscriptionPlan.updateMany({
    where: { name: "Livestock · 3 Months" },
    data: {
      description:
        "$2.75/month × 3 = $8.25. Includes 2 markets and 2 livestock types.",
    },
  });
  await prisma.subscriptionPlan.updateMany({
    where: { name: "Livestock · 6 Months" },
    data: {
      description:
        "$2.50/month × 6 = $15. Includes 3 markets and 3 livestock types.",
    },
  });
  await prisma.subscriptionPlan.updateMany({
    where: { name: "Livestock · 1 Year" },
    data: {
      description:
        "$2.25/month × 12 = $27. All markets and all livestock types.",
    },
  });

  console.log(JSON.stringify({ summary }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
