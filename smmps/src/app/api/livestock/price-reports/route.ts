import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { isLivestockBroker, isSuperAdmin } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac-db";
import type { AnimalType, PriceStatus } from "@prisma/client";
import { animalTypesFromCategory, isRetiredLivestockType } from "@/lib/livestock-section-prices";
import { mogadishuDayEnd, mogadishuDayStart } from "@/lib/mogadishu-time";
import { ensureLivestockCatalog } from "@/lib/livestock-catalog";
import { getBrokerScope } from "@/lib/livestock-scope";
import { categorySlugFromLivestockSection } from "@/lib/livestock-assignments";
import {
  ALL_LIVESTOCK_TYPES,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";

export const dynamic = "force-dynamic";

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))];
}

async function brokerAssignedLivestock(user: {
  email: string;
  brokerId?: number | null;
  companyType?: string | null;
}): Promise<{
  slugs: string[];
  categoryIds: number[];
  typeIds: number[];
  animalEnums: AnimalType[];
  categories: { id: number; name: string; slug: string; nameSomali: string | null }[];
}> {
  if (user.brokerId) {
    const scope = await getBrokerScope(user.brokerId);
    if (scope?.categories.length) {
      return {
        slugs: uniqueStrings(scope.categories.map((c) => c.slug)),
        categoryIds: scope.categoryIds,
        typeIds: scope.livestockTypeIds,
        animalEnums: [
          ...new Set(
            scope.animalTypes
              .map((t) => t.legacyAnimalType as AnimalType)
              .filter(Boolean)
          ),
        ],
        categories: scope.categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          nameSomali: c.nameSomali,
        })),
      };
    }
  }

  const parts = parseLivestockTypeChoices(user.companyType);
  const slugs = parts.includes(ALL_LIVESTOCK_TYPES)
    ? []
    : uniqueStrings(parts.map((part) => categorySlugFromLivestockSection(part)));
  return {
    slugs,
    categoryIds: [],
    typeIds: [],
    animalEnums: slugs.flatMap((slug) => animalTypesFromCategory(slug)),
    categories: [],
  };
}

function animalFilter(animal: string | null) {
  const key = (animal || "").trim().toLowerCase();
  if (!key || key === "all") return null;
  if (key === "geel" || key === "camel") {
    return {
      OR: [
        { animalType: "CAMEL" as AnimalType },
        { livestockCategory: { slug: "geel" } },
        { livestockType: { category: { slug: "geel" } } },
      ],
    };
  }
  if (key === "loda" || key === "cattle") {
    return {
      OR: [
        { animalType: "CATTLE" as AnimalType },
        { livestockCategory: { slug: "loda" } },
        { livestockType: { category: { slug: "loda" } } },
      ],
    };
  }
  if (key === "arri" || key === "goat" || key === "sheep") {
    return {
      OR: [
        { animalType: { in: ["GOAT", "SHEEP"] as AnimalType[] } },
        { livestockCategory: { slug: "arri" } },
        { livestockType: { category: { slug: "arri" } } },
      ],
    };
  }
  return {
    OR: [
      { livestockCategory: { slug: key } },
      { livestockType: { category: { slug: key } } },
    ],
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const ownReportsOnly = isLivestockBroker(auth.user) && !isSuperAdmin(auth.user);
  const canViewAll =
    !ownReportsOnly &&
    (isSuperAdmin(auth.user) ||
      (await roleHasPermission(auth.user.role, "APPROVE_LIVESTOCK_PRICE")));

  if (!canViewAll && !isLivestockBroker(auth.user)) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status") as PriceStatus | null;
  const marketId = Number(searchParams.get("marketId") || 0);
  const brokerId = Number(searchParams.get("brokerId") || 0);
  const categoryId = Number(searchParams.get("categoryId") || 0);
  const livestockTypeId = Number(searchParams.get("livestockTypeId") || 0);
  const animal = searchParams.get("animal");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const and: Record<string, unknown>[] = [{ deletedAt: null }];
  let focusSlugs: string[] = [];
  let scopedCategories: {
    id: number;
    name: string;
    slug: string;
    nameSomali: string | null;
  }[] = [];

  if (ownReportsOnly || !canViewAll) {
    and.push({ updatedById: auth.user.id });
    and.push({ price: { gt: 0 } });
    const assigned = await brokerAssignedLivestock(auth.user);
    focusSlugs = assigned.slugs;
    scopedCategories = assigned.categories;
    const animalFilterOr: Record<string, unknown>[] = [];
    if (assigned.typeIds.length) {
      animalFilterOr.push({ livestockTypeId: { in: assigned.typeIds } });
    }
    if (assigned.categoryIds.length) {
      animalFilterOr.push({ livestockCategoryId: { in: assigned.categoryIds } });
    }
    if (assigned.animalEnums.length) {
      animalFilterOr.push({ animalType: { in: assigned.animalEnums } });
    }
    if (focusSlugs.length) {
      animalFilterOr.push({ livestockCategory: { slug: { in: focusSlugs } } });
    }
    if (animalFilterOr.length) {
      and.push({ OR: animalFilterOr });
    }
    if (!status) {
      and.push({ status: "APPROVED" });
    }
  } else if (brokerId) {
    and.push({ brokerId });
  }

  if (status) and.push({ status });
  if (marketId) and.push({ marketId });
  if (categoryId) and.push({ livestockCategoryId: categoryId });
  if (livestockTypeId) and.push({ livestockTypeId });

  const animalWhere = animalFilter(animal);
  if (animalWhere) and.push(animalWhere);

  if (from || to) {
    const dateFrom = mogadishuDayStart(from);
    const dateTo = mogadishuDayEnd(to);
    and.push({
      dateRecorded: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  if (q) {
    and.push({
      OR: [
        { marketLocation: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { broker: { name: { contains: q, mode: "insensitive" } } },
        { broker: { users: { some: { fullName: { contains: q, mode: "insensitive" } } } } },
        { market: { name: { contains: q, mode: "insensitive" } } },
        { livestockType: { name: { contains: q, mode: "insensitive" } } },
        { livestockType: { nameSomali: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const prices = await prisma.livestockPrice.findMany({
    where: { AND: and },
    include: {
      broker: {
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          authorizedCategories: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
          users: {
            where: { deletedAt: null },
            select: { fullName: true, email: true, phone: true },
            take: 8,
          },
          market: { select: { id: true, name: true, location: true } },
          assignedMarkets: {
            take: 4,
            include: { market: { select: { id: true, name: true, location: true } } },
          },
          location: true,
        },
      },
      market: { select: { id: true, name: true, location: true } },
      livestockCategory: { select: { id: true, name: true, slug: true } },
      livestockType: {
        select: {
          id: true,
          name: true,
          nameSomali: true,
          category: { select: { slug: true, name: true } },
        },
      },
      updatedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ dateRecorded: "desc" }, { id: "desc" }],
    take: 1000,
  });

  const mapped = prices.map((p) => ({
    id: p.id,
    price: Number(p.price),
    currency: p.currency,
    unit: p.unit,
    status: String(p.status),
    rejectionReason: p.rejectionReason,
    dateRecorded: p.dateRecorded,
    createdAt: p.createdAt,
    description: p.description,
    marketLocation: p.marketLocation,
    broker: p.broker
      ? {
          ...p.broker,
          categories: p.broker.authorizedCategories.map((row) => row.category),
        }
      : null,
    market: p.market,
    category: p.livestockCategory,
    animalType: p.livestockType,
    fallbackCategory: p.category,
    animalTypeEnum: p.animalType,
    submittedBy: p.updatedBy as { id: number; fullName: string } | null,
    catalogOnly: false,
    ageClass: p.ageClass,
    originPlace: p.originPlace,
  })).filter(
    (row) =>
      !isRetiredLivestockType(
        row.description,
        row.animalType?.name,
        row.animalType?.nameSomali
      )
  );

  if (
    canViewAll &&
    !ownReportsOnly &&
    !status &&
    !marketId &&
    !livestockTypeId &&
    !from &&
    !to
  ) {
    await ensureLivestockCatalog();
    const catalogTypes = await prisma.livestockAnimalType.findMany({
      where: { status: "ACTIVE", category: { status: "ACTIVE" } },
      select: {
        id: true,
        name: true,
        nameSomali: true,
        slug: true,
        legacyAnimalType: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    const seenTypeIds = new Set(
      mapped
        .map((row) => row.animalType?.id)
        .filter((id): id is number => Number.isFinite(id))
    );
    const seenNames = new Set(
      mapped.map((row) =>
        `${(row.category?.slug || "").toLowerCase()}::${(row.animalType?.name || "").toLowerCase()}`
      )
    );
    const qLower = (q || "").toLowerCase();
    for (const type of catalogTypes) {
      if (isRetiredLivestockType(type.slug, type.name, type.nameSomali)) continue;
      if (seenTypeIds.has(type.id)) continue;
      const nameKey = `${type.category.slug.toLowerCase()}::${type.name.toLowerCase()}`;
      if (seenNames.has(nameKey)) continue;
      if (qLower) {
        const hay = `${type.name} ${type.nameSomali || ""} ${type.category.name} ${type.category.slug}`.toLowerCase();
        if (!hay.includes(qLower)) continue;
      }
      if (animal) {
        const key = animal.trim().toLowerCase();
        const slug = type.category.slug.toLowerCase();
        if (key !== "all" && slug !== key) {
          if (
            !(
              (key === "geel" || key === "camel") &&
              slug === "geel"
            ) &&
            !(
              (key === "loda" || key === "cattle") &&
              slug === "loda"
            ) &&
            !(
              (key === "arri" || key === "goat" || key === "sheep") &&
              slug === "arri"
            )
          ) {
            continue;
          }
        }
      }
      mapped.push({
        id: -type.id,
        price: 0,
        currency: "USD",
        unit: "head",
        status: "REGISTERED",
        rejectionReason: null,
        dateRecorded: type.createdAt,
        createdAt: type.createdAt,
        description: null,
        marketLocation: "",
        broker: null,
        market: null,
        category: type.category,
        animalType: {
          id: type.id,
          name: type.name,
          nameSomali: type.nameSomali,
          category: { slug: type.category.slug, name: type.category.name },
        },
        fallbackCategory: null,
        animalTypeEnum: type.legacyAnimalType,
        submittedBy: null,
        catalogOnly: true,
        ageClass: null,
        originPlace: null,
      });
    }
  }

  const categories =
    scopedCategories.length > 0
      ? scopedCategories
      : await prisma.livestockCategory.findMany({
          where: { status: "ACTIVE" },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true, nameSomali: true },
        });

  return jsonOk({
    focusSlug: focusSlugs.length === 1 ? focusSlugs[0] : null,
    focusSlugs,
    categories,
    prices: mapped,
  });
}
