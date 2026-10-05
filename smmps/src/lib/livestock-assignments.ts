import { prisma } from "@/lib/prisma";
import { ensureBrokerCode, ensureLivestockCatalog } from "@/lib/livestock-catalog";
import { SECTION_BROKER_EMAILS } from "@/lib/livestock-manager-broker";
import { professionalLivestockMarketLabel } from "@/lib/livestock-registration-markets";
import {
  ALL_LIVESTOCK_TYPES,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";

export function categorySlugFromLivestockSection(
  section: string | null | undefined
): string | null {
  const raw = `${section || ""}`.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) return "geel";
  if (upper.includes("GOAT") || upper.includes("SHEEP") || upper.includes("ARRI") || upper.includes("ARI")) {
    return "arri";
  }
  if (upper.includes("CATTLE") || upper.includes("LODA") || upper.includes("LO'")) return "loda";
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) return raw.toLowerCase();
  return null;
}

export async function assignBrokerFromRegistration(opts: {
  brokerId: number;
  marketId?: number | null;
  marketIds?: number[] | null;
  livestockSection?: string | null;
}) {
  await ensureLivestockCatalog();
  const parts = parseLivestockTypeChoices(opts.livestockSection);
  let categoryIds: number[] = [];

  if (parts.includes(ALL_LIVESTOCK_TYPES)) {
    const all = await prisma.livestockCategory.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    categoryIds = all.map((c) => c.id);
  } else {
    const ids = new Set<number>();
    for (const part of parts) {
      const slug = categorySlugFromLivestockSection(part);
      const raw = part.trim();
      const category = slug
        ? await prisma.livestockCategory.findFirst({
            where: {
              status: "ACTIVE",
              OR: [{ slug }, { name: { equals: raw, mode: "insensitive" } }],
            },
            select: { id: true },
          })
        : await prisma.livestockCategory.findFirst({
            where: {
              status: "ACTIVE",
              OR: [
                { name: { equals: raw, mode: "insensitive" } },
                { nameSomali: { equals: raw, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          });
      if (category) ids.add(category.id);
    }
    categoryIds = [...ids];
  }

  const marketIds = [
    ...new Set(
      (opts.marketIds?.length
        ? opts.marketIds
        : opts.marketId
          ? [opts.marketId]
          : []
      )
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  await syncBrokerAssignments(opts.brokerId, {
    marketIds: marketIds.length ? marketIds : undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
  });
}

export async function syncBrokerAssignments(
  brokerId: number,
  opts: {
    marketIds?: number[];
    categoryIds?: number[];
    livestockTypeIds?: number[];
  }
) {
  if (opts.marketIds) {
    const marketIds = [...new Set(opts.marketIds.map(Number).filter(Number.isFinite))];
    await prisma.livestockBrokerMarket.deleteMany({
      where: { brokerId, marketId: { notIn: marketIds } },
    });
    for (const marketId of marketIds) {
      await prisma.livestockBrokerMarket.upsert({
        where: { brokerId_marketId: { brokerId, marketId } },
        update: {},
        create: { brokerId, marketId },
      });
    }
    await prisma.livestockBroker.update({
      where: { id: brokerId },
      data: { marketId: marketIds[0] ?? null },
    });
  }

  if (opts.categoryIds) {
    const categoryIds = [...new Set(opts.categoryIds.map(Number).filter(Number.isFinite))];
    await prisma.livestockBrokerCategory.deleteMany({
      where: { brokerId, categoryId: { notIn: categoryIds } },
    });
    for (const categoryId of categoryIds) {
      await prisma.livestockBrokerCategory.upsert({
        where: { brokerId_categoryId: { brokerId, categoryId } },
        update: {},
        create: { brokerId, categoryId },
      });
    }

    if (!opts.livestockTypeIds) {
      const types = await prisma.livestockAnimalType.findMany({
        where: { categoryId: { in: categoryIds }, status: "ACTIVE" },
        select: { id: true },
      });
      const typeIds = types.map((t) => t.id);
      await prisma.livestockBrokerAnimalType.deleteMany({
        where: { brokerId, animalTypeId: { notIn: typeIds } },
      });
      for (const animalTypeId of typeIds) {
        await prisma.livestockBrokerAnimalType.upsert({
          where: { brokerId_animalTypeId: { brokerId, animalTypeId } },
          update: {},
          create: { brokerId, animalTypeId },
        });
      }
    }
  }

  if (opts.livestockTypeIds) {
    const livestockTypeIds = [
      ...new Set(opts.livestockTypeIds.map(Number).filter(Number.isFinite)),
    ];
    await prisma.livestockBrokerAnimalType.deleteMany({
      where: { brokerId, animalTypeId: { notIn: livestockTypeIds } },
    });
    for (const animalTypeId of livestockTypeIds) {
      await prisma.livestockBrokerAnimalType.upsert({
        where: { brokerId_animalTypeId: { brokerId, animalTypeId } },
        update: {},
        create: { brokerId, animalTypeId },
      });
    }
  }

  await ensureBrokerCode(brokerId);
}

export async function syncMarketCategories(marketId: number, categoryIds: number[]) {
  const ids = [...new Set(categoryIds.map(Number).filter(Number.isFinite))];
  await prisma.livestockMarketCategory.deleteMany({
    where: { marketId, categoryId: { notIn: ids } },
  });
  for (const categoryId of ids) {
    await prisma.livestockMarketCategory.upsert({
      where: { marketId_categoryId: { marketId, categoryId } },
      update: {},
      create: { marketId, categoryId },
    });
  }
}

export const BROKER_DETAIL_INCLUDE = {
  market: { select: { id: true, name: true, code: true, location: true } },
  assignedMarkets: {
    include: {
      market: {
        select: { id: true, name: true, code: true, location: true, status: true },
      },
    },
  },
  authorizedCategories: {
    include: {
      category: { select: { id: true, slug: true, name: true, nameSomali: true } },
    },
  },
  authorizedTypes: {
    include: {
      animalType: {
        select: {
          id: true,
          name: true,
          nameSomali: true,
          categoryId: true,
          slug: true,
          status: true,
        },
      },
    },
  },
  users: {
    where: { deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      profilePicture: true,
      role: true,
      status: true,
      accountStatus: true,
      createdAt: true,
      marketId: true,
      market: { select: { id: true, name: true, code: true, location: true } },
    },
    take: 20,
  },
  _count: { select: { users: true, livestockPrices: true } },
  subscriptions: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { plan: { select: { name: true } } },
  },
};

function isSectionLeadEmail(email?: string | null) {
  return (SECTION_BROKER_EMAILS as readonly string[]).includes(
    (email || "").trim().toLowerCase()
  );
}

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

export function serializeBroker<T extends Record<string, unknown>>(broker: T) {
  const assigned = broker as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    market?: { id: number; name: string } | null;
    assignedMarkets?: { market: { id: number; name: string } | null }[];
    authorizedCategories?: { category: unknown }[];
    authorizedTypes?: { animalType: unknown }[];
    users?: {
      fullName: string;
      email: string;
      phone?: string | null;
      market?: { id: number; name: string } | null;
    }[];
  };

  const person =
    (assigned.users || []).find((user) => !isSectionLeadEmail(user.email) && user.fullName.trim()) ||
    (assigned.users || []).find((user) => user.email.toLowerCase() === (assigned.email || "").toLowerCase()) ||
    (assigned.users || [])[0];

  const markets: { id: number; name: string }[] = [];
  const addMarket = (market?: { id: number; name: string } | null) => {
    if (!market?.id || isPlaceholderMarketName(market.name)) return;
    if (markets.some((row) => row.id === market.id)) return;
    markets.push({
      id: market.id,
      name: professionalLivestockMarketLabel(market.name) || market.name,
    });
  };
  addMarket(person?.market);
  for (const user of assigned.users || []) addMarket(user.market);
  for (const row of assigned.assignedMarkets || []) addMarket(row.market);
  addMarket(assigned.market);

  const displayName = (
    person?.fullName.trim() ||
    String(assigned.name || "").replace(/\s*[—–-]\s*.*market section.*$/i, "").trim() ||
    assigned.name ||
    "Livestock Broker"
  );

  return {
    ...broker,
    name: displayName,
    email: person?.email || assigned.email || null,
    phone: person?.phone || assigned.phone || null,
    markets,
    categories: assigned.authorizedCategories?.map((row) => row.category) ?? [],
    animalTypes: assigned.authorizedTypes?.map((row) => row.animalType) ?? [],
  };
}
