import { prisma } from "@/lib/prisma";
import type { AccountStatus, AnimalType } from "@prisma/client";
import {
  animalTypesFromCategory,
  hiddenTypeKeysFromDeletedRows,
  isRetiredLivestockType,
  mapPublicBoardPriceRows,
  publicLivestockBoardWhere,
  typeNamedFields,
} from "@/lib/livestock-section-prices";
import { isLivestockCategorySlug } from "@/lib/livestock-data";
import {
  ALL_LIVESTOCK_TYPES,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";

export type CatalogCategorySeed = {
  slug: string;
  name: string;
  nameSomali: string;
  description: string;
  species: AnimalType;
  sortOrder: number;
  types: {
    slug: string;
    name: string;
    nameSomali: string;
    legacyAnimalType: AnimalType;
    sortOrder: number;
  }[];
};

export const DEFAULT_LIVESTOCK_CATEGORIES: CatalogCategorySeed[] = [
  {
    slug: "geel",
    name: "Camels",
    nameSomali: "Geel",
    description: "Camel market category (Geelka)",
    species: "CAMEL",
    sortOrder: 1,
    types: [
      { slug: "awr", name: "Male Camel", nameSomali: "Awr", legacyAnimalType: "CAMEL", sortOrder: 1 },
      { slug: "hal", name: "Female Camel (She-Camel)", nameSomali: "Hal", legacyAnimalType: "CAMEL", sortOrder: 2 },
      { slug: "qurbac", name: "Young Camel", nameSomali: "Qurbac", legacyAnimalType: "CAMEL", sortOrder: 3 },
      { slug: "qalin", name: "Young Female Camel", nameSomali: "Qalin", legacyAnimalType: "CAMEL", sortOrder: 4 },
      { slug: "baarqab", name: "Breeding Male Camel", nameSomali: "Baarqab", legacyAnimalType: "CAMEL", sortOrder: 5 },
    ],
  },
  {
    slug: "loda",
    name: "Cattle",
    nameSomali: "Lo'",
    description: "Cattle market category (Loda)",
    species: "CATTLE",
    sortOrder: 2,
    types: [
      { slug: "sac", name: "Cow (Female)", nameSomali: "Sac", legacyAnimalType: "CATTLE", sortOrder: 1 },
      { slug: "dibi", name: "Bull (Male)", nameSomali: "Dibi", legacyAnimalType: "CATTLE", sortOrder: 2 },
      { slug: "weyl", name: "Calf (Young)", nameSomali: "Weyl", legacyAnimalType: "CATTLE", sortOrder: 3 },
      { slug: "qaalin", name: "Heifer (Young Female)", nameSomali: "Qaalin", legacyAnimalType: "CATTLE", sortOrder: 4 },
    ],
  },
  {
    slug: "arri",
    name: "Sheep & Goats",
    nameSomali: "Ari & Ido",
    description: "Sheep and goat market category (Arriga)",
    species: "GOAT",
    sortOrder: 3,
    types: [
      { slug: "lax", name: "Ewe (Female Sheep)", nameSomali: "Lax", legacyAnimalType: "GOAT", sortOrder: 1 },
      { slug: "wan", name: "Ram (Male Sheep)", nameSomali: "Wan", legacyAnimalType: "GOAT", sortOrder: 2 },
      { slug: "caysan", name: "Lamb (Young Sheep)", nameSomali: "Caysan", legacyAnimalType: "GOAT", sortOrder: 3 },
      { slug: "orgi", name: "Young Sheep", nameSomali: "Orgi", legacyAnimalType: "GOAT", sortOrder: 4 },
      { slug: "neyl", name: "Sheep (General)", nameSomali: "Neyl", legacyAnimalType: "GOAT", sortOrder: 5 },
      { slug: "ri", name: "Buck (Male Goat)", nameSomali: "Ri", legacyAnimalType: "GOAT", sortOrder: 6 },
      { slug: "waxar", name: "Doe (Female Goat)", nameSomali: "Waxar", legacyAnimalType: "GOAT", sortOrder: 7 },
      { slug: "sabeen", name: "Kid (Young Goat)", nameSomali: "Sabeen", legacyAnimalType: "GOAT", sortOrder: 8 },
      { slug: "sumal", name: "Goat (General)", nameSomali: "Sumal", legacyAnimalType: "GOAT", sortOrder: 9 },
    ],
  },
];

/** Previous English slugs that must rename to the Somali type slug. */
const LEGACY_TYPE_SLUGS: Record<string, string[]> = {
  awr: ["male-camel"],
  hal: ["female-camel"],
  qurbac: ["young-camel"],
  qalin: ["young-female-camel"],
  baarqab: ["breeding-male-camel"],
  sac: ["cow"],
  dibi: ["bull"],
  weyl: ["calf"],
  qaalin: ["heifer"],
  ri: ["riyo"],
  waxar: ["wahar"],
};

export function formatBrokerCode(id: number) {
  return `LB-${String(id).padStart(5, "0")}`;
}

export function formatMarketCode(id: number) {
  return `MKT-${String(id).padStart(4, "0")}`;
}

export async function retireRemovedLivestockTypes() {
  await prisma.livestockAnimalType.updateMany({
    where: {
      OR: [
        { slug: { equals: "rati", mode: "insensitive" } },
        { nameSomali: { equals: "Rati", mode: "insensitive" } },
        { name: { equals: "Rati", mode: "insensitive" } },
        { name: { equals: "Camel (General)", mode: "insensitive" } },
      ],
      status: { not: "INACTIVE" },
    },
    data: { status: "INACTIVE" },
  });
}

export async function ensureLivestockCatalog() {
  await retireRemovedLivestockTypes();
  await prisma.livestockAnimalType.updateMany({
    where: { category: { slug: "arri" }, legacyAnimalType: "SHEEP" },
    data: { legacyAnimalType: "GOAT" },
  });
  await prisma.livestockPrice.updateMany({
    where: { animalType: "SHEEP" },
    data: { animalType: "GOAT" },
  });
  await prisma.livestockCategory.updateMany({
    where: { slug: "loda" },
    data: { nameSomali: "Lo'" },
  });
  const existingCount = await prisma.livestockCategory.count();
  if (existingCount === 0) {
    for (const category of DEFAULT_LIVESTOCK_CATEGORIES) {
      const row = await prisma.livestockCategory.create({
        data: {
          slug: category.slug,
          name: category.name,
          nameSomali: category.nameSomali,
          description: category.description,
          species: category.species,
          sortOrder: category.sortOrder,
          status: "ACTIVE",
        },
      });
      for (const type of category.types) {
        await prisma.livestockAnimalType.create({
          data: {
            categoryId: row.id,
            slug: type.slug,
            name: type.name,
            nameSomali: type.nameSomali,
            legacyAnimalType: type.legacyAnimalType,
            unit: "head",
            sortOrder: type.sortOrder,
            status: "ACTIVE",
          },
        });
      }
    }
  }

  await repairLivestockAnimalTypeDuplicates();

  return prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    include: {
      animalTypes: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function backfillLivestockAssignments() {
  const categories = await prisma.livestockCategory.findMany({
    include: { animalTypes: { where: { status: "ACTIVE" } } },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const brokers = await prisma.livestockBroker.findMany({
    where: { deletedAt: null },
    include: {
      assignedMarkets: true,
      authorizedCategories: true,
      authorizedTypes: true,
    },
  });

  for (const broker of brokers) {
    if (!broker.code) {
      await prisma.livestockBroker.update({
        where: { id: broker.id },
        data: { code: formatBrokerCode(broker.id) },
      });
    }
    if (broker.marketId && !broker.assignedMarkets.length) {
      await prisma.livestockBrokerMarket.upsert({
        where: {
          brokerId_marketId: { brokerId: broker.id, marketId: broker.marketId },
        },
        update: {},
        create: { brokerId: broker.id, marketId: broker.marketId },
      });
    }
    if (!broker.authorizedCategories.length) {
      const focus = `${broker.livestockFocus || ""} ${broker.name || ""} ${broker.email || ""}`.toLowerCase();
      const slug = focus.includes("camel") || focus.includes("geel")
        ? "geel"
        : focus.includes("goat") || focus.includes("sheep") || focus.includes("arri")
          ? "arri"
          : focus.includes("cattle") || focus.includes("loda")
            ? "loda"
            : null;
      const category = slug ? bySlug.get(slug) : null;
      if (category) {
        await prisma.livestockBrokerCategory.upsert({
          where: {
            brokerId_categoryId: { brokerId: broker.id, categoryId: category.id },
          },
          update: {},
          create: { brokerId: broker.id, categoryId: category.id },
        });
        if (!broker.authorizedTypes.length) {
          for (const type of category.animalTypes) {
            await prisma.livestockBrokerAnimalType.upsert({
              where: {
                brokerId_animalTypeId: {
                  brokerId: broker.id,
                  animalTypeId: type.id,
                },
              },
              update: {},
              create: { brokerId: broker.id, animalTypeId: type.id },
            });
          }
        }
      }
    }
  }

  const livestockMarkets = await prisma.market.findMany({
    where: { deletedAt: null, marketType: "LIVESTOCK" },
    include: { livestockCategories: true },
  });
  for (const market of livestockMarkets) {
    if (!market.code) {
      await prisma.market.update({
        where: { id: market.id },
        data: { code: formatMarketCode(market.id) },
      });
    }
  }
}

export async function ensureLivestockPermissions() {
  const permission = await prisma.permission.upsert({
    where: { code: "MANAGE_LIVESTOCK_CATALOG" },
    update: {
      name: "Manage Livestock Categories & Animal Types",
      module: "livestock",
    },
    create: {
      code: "MANAGE_LIVESTOCK_CATALOG",
      name: "Manage Livestock Categories & Animal Types",
      module: "livestock",
    },
  });

  for (const role of ["SUPER_ADMIN"] as const) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: { role, permissionId: permission.id },
      },
      update: {},
      create: { role, permissionId: permission.id },
    });
  }
}

export async function ensureBrokerCode(brokerId: number) {
  const broker = await prisma.livestockBroker.findUnique({
    where: { id: brokerId },
    select: { id: true, code: true },
  });
  if (!broker) return null;
  if (broker.code) return broker.code;
  const code = formatBrokerCode(broker.id);
  await prisma.livestockBroker.update({
    where: { id: broker.id },
    data: { code },
  });
  return code;
}

export async function ensureMarketCode(marketId: number) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { id: true, code: true },
  });
  if (!market) return null;
  if (market.code) return market.code;
  const code = formatMarketCode(market.id);
  await prisma.market.update({
    where: { id: market.id },
    data: { code },
  });
  return code;
}

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `type-${Date.now()}`;
}

/** Canonical catalog slug for a typed name within a category (Somali or English). */
export function canonicalAnimalTypeSlug(
  categorySlug: string,
  nameOrSomali: string
): string | null {
  const cat = DEFAULT_LIVESTOCK_CATEGORIES.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const key = nameOrSomali.trim().toLowerCase().replace(/'/g, "");
  if (!key) return null;
  const hit = cat.types.find((t) => {
    const aliases = [
      t.slug,
      t.nameSomali.toLowerCase(),
      t.name.toLowerCase(),
      slugFromName(t.nameSomali),
      slugFromName(t.name),
    ];
    return aliases.some((a) => a === key || a.replace(/'/g, "") === key);
  });
  return hit?.slug ?? null;
}

async function mergeAnimalTypeInto(fromId: number, intoId: number) {
  if (fromId === intoId) return;

  await prisma.livestockPrice.updateMany({
    where: { livestockTypeId: fromId },
    data: { livestockTypeId: intoId },
  });

  const brokerLinks = await prisma.livestockBrokerAnimalType.findMany({
    where: { animalTypeId: fromId },
  });
  for (const link of brokerLinks) {
    await prisma.livestockBrokerAnimalType.upsert({
      where: {
        brokerId_animalTypeId: {
          brokerId: link.brokerId,
          animalTypeId: intoId,
        },
      },
      update: {},
      create: { brokerId: link.brokerId, animalTypeId: intoId },
    });
    await prisma.livestockBrokerAnimalType.delete({
      where: {
        brokerId_animalTypeId: {
          brokerId: link.brokerId,
          animalTypeId: fromId,
        },
      },
    });
  }

  await prisma.livestockAnimalType.update({
    where: { id: fromId },
    data: { status: "INACTIVE" },
  });
}

/**
 * Fix duplicate / wrong-slug animal types (e.g. cow vs sac; male-camel vs awr).
 * Keeps the canonical catalog row ACTIVE and merges extras into it.
 */
export async function repairLivestockAnimalTypeDuplicates() {
  const categories = await prisma.livestockCategory.findMany({
    include: { animalTypes: true },
  });

  for (const category of categories) {
    const seed = DEFAULT_LIVESTOCK_CATEGORIES.find((c) => c.slug === category.slug);
    if (!seed) continue;

    for (const typeSeed of seed.types) {
      const somaliKey = typeSeed.nameSomali.trim().toLowerCase();
      const somaliSlug = slugFromName(typeSeed.nameSomali);
      const candidates = category.animalTypes.filter((t) => {
        const so = (t.nameSomali || "").trim().toLowerCase();
        const en = (t.name || "").trim().toLowerCase();
        const slug = (t.slug || "").trim().toLowerCase();
        if (slug === typeSeed.slug) return true;
        if (LEGACY_TYPE_SLUGS[typeSeed.slug]?.includes(slug)) return true;
        if (so === somaliKey || en === somaliKey) return true;
        if (en === typeSeed.name.toLowerCase()) return true;
        if (slug === somaliSlug || slug.startsWith(`${somaliSlug}-`)) return true;
        return false;
      });

      if (candidates.length === 0) continue;

      const keeper =
        candidates.find((t) => t.slug === typeSeed.slug) ||
        candidates.slice().sort((a, b) => a.id - b.id)[0];

      if (keeper.slug !== typeSeed.slug || keeper.status !== "ACTIVE") {
        // Ensure canonical slug is free before rename
        if (keeper.slug !== typeSeed.slug) {
          const clash = category.animalTypes.find(
            (t) => t.id !== keeper.id && t.slug === typeSeed.slug
          );
          if (clash) {
            await mergeAnimalTypeInto(clash.id, keeper.id);
            clash.status = "INACTIVE";
          }
          await prisma.livestockAnimalType.update({
            where: { id: keeper.id },
            data: {
              slug: typeSeed.slug,
              name: typeSeed.name,
              nameSomali: typeSeed.nameSomali,
              legacyAnimalType: typeSeed.legacyAnimalType,
              sortOrder: typeSeed.sortOrder,
              status: "ACTIVE",
            },
          });
          keeper.slug = typeSeed.slug;
          keeper.status = "ACTIVE";
        } else {
          await prisma.livestockAnimalType.update({
            where: { id: keeper.id },
            data: {
              name: typeSeed.name,
              nameSomali: typeSeed.nameSomali,
              legacyAnimalType: typeSeed.legacyAnimalType,
              sortOrder: typeSeed.sortOrder,
              status: "ACTIVE",
            },
          });
          keeper.status = "ACTIVE";
        }
      }

      for (const extra of candidates) {
        if (extra.id === keeper.id) continue;
        if (extra.status === "INACTIVE" && extra.slug === typeSeed.slug) continue;
        await mergeAnimalTypeInto(extra.id, keeper.id);
        extra.status = "INACTIVE";
      }
    }
  }
}

const SPECIES_VALUES: AnimalType[] = ["CAMEL", "CATTLE", "GOAT", "SHEEP", "POULTRY"];

/** Map a typed category name (or an explicit kind) onto the Prisma AnimalType enum. */
export function inferLivestockSpecies(name: string, explicit?: string | null): AnimalType {
  const raw = String(explicit || "").toUpperCase();
  if (SPECIES_VALUES.includes(raw as AnimalType)) return raw as AnimalType;
  const hay = name.toLowerCase();
  if (hay.includes("camel") || hay.includes("geel")) return "CAMEL";
  if (hay.includes("cattle") || hay.includes("loda") || hay.includes("cow") || hay.includes("lo'")) {
    return "CATTLE";
  }
  if (hay.includes("sheep") || hay.includes("goat") || hay.includes("ari")) return "GOAT";
  if (hay.includes("poultry") || hay.includes("chicken") || hay.includes("digaag")) return "POULTRY";
  return "POULTRY";
}

export const LIVESTOCK_UNITS = ["head", "pair", "lot", "kg"] as const;
export const LIVESTOCK_CURRENCIES = ["USD", "SOS"] as const;

export type LivestockStatusFilter = AccountStatus | "ALL";

export async function isRegisteredLivestockCategory(value: string): Promise<boolean> {
  const raw = value.trim();
  if (!raw) return false;
  if (raw === ALL_LIVESTOCK_TYPES) return true;
  const hay = raw.toLowerCase();
  if (
    hay === "camel market section" ||
    hay === "cattle market section" ||
    hay === "goat market section"
  ) {
    return true;
  }
  const row = await prisma.livestockCategory.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { slug: raw },
        { slug: hay },
        { name: { equals: raw, mode: "insensitive" } },
        { nameSomali: { equals: raw, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function areRegisteredLivestockTypeChoices(
  value: string
): Promise<boolean> {
  const parts = parseLivestockTypeChoices(value);
  if (!parts.length) return false;
  if (parts.includes(ALL_LIVESTOCK_TYPES)) return true;
  for (const part of parts) {
    if (!(await isRegisteredLivestockCategory(part))) return false;
  }
  return true;
}

export async function listPublicLivestockCatalog() {
  await retireRemovedLivestockTypes();
  const categories = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    include: {
      animalTypes: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  const hiddenBySlug = new Map<string, string[]>();
  for (const category of categories) {
    if (!isLivestockCategorySlug(category.slug)) continue;
    const animalTypes = animalTypesFromCategory(category.slug);
    const [liveRows, hiddenRows] = await Promise.all([
      prisma.livestockPrice.findMany({
        where: publicLivestockBoardWhere(animalTypes),
        include: {
          livestockType: { select: { name: true, nameSomali: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 400,
      }),
      prisma.livestockPrice.findMany({
        where: { deletedAt: { not: null }, animalType: { in: animalTypes } },
        select: { category: true, description: true },
        take: 400,
      }),
    ]);
    hiddenBySlug.set(
      category.slug,
      hiddenTypeKeysFromDeletedRows(
        hiddenRows,
        typeNamedFields(mapPublicBoardPriceRows(liveRows))
      )
    );
  }
  return categories.map((category) => ({
    slug: category.slug,
    nameEn: category.name,
    nameSo: category.nameSomali?.trim() || category.name,
    imageUrl: category.imageUrl?.trim() || null,
    hiddenNames: hiddenBySlug.get(category.slug) || [],
    types: (() => {
      const seen = new Set<string>();
      const types: { id: number; nameEn: string; nameSo: string }[] = [];
      for (const type of category.animalTypes) {
        if (isRetiredLivestockType(type.slug, type.name, type.nameSomali)) continue;
        let nameSo = type.nameSomali?.trim() || type.name;
        if (/^gurbac$/i.test(nameSo.trim())) nameSo = "Qurbac";
        const canon = nameSo.trim().toLowerCase() === "gurbac" ? "qurbac" : nameSo.trim().toLowerCase();
        if (canon === "qurbac" && seen.has("qurbac")) continue;
        if (canon && seen.has(canon)) continue;
        if (canon) seen.add(canon);
        types.push({
          id: type.id,
          nameEn: type.name,
          nameSo,
        });
      }
      return types;
    })(),
  }));
}
