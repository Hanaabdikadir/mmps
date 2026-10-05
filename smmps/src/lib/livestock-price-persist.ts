import type { AnimalType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRegistrationLivestockMarkets } from "@/lib/livestock-registration-markets";
import {
  animalTypeFromCategory,
  canonicalTypeName,
  categorySlugFromAnimal,
  fieldCategoryFromTypeName,
  parseFieldCategory,
  seasonFromCategoryLabel,
  isRetiredLivestockType,
  type BoardSeasonKey,
} from "@/lib/livestock-section-prices";
import { sameAgeClass, sameOriginPlace } from "@/lib/livestock-listing-meta";
import { hardDeleteLivestockPrices } from "@/lib/delete-user";

export {
  revalidateLivestockPublic,
  revalidatePublicCompare,
  revalidateUtilityPublic,
  revalidateAllPublicMarkets,
} from "@/lib/revalidate-public";

const ANIMAL_TYPES: AnimalType[] = ["CAMEL", "CATTLE", "GOAT", "SHEEP"];

export type PersistPriceInput = {
  animalType?: string | null;
  category?: string | null;
  description?: string | null;
  typeName?: string | null;
  season?: string | null;
  livestockTypeId?: number | null;
  livestockCategoryId?: number | null;
  marketId?: number | null;
  marketLocation?: string | null;
  brokerId?: number | null;
};

export type PersistPriceLinks = {
  animalType: AnimalType;
  category: string;
  description: string;
  livestockTypeId: number | null;
  livestockCategoryId: number | null;
  marketId: number | null;
  marketLocation: string;
};

type MarketRef = { id: number; name: string; location: string | null };

async function resolveMarket(
  marketId?: number | null,
  marketLocation?: string | null,
  brokerId?: number | null
): Promise<MarketRef | null> {
  if (marketId) {
    const byId = await prisma.market.findFirst({
      where: { id: Number(marketId), deletedAt: null, marketType: "LIVESTOCK" },
      select: { id: true, name: true, location: true },
    });
    if (byId) return byId;
  }

  const loc = (marketLocation || "").trim();
  const five = await getRegistrationLivestockMarkets();
  if (loc) {
    const locLow = loc.toLowerCase();
    const fromFive = five.find(
      (market) =>
        market.name.toLowerCase() === locLow ||
        locLow.includes(market.name.toLowerCase().split(" ")[0]) ||
        (market.location && locLow.includes(market.location.split(",")[0].toLowerCase()))
    );
    if (fromFive) {
      return { id: fromFive.id, name: fromFive.name, location: fromFive.location };
    }

    const all = await prisma.market.findMany({
      where: { deletedAt: null, marketType: "LIVESTOCK" },
      select: { id: true, name: true, location: true },
    });
    const hit =
      all.find((m) => m.name.toLowerCase() === locLow) ||
      all.find((m) => (m.location || "").toLowerCase() === locLow) ||
      all.find((m) => locLow.includes(m.name.toLowerCase())) ||
      all.find((m) => (m.location || "") && locLow.includes((m.location || "").toLowerCase()));
    if (hit) return hit;
  }

  if (brokerId) {
    const link = await prisma.livestockBrokerMarket.findFirst({
      where: { brokerId, market: { deletedAt: null } },
      include: { market: { select: { id: true, name: true, location: true } } },
      orderBy: { marketId: "asc" },
    });
    if (link?.market) return link.market;
  }

  if (five[0]) {
    return { id: five[0].id, name: five[0].name, location: five[0].location };
  }
  return null;
}

function typeMatches(
  type: { name: string; nameSomali: string | null; slug: string },
  needle: string
) {
  const low = canonicalTypeName(needle).toLowerCase();
  if (!low) return false;
  const names = [
    type.nameSomali,
    type.name,
    type.slug,
    type.slug.replace(/-/g, " "),
  ]
    .map((v) => canonicalTypeName(v).toLowerCase())
    .filter(Boolean);
  return names.includes(low);
}

type TypeRef = {
  id: number;
  name: string;
  nameSomali: string | null;
  slug: string;
  categoryId: number;
  legacyAnimalType: AnimalType;
};

export async function resolveLivestockPriceLinks(
  input: PersistPriceInput
): Promise<PersistPriceLinks> {
  const season: BoardSeasonKey = seasonFromCategoryLabel(
    input.season || input.category
  );
  const market = await resolveMarket(
    input.marketId,
    input.marketLocation,
    input.brokerId
  );

  const catalogs = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    include: { animalTypes: { where: { status: "ACTIVE" } } },
  });
  const preferredSlug = categorySlugFromAnimal(input.animalType);
  const ordered = [
    ...catalogs.filter((c) => c.slug === preferredSlug),
    ...catalogs.filter((c) => c.slug !== preferredSlug),
  ];

  let type: TypeRef | null = null;
  let categoryRow: (typeof catalogs)[number] | null = null;

  if (input.livestockTypeId) {
    const found = await prisma.livestockAnimalType.findUnique({
      where: { id: Number(input.livestockTypeId) },
    });
    if (found) {
      if (
        isRetiredLivestockType(found.slug, found.name, found.nameSomali)
      ) {
        type = null;
      } else {
        type = found;
        categoryRow = catalogs.find((c) => c.id === found.categoryId) || null;
      }
    }
  }

  if (!type && input.livestockCategoryId) {
    categoryRow =
      catalogs.find((c) => c.id === Number(input.livestockCategoryId)) || null;
  }

  const fieldParsed = parseFieldCategory(input.category);
  const keepField =
    Boolean(fieldParsed) &&
    String(input.category || "").toUpperCase().startsWith("FIELD_");
  const needles = [
    canonicalTypeName(input.typeName),
    canonicalTypeName(input.description),
    keepField ? "" : canonicalTypeName(input.category),
  ].filter(Boolean);

  if (!type) {
    outer: for (const needle of needles) {
      for (const cat of ordered) {
        const hit = cat.animalTypes.find(
          (t) =>
            typeMatches(t, needle) &&
            !isRetiredLivestockType(t.slug, t.name, t.nameSomali)
        );
        if (hit) {
          type = hit;
          categoryRow = cat;
          break outer;
        }
      }
    }
  }

  if (!categoryRow && type) {
    categoryRow = catalogs.find((c) => c.id === type.categoryId) || null;
  }
  if (!categoryRow && !type) {
    categoryRow = ordered[0] || null;
  }

  const requestedName = String(input.typeName || input.description || "").trim();
  const displayName =
    requestedName ||
    canonicalTypeName(type?.nameSomali || type?.name || needles[0] || "") ||
    "Type";

  const category = keepField
    ? String(input.category).toUpperCase()
    : fieldCategoryFromTypeName(season, displayName);

  let animalType: AnimalType = type?.legacyAnimalType || "GOAT";
  if (!type) {
    const raw = String(input.animalType || "").toUpperCase();
    animalType = ANIMAL_TYPES.includes(raw as AnimalType)
      ? (raw as AnimalType)
      : animalTypeFromCategory(preferredSlug);
  }
  const sectionSlug = categoryRow?.slug || preferredSlug;
  if (sectionSlug === "arri") animalType = "GOAT";

  return {
    animalType,
    category,
    description: displayName,
    livestockTypeId: type?.id ?? null,
    livestockCategoryId: categoryRow?.id ?? type?.categoryId ?? null,
    marketId: market?.id ?? (input.marketId != null ? Number(input.marketId) : null),
    marketLocation: market?.name || String(input.marketLocation || "").trim(),
  };
}

function sameUsd(a: unknown, b: number) {
  return Number(a) === b;
}

/** Latest live row for the same broker/market/type/season field. */
export async function findLatestLivestockPriceMatch(where: {
  brokerId?: number | null;
  updatedById?: number;
  category: string;
  livestockTypeId?: number | null;
  marketId?: number | null;
  description?: string | null;
}) {
  const owner =
    where.brokerId != null
      ? { brokerId: where.brokerId }
      : where.updatedById != null
        ? { updatedById: where.updatedById }
        : {};
  const market = where.marketId != null ? { marketId: where.marketId } : {};
  const typeFilter =
    where.livestockTypeId != null ? { livestockTypeId: where.livestockTypeId } : {};
  const exact = await prisma.livestockPrice.findFirst({
    where: {
      deletedAt: null,
      ...owner,
      category: where.category,
      ...market,
      ...typeFilter,
    },
    orderBy: { createdAt: "desc" },
  });
  if (exact) return exact;
  if (where.livestockTypeId == null) return null;
  const seasonToken = /SUGUNTO/i.test(where.category) ? "SUGUNTO" : "BIRIMO";
  const byType = await prisma.livestockPrice.findFirst({
    where: {
      deletedAt: null,
      ...owner,
      livestockTypeId: where.livestockTypeId,
      category: { contains: seasonToken, mode: "insensitive" },
      ...market,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!byType) return null;
  const want = canonicalTypeName(where.description).toLowerCase();
  const have = canonicalTypeName(byType.description).toLowerCase();
  if (want && have && want !== have) return null;
  return byType;
}

/**
 * Approved prices must not re-enter the Super Admin queue unless the amount changed.
 */
export function isUnchangedApprovedPrice(
  row: {
    status: string;
    price: unknown;
    description?: string | null;
    ageClass?: string | null;
    originPlace?: string | null;
  } | null | undefined,
  price: number,
  name?: string | null,
  extra?: { ageClass?: string | null; originPlace?: string | null }
) {
  if (row?.status !== "APPROVED" || !sameUsd(row.price, price)) return false;
  const next = String(name || "").trim();
  if (next && String(row.description || "").trim().toLowerCase() !== next.toLowerCase()) {
    return false;
  }
  if (extra?.originPlace && row.originPlace) {
    if (!sameOriginPlace(row.originPlace, extra.originPlace)) return false;
  }
  if (extra?.ageClass && row.ageClass) {
    if (!sameAgeClass(row.ageClass, extra.ageClass)) return false;
  }
  return true;
}

export async function dismissDuplicatePendingLivestockPrices(opts: {
  keepId: number;
  brokerId?: number | null;
  category: string | null;
  livestockTypeId?: number | null;
  marketId?: number | null;
}) {
  const category = String(opts.category || "").trim();
  if (!category) return;
  await hardDeleteLivestockPrices({
    id: { not: opts.keepId },
    deletedAt: null,
    status: "PENDING",
    category,
    ...(opts.brokerId != null ? { brokerId: opts.brokerId } : {}),
    ...(opts.marketId != null ? { marketId: opts.marketId } : {}),
  });
}

/** After an edit is approved, retire the previous live row so public shows the new price. */
export async function supersedeMatchingApprovedLivestockPrices(opts: {
  keepId: number;
  brokerId?: number | null;
  category: string | null;
  livestockTypeId?: number | null;
  description?: string | null;
  ageClass?: string | null;
  originPlace?: string | null;
}) {
  const category = String(opts.category || "").trim();
  const orFilters: Record<string, unknown>[] = [];
  if (category) orFilters.push({ category });
  if (opts.livestockTypeId) orFilters.push({ livestockTypeId: opts.livestockTypeId });
  const description = String(opts.description || "").trim();
  if (description) {
    orFilters.push({ description: { equals: description, mode: "insensitive" } });
  }
  if (!orFilters.length && opts.brokerId == null) return;

  await hardDeleteLivestockPrices({
    id: { not: opts.keepId },
    deletedAt: null,
    status: "APPROVED",
    ...(opts.brokerId != null ? { brokerId: opts.brokerId } : {}),
    ...(orFilters.length ? { OR: orFilters } : {}),
    ...(opts.ageClass ? { ageClass: opts.ageClass } : {}),
    ...(opts.originPlace ? { originPlace: opts.originPlace } : {}),
  });
}
