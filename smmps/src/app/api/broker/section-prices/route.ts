import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getCurrentUser,
  isLivestockBroker,
  isSuperAdmin,
  type AuthUser,
} from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-guard";
import { requireActiveSubscription } from "@/lib/subscriptions";
import { notifyRole } from "@/lib/notifications";
import {
  animalTypeFromCategory,
  animalTypesFromCategory,
  categorySlugFromBroker,
  namedFieldsOrDefaults,
  overlaySectionPrices,
  livestockEditorGroupKey,
  pickLatestEditorRows,
  pickPendingEditorRows,
  fieldCategoryFromTypeName,
  seasonFromCategoryLabel,
  canonicalTypeName,
  isRetiredLivestockType,
} from "@/lib/livestock-section-prices";
import type { AnimalType } from "@prisma/client";
import { isLivestockCategorySlug } from "@/lib/livestock-data";
import { persistBrokerNamedPriceFields } from "@/lib/broker-section-price-items";
import { revalidateLivestockPublic } from "@/lib/livestock-price-persist";
import { retireRemovedLivestockTypes } from "@/lib/livestock-catalog";
import { getBrokerScope } from "@/lib/livestock-scope";

export const dynamic = "force-dynamic";

type BrokerMarketOption = { id: number; name: string };

async function brokerContext(
  user: {
    id: number;
    brokerId?: number | null;
    companyType?: string | null;
  },
  preferredMarketId?: number | null
) {
  const broker = user.brokerId
    ? await prisma.livestockBroker.findUnique({
        where: { id: user.brokerId },
        select: {
          name: true,
          livestockFocus: true,
          location: true,
          market: { select: { id: true, name: true } },
        },
      })
    : null;

  const slug = categorySlugFromBroker({
    livestockFocus: broker?.livestockFocus,
    name: broker?.name,
    companyType: user.companyType,
  });

  const scope = user.brokerId ? await getBrokerScope(user.brokerId) : null;
  const markets: BrokerMarketOption[] = (scope?.markets || []).map((m) => ({
    id: m.id,
    name: m.name,
  }));

  if (!markets.length && broker?.market) {
    markets.push({ id: broker.market.id, name: broker.market.name });
  }

  let marketId: number | null = null;
  let marketName = "";

  if (preferredMarketId && markets.some((m) => m.id === preferredMarketId)) {
    const hit = markets.find((m) => m.id === preferredMarketId)!;
    marketId = hit.id;
    marketName = hit.name;
  } else if (markets.length) {
    // Prefer primary broker.marketId when it is in the available list
    const primary = broker?.market;
    const preferred =
      (primary && markets.find((m) => m.id === primary.id)) || markets[0];
    marketId = preferred.id;
    marketName = preferred.name;
  } else {
    marketName = broker?.location || "";
  }

  if (!marketId) {
    const registrant = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        marketId: true,
        companyAddress: true,
        market: { select: { id: true, name: true } },
      },
    });
    marketId = registrant?.market?.id || registrant?.marketId || null;
    marketName =
      marketName || registrant?.market?.name || registrant?.companyAddress || "";
    // Do not inject markets outside plan / assignment scope.
    if (marketId && !markets.some((m) => m.id === marketId)) {
      marketId = markets[0]?.id ?? null;
      marketName = markets[0]?.name || marketName;
    }
  }

  return {
    slug,
    animalType: animalTypeFromCategory(slug) as AnimalType,
    animalTypes: animalTypesFromCategory(slug),
    location: marketName,
    marketId,
    markets,
  };
}

function priceWhere(
  user: { id: number; brokerId?: number | null },
  animalTypes: AnimalType[]
) {
  return {
    deletedAt: null,
    animalType: { in: animalTypes },
    ...(user.brokerId
      ? { brokerId: user.brokerId }
      : { updatedById: user.id }),
  };
}

function canEditSectionPrices(user: AuthUser): boolean {
  return (
    isLivestockBroker(user) ||
    Boolean(user.brokerId) ||
    isSuperAdmin(user) ||
    checkPermission(user, "ADD_LIVESTOCK_PRICE")
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in again to save prices.", 401);
  if (!canEditSectionPrices(user)) return jsonError("Forbidden", 403);

  const url = new URL(request.url);
  const requestedMarketId = Number(url.searchParams.get("marketId") || "");
  const ctx = await brokerContext(
    user,
    Number.isFinite(requestedMarketId) && requestedMarketId > 0
      ? requestedMarketId
      : null
  );
  await retireRemovedLivestockTypes();
  const requested = url.searchParams.get("slug") || "";
  const slug = isLivestockCategorySlug(requested) ? requested : ctx.slug;
  const animalType = animalTypeFromCategory(slug) as AnimalType;
  const animalTypes = animalTypesFromCategory(slug);

  const ownerBase = {
    animalType: { in: animalTypes },
    ...(isSuperAdmin(user)
      ? {}
      : user.brokerId
        ? { brokerId: user.brokerId }
        : { updatedById: user.id }),
    ...(ctx.marketId
      ? {
          OR: [
            { marketId: ctx.marketId },
            {
              AND: [
                { marketId: null },
                {
                  OR: [
                    { marketLocation: { equals: ctx.location, mode: "insensitive" as const } },
                    { marketLocation: { contains: ctx.location.slice(0, 24), mode: "insensitive" as const } },
                  ],
                },
              ],
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.livestockPrice.findMany({
    where: {
      ...ownerBase,
      deletedAt: null,
    },
    include: {
      livestockType: { select: { name: true, nameSomali: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const latest = pickLatestEditorRows(rows, livestockEditorGroupKey);
  const pendingLatest = pickPendingEditorRows(rows, (r) =>
    livestockEditorGroupKey(r)
  );

  const mapped = latest.map((r) => {
    return {
      id: r.id,
      category: r.category,
      description: r.description,
      price: Number(r.price),
      livestockTypeName: r.livestockType?.nameSomali || r.livestockType?.name || null,
      ageClass: r.ageClass,
      originPlace: r.originPlace,
    };
  });

  return jsonOk({
    slug,
    animalType,
    marketId: ctx.marketId,
    markets: ctx.markets,
    location: ctx.location,
    prices: overlaySectionPrices(
      slug,
      latest.map((r) => ({ category: r.category, price: Number(r.price) }))
    ),
    fields: namedFieldsOrDefaults(slug, mapped),
    pendingFields: pendingLatest
      .map((r) => ({
        id: r.id,
        category: String(r.category || ""),
        name:
          r.livestockType?.nameSomali ||
          r.livestockType?.name ||
          r.description ||
          "—",
        price: Number(r.price),
        season: seasonFromCategoryLabel(r.category),
        status: r.status,
        rejectionReason: String(r.rejectionReason || "").trim(),
        ageClass: r.ageClass,
        originPlace: r.originPlace,
      }))
      .filter((field) => !isRetiredLivestockType(field.name)),
    statuses: Object.fromEntries(
      latest.flatMap((r) => {
        const status = r.status;
        const cat = String(r.category || "");
        const season = seasonFromCategoryLabel(cat);
        const name = canonicalTypeName(
          r.description || r.livestockType?.nameSomali || r.livestockType?.name || ""
        );
        const keys = [cat, cat.toUpperCase()];
        if (name) {
          keys.push(`${season}:${name.toLowerCase()}`);
          keys.push(fieldCategoryFromTypeName(season, name));
        }
        return keys.filter(Boolean).map((key) => [key, status] as const);
      })
    ),
    rejectionReasons: Object.fromEntries(
      [...latest, ...pendingLatest].flatMap((r) => {
        const reason = String(r.rejectionReason || "").trim();
        if (!reason) return [];
        const cat = String(r.category || "");
        return [[cat, reason], [cat.toUpperCase(), reason]] as [string, string][];
      })
    ),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in again to save prices.", 401);
  if (!canEditSectionPrices(user)) return jsonError("Forbidden", 403);

  if (user.brokerId && !isSuperAdmin(user)) {
    const sub = await requireActiveSubscription({ brokerId: user.brokerId });
    if (!sub.ok) return jsonError(sub.reason, 402);
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  const requestedMarketId = Number(body?.marketId || "");
  const deletedItems = Array.isArray(body?.deleted)
    ? body.deleted
        .map((v: unknown) => {
          if (typeof v === "string") {
            return { category: v.toUpperCase(), name: "", season: "" };
          }
          if (v && typeof v === "object") {
            const row = v as { category?: string; name?: string; season?: string };
            return {
              category: String(row.category || "").toUpperCase(),
              name: String(row.name || "").trim(),
              season: String(row.season || "").toLowerCase(),
            };
          }
          return { category: "", name: "", season: "" };
        })
        .filter((row: { category: string; name: string }) => row.category || row.name)
    : [];
  const brokerLocked = isLivestockBroker(user) && !isSuperAdmin(user);
  const deletions = brokerLocked ? [] : deletedItems;
  if (!items.length && !deletions.length) return jsonError("No prices to save");

  const { slug, animalType, animalTypes, location, marketId, markets } =
    await brokerContext(
      user,
      Number.isFinite(requestedMarketId) && requestedMarketId > 0
        ? requestedMarketId
        : null
    );
  if (
    Number.isFinite(requestedMarketId) &&
    requestedMarketId > 0 &&
    markets.length > 0 &&
    !markets.some((m) => m.id === requestedMarketId)
  ) {
    return jsonError("That market is not in your plan.", 403);
  }
  const ownerWhere = {
    ...priceWhere(user, animalTypes),
    ...(marketId
      ? {
          OR: [
            { marketId },
            {
              AND: [
                { marketId: null },
                {
                  OR: [
                    { marketLocation: { equals: location, mode: "insensitive" as const } },
                    {
                      marketLocation: {
                        contains: location.slice(0, 24),
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }
      : {}),
  };

  if (deletions.length) {
    for (const row of deletions) {
      const orFilters: Record<string, unknown>[] = [];
      if (row.category) orFilters.push({ category: row.category });
      if (row.name) {
        orFilters.push(
          row.season
            ? {
                AND: [
                  { description: { equals: row.name, mode: "insensitive" } },
                  {
                    category: {
                      contains: row.season.toUpperCase(),
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : { description: { equals: row.name, mode: "insensitive" } }
        );
      }
      if (!orFilters.length) continue;
      const matched = await prisma.livestockPrice.updateMany({
        where: {
          ...ownerWhere,
          OR: orFilters,
        },
        data: { deletedAt: new Date() },
      });
      if (matched.count === 0 && row.category) {
        await prisma.livestockPrice.create({
          data: {
            animalType,
            category: row.category,
            description: row.name || row.category,
            price: 0,
            currency: "USD",
            marketLocation: location,
            brokerId: user.brokerId ?? null,
            updatedById: user.id,
            dateRecorded: new Date(),
            status: "DRAFT",
            deletedAt: new Date(),
          },
        });
      }
    }
  }

  let persisted;
  try {
    persisted = await persistBrokerNamedPriceFields({
      items,
      brokerLocked,
      queueForApproval: !isSuperAdmin(user),
      animalType,
      location,
      marketId,
      brokerId: user.brokerId,
      userId: user.id,
      ownerWhere,
    });
  } catch (err) {
    console.error("[broker/section-prices POST]", err);
    return jsonError("Qiimaha lama kaydin. Isku day mar kale.");
  }
  if (!persisted.ok) return persisted.response;
  const { saved, fields } = persisted;

  if (saved.length) {
    await notifyRole(["SUPER_ADMIN"], {
      title: "Livestock prices updated",
      message: `${user.fullName} submitted ${slug.toUpperCase()} price fields for approval.`,
      type: "PRICE_SUBMITTED",
      sector: "livestock",
      senderId: user.id,
    });
  }

  if (saved.length || deletions.length) revalidateLivestockPublic();
  return jsonOk({ saved: saved.length, deleted: deletedItems.length, fields });
}
