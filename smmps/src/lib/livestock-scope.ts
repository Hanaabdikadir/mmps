import type { AuthUser } from "@/lib/auth";
import { isLivestockBroker, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { animalTypeFromLivestockSection } from "@/lib/promote-broker";
import { categorySlugFromAnimal, isRetiredLivestockType } from "@/lib/livestock-section-prices";
import {
  ALL_LIVESTOCK_TYPES,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";
import { categorySlugFromLivestockSection } from "@/lib/livestock-assignments";

export type BrokerScope = {
  brokerId: number;
  marketIds: number[];
  categoryIds: number[];
  livestockTypeIds: number[];
  markets: { id: number; name: string; code: string | null; location: string | null; status: string }[];
  categories: {
    id: number;
    slug: string;
    name: string;
    nameSomali: string | null;
    species: string;
  }[];
  animalTypes: {
    id: number;
    categoryId: number;
    slug: string;
    name: string;
    nameSomali: string | null;
    unit: string | null;
    legacyAnimalType: string;
    status: string;
  }[];
  usedFallback: boolean;
};

function uniqueNums(values: Array<number | null | undefined>) {
  return [...new Set(values.filter((v): v is number => Number.isFinite(v as number)))];
}

/** Active subscription plan limits for a broker (null = unlimited). */
export async function getBrokerPlanLimits(brokerId: number): Promise<{
  maxMarkets: number | null;
  maxLivestockTypes: number | null;
  hasActivePlan: boolean;
}> {
  const { getActiveSubscriptionForAccount } = await import("@/lib/subscriptions");
  const sub = await getActiveSubscriptionForAccount({ brokerId });
  if (!sub?.plan) {
    return { maxMarkets: 1, maxLivestockTypes: 1, hasActivePlan: false };
  }
  return {
    maxMarkets: sub.plan.maxMarkets,
    maxLivestockTypes: sub.plan.maxLivestockTypes,
    hasActivePlan: true,
  };
}

async function allLivestockMarkets() {
  return prisma.market.findMany({
    where: { deletedAt: null, status: "ACTIVE", marketType: "LIVESTOCK" },
    select: { id: true, name: true, code: true, location: true, status: true },
    orderBy: { name: "asc" },
  });
}

async function allLivestockCategoriesWithTypes() {
  return prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    include: {
      animalTypes: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

/** Resolve markets / categories / animal types a broker may report. */
export async function getBrokerScope(brokerId: number): Promise<BrokerScope | null> {
  const broker = await prisma.livestockBroker.findFirst({
    where: { id: brokerId, deletedAt: null },
    include: {
      market: { select: { id: true, name: true, code: true, location: true, status: true } },
      assignedMarkets: {
        include: {
          market: {
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      },
      authorizedCategories: {
        include: { category: true },
      },
      authorizedTypes: {
        include: { animalType: true },
      },
    },
  });
  if (!broker) return null;

  const limits = await getBrokerPlanLimits(brokerId);
  const unlimitedMarkets = limits.hasActivePlan && limits.maxMarkets == null;
  const unlimitedTypes = limits.hasActivePlan && limits.maxLivestockTypes == null;

  let markets = broker.assignedMarkets
    .map((row) => row.market)
    .filter((m) => m && !m.deletedAt)
    .map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      location: m.location,
      status: m.status,
    }));

  if (!markets.length && broker.market) {
    markets = [
      {
        id: broker.market.id,
        name: broker.market.name,
        code: broker.market.code,
        location: broker.market.location,
        status: broker.market.status,
      },
    ];
  }

  // Plan markets: unlimited = all; limited = registered assignment only (never invent extras).
  if (unlimitedMarkets) {
    markets = await allLivestockMarkets();
  } else if (limits.hasActivePlan && limits.maxMarkets != null) {
    const max = Math.max(1, limits.maxMarkets);
    if (markets.length > max) {
      markets = markets.slice(0, max);
    }
  }

  let categories = broker.authorizedCategories.map((row) => ({
    id: row.category.id,
    slug: row.category.slug,
    name: row.category.name,
    nameSomali: row.category.nameSomali,
    species: row.category.species,
  }));

  let animalTypes = broker.authorizedTypes
    .filter((row) => row.animalType.status === "ACTIVE")
    .map((row) => ({
      id: row.animalType.id,
      categoryId: row.animalType.categoryId,
      slug: row.animalType.slug,
      name: row.animalType.name,
      nameSomali: row.animalType.nameSomali,
      unit: row.animalType.unit,
      legacyAnimalType: row.animalType.legacyAnimalType,
      status: row.animalType.status,
    }));

  let usedFallback = false;

  // Unlimited livestock types: camel + cattle + sheep/goats (and all named types).
  if (unlimitedTypes) {
    usedFallback = true;
    const all = await allLivestockCategoriesWithTypes();
    categories = all.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameSomali: c.nameSomali,
      species: c.species,
    }));
    animalTypes = all.flatMap((c) =>
      c.animalTypes.map((t) => ({
        id: t.id,
        categoryId: t.categoryId,
        slug: t.slug,
        name: t.name,
        nameSomali: t.nameSomali,
        unit: t.unit,
        legacyAnimalType: t.legacyAnimalType,
        status: t.status,
      }))
    );
  } else if (!categories.length) {
    usedFallback = true;
    const parts = parseLivestockTypeChoices(broker.livestockFocus);
    const slugs = parts.includes(ALL_LIVESTOCK_TYPES)
      ? []
      : parts
          .map((part) => categorySlugFromLivestockSection(part))
          .filter((slug): slug is string => Boolean(slug));

    if (parts.includes(ALL_LIVESTOCK_TYPES)) {
      const all = await allLivestockCategoriesWithTypes();
      categories = all.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameSomali: c.nameSomali,
        species: c.species,
      }));
      if (!animalTypes.length) {
        animalTypes = all.flatMap((c) =>
          c.animalTypes.map((t) => ({
            id: t.id,
            categoryId: t.categoryId,
            slug: t.slug,
            name: t.name,
            nameSomali: t.nameSomali,
            unit: t.unit,
            legacyAnimalType: t.legacyAnimalType,
            status: t.status,
          }))
        );
      }
    } else if (slugs.length) {
      const found = await prisma.livestockCategory.findMany({
        where: { status: "ACTIVE", slug: { in: slugs } },
        include: {
          animalTypes: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      });
      categories = found.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameSomali: c.nameSomali,
        species: c.species,
      }));
      if (!animalTypes.length) {
        animalTypes = found.flatMap((c) =>
          c.animalTypes.map((t) => ({
            id: t.id,
            categoryId: t.categoryId,
            slug: t.slug,
            name: t.name,
            nameSomali: t.nameSomali,
            unit: t.unit,
            legacyAnimalType: t.legacyAnimalType,
            status: t.status,
          }))
        );
      }
    } else {
      const slug = categorySlugFromAnimal(
        animalTypeFromLivestockSection(broker.livestockFocus) ||
          animalTypeFromLivestockSection(broker.name) ||
          "CATTLE"
      );
      const fallback = await prisma.livestockCategory.findUnique({
        where: { slug },
        include: { animalTypes: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } } },
      });
      if (fallback) {
        categories = [
          {
            id: fallback.id,
            slug: fallback.slug,
            name: fallback.name,
            nameSomali: fallback.nameSomali,
            species: fallback.species,
          },
        ];
        if (!animalTypes.length) {
          animalTypes = fallback.animalTypes.map((t) => ({
            id: t.id,
            categoryId: t.categoryId,
            slug: t.slug,
            name: t.name,
            nameSomali: t.nameSomali,
            unit: t.unit,
            legacyAnimalType: t.legacyAnimalType,
            status: t.status,
          }));
        }
      }
    }
  } else if (!animalTypes.length) {
    usedFallback = true;
    const types = await prisma.livestockAnimalType.findMany({
      where: { categoryId: { in: categories.map((c) => c.id) }, status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
    animalTypes = types.map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      slug: t.slug,
      name: t.name,
      nameSomali: t.nameSomali,
      unit: t.unit,
      legacyAnimalType: t.legacyAnimalType,
      status: t.status,
    }));
  }

  // Cap categories to plan max — never pad with unassigned types.
  if (limits.hasActivePlan && limits.maxLivestockTypes != null) {
    const max = Math.max(1, limits.maxLivestockTypes);
    if (categories.length > max) {
      categories = categories.slice(0, max);
      const allowed = new Set(categories.map((c) => c.id));
      animalTypes = animalTypes.filter((t) => allowed.has(t.categoryId));
    }
  }

  animalTypes = animalTypes.filter(
    (t) => !isRetiredLivestockType(t.slug, t.name, t.nameSomali)
  );

  return {
    brokerId,
    marketIds: uniqueNums(markets.map((m) => m.id)),
    categoryIds: uniqueNums(categories.map((c) => c.id)),
    livestockTypeIds: uniqueNums(animalTypes.map((t) => t.id)),
    markets,
    categories,
    animalTypes,
    usedFallback,
  };
}

export async function getLivestockAdminPriceScope(): Promise<BrokerScope> {
  const [markets, categories] = await Promise.all([
    prisma.market.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true, code: true, location: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.livestockCategory.findMany({
      where: { status: "ACTIVE" },
      include: {
        animalTypes: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const animalTypes = categories.flatMap((c) =>
    c.animalTypes
      .filter((t) => !isRetiredLivestockType(t.slug, t.name, t.nameSomali))
      .map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      slug: t.slug,
      name: t.name,
      nameSomali: t.nameSomali,
      unit: t.unit,
      legacyAnimalType: t.legacyAnimalType,
      status: t.status,
    }))
  );
  return {
    brokerId: 0,
    marketIds: uniqueNums(markets.map((m) => m.id)),
    categoryIds: uniqueNums(categories.map((c) => c.id)),
    livestockTypeIds: uniqueNums(animalTypes.map((t) => t.id)),
    markets,
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameSomali: c.nameSomali,
      species: c.species,
    })),
    animalTypes,
    usedFallback: false,
  };
}

export async function assertBrokerCanSubmit(opts: {
  user: AuthUser;
  marketId: number;
  categoryId: number;
  livestockTypeId: number;
}): Promise<{ ok: true; scope: BrokerScope } | { ok: false; error: string; status: number }> {
  if (isSuperAdmin(opts.user)) {
    const scope = await getLivestockAdminPriceScope();
    if (!scope.marketIds.includes(opts.marketId)) {
      return { ok: false, error: "Market is not available", status: 403 };
    }
    if (!scope.categoryIds.includes(opts.categoryId)) {
      return { ok: false, error: "Category is not available", status: 403 };
    }
    const type = scope.animalTypes.find((t) => t.id === opts.livestockTypeId);
    if (!type) {
      return { ok: false, error: "Animal type is not available", status: 403 };
    }
    if (type.categoryId !== opts.categoryId) {
      return { ok: false, error: "Animal type does not belong to the selected category", status: 400 };
    }
    return { ok: true, scope };
  }

  if (!isLivestockBroker(opts.user) || !opts.user.brokerId) {
    return { ok: false, error: "Only livestock brokers can submit market prices", status: 403 };
  }

  const broker = await prisma.livestockBroker.findFirst({
    where: { id: opts.user.brokerId, deletedAt: null },
    select: { id: true, status: true, approvalStatus: true },
  });
  if (!broker) return { ok: false, error: "Broker profile not found", status: 403 };
  if (broker.status !== "ACTIVE") {
    return { ok: false, error: "Broker account is not active", status: 403 };
  }
  if (broker.approvalStatus !== "APPROVED") {
    return { ok: false, error: "Broker account is not approved", status: 403 };
  }

  const scope = await getBrokerScope(broker.id);
  if (!scope) return { ok: false, error: "Broker profile not found", status: 403 };

  if (!scope.marketIds.includes(opts.marketId)) {
    return { ok: false, error: "That market is not in your plan", status: 403 };
  }
  if (!scope.categoryIds.includes(opts.categoryId)) {
    return {
      ok: false,
      error: "That livestock type is not in your plan",
      status: 403,
    };
  }
  const type = scope.animalTypes.find((t) => t.id === opts.livestockTypeId);
  if (!type) {
    return { ok: false, error: "You are not authorized to report this animal type", status: 403 };
  }
  if (type.categoryId !== opts.categoryId) {
    return { ok: false, error: "Animal type does not belong to the selected category", status: 400 };
  }

  return { ok: true, scope };
}

export function brokerOwnsPrice(
  user: AuthUser,
  price: { brokerId: number | null; updatedById: number }
) {
  if (isSuperAdmin(user)) return true;
  if (user.brokerId && price.brokerId === user.brokerId) return true;
  return price.updatedById === user.id;
}
