import type { AnimalType, PriceStatus } from "@prisma/client";
import type { LivestockCategorySlug } from "@/lib/livestock-data";
import {
  categoryTypePrices,
  isLivestockCategorySlug,
  LIVESTOCK_PRICE_SECTIONS,
  LIVESTOCK_TYPE_EN,
  livestockTypeLabel,
} from "@/lib/livestock-data";
import { livestockSpeciesLabel } from "@/lib/register-flow";
import { ageClassKey, originPlaceKey } from "@/lib/livestock-listing-meta";

export type SeasonKey = "birimo" | "sugunto";
export type BoardSeasonKey = SeasonKey | "sabeen";
export type GenderKey = "male" | "female";

export const SECTION_PRICE_KEYS = [
  "BIRIMO_MALE",
  "BIRIMO_FEMALE",
  "SUGUNTO_MALE",
  "SUGUNTO_FEMALE",
] as const;

export type SectionPriceKey = (typeof SECTION_PRICE_KEYS)[number];

export function categorySlugFromAnimal(
  animal: string | null | undefined
): LivestockCategorySlug {
  const raw = (animal || "").trim();
  const lower = raw.toLowerCase();
  if (isLivestockCategorySlug(lower)) return lower;
  const upper = raw.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) return "geel";
  if (
    upper.includes("GOAT") ||
    upper.includes("SHEEP") ||
    upper.includes("ARRI") ||
    upper.includes("ARI")
  ) {
    return "arri";
  }
  return "loda";
}

export function categorySlugFromBroker(opts: {
  livestockFocus?: string | null;
  name?: string | null;
  companyType?: string | null;
}): LivestockCategorySlug {
  const species =
    livestockSpeciesLabel(opts.livestockFocus, opts.name, opts.companyType);
  const animal =
    species === "Camel"
      ? "CAMEL"
      : species === "Goat"
        ? "GOAT"
        : species === "Cattle"
          ? "CATTLE"
          : null;
  return categorySlugFromAnimal(animal || "CATTLE");
}

export function animalTypeFromCategory(
  slug: string
): AnimalType {
  if (slug === "geel") return "CAMEL";
  if (slug === "arri") return "GOAT";
  if (slug === "loda") return "CATTLE";
  return "CAMEL";
}

export function animalTypesFromCategory(
  slug: string
): AnimalType[] {
  if (slug === "geel") return ["CAMEL"];
  if (slug === "arri") return ["GOAT", "SHEEP"];
  if (slug === "loda") return ["CATTLE"];
  return ["CAMEL"];
}

export function sectionPriceKey(
  season: SeasonKey,
  gender: GenderKey
): SectionPriceKey {
  return `${season.toUpperCase()}_${gender.toUpperCase()}` as SectionPriceKey;
}

export function parseSectionPriceKey(
  category: string | null | undefined
): { season: SeasonKey; gender: GenderKey } | null {
  const raw = (category || "").toUpperCase().replace(/\s+/g, "_");
  if (!SECTION_PRICE_KEYS.includes(raw as SectionPriceKey)) return null;
  const [season, gender] = raw.split("_") as [string, string];
  return {
    season: season.toLowerCase() as SeasonKey,
    gender: gender.toLowerCase() as GenderKey,
  };
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function parseUsd(raw: string): number {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const MAX_LIVESTOCK_PRICE_USD = 3000;

export function livestockPriceError(price: number): string | null {
  if (!Number.isFinite(price) || price <= 0) {
    return "Enter a valid price greater than zero.";
  }
  if (price > MAX_LIVESTOCK_PRICE_USD) {
    return `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`;
  }
  return null;
}

export type SectionPriceMap = Record<
  SeasonKey,
  Record<GenderKey, string>
>;

function defaultPrice(
  slug: LivestockCategorySlug,
  season: SeasonKey,
  gender: GenderKey
): string {
  const sectionId = season === "birimo" ? "barimada-caadiga" : "sekontada";
  const section = LIVESTOCK_PRICE_SECTIONS.find((s) => s.id === sectionId);
  const row = section?.rows.find((r) =>
    gender === "male"
      ? r.labelEn === "Male" || r.label === "Labka" || r.label === "Lab"
      : r.labelEn === "Female" || r.label === "Dhedig"
  );
  return row?.[slug] || "$0";
}

export function defaultSectionPrices(
  slug: LivestockCategorySlug
): SectionPriceMap {
  return {
    birimo: {
      male: defaultPrice(slug, "birimo", "male"),
      female: defaultPrice(slug, "birimo", "female"),
    },
    sugunto: {
      male: defaultPrice(slug, "sugunto", "male"),
      female: defaultPrice(slug, "sugunto", "female"),
    },
  };
}

export function overlaySectionPrices(
  slug: LivestockCategorySlug,
  rows: { category?: string | null; price: number | string }[]
): SectionPriceMap {
  const map = defaultSectionPrices(slug);
  for (const row of rows) {
    const parsed = parseSectionPriceKey(row.category);
    if (!parsed) continue;
    const n = typeof row.price === "number" ? row.price : parseUsd(String(row.price));
    map[parsed.season][parsed.gender] = formatUsd(n);
  }
  return map;
}

export type NamedPriceField = {
  id?: number;
  category: string;
  name: string;
  nameEn?: string;
  price: number;
  season: SeasonKey;
  status?: string;
  rejectionReason?: string;
  ageClass?: string | null;
  originPlace?: string | null;
};

export function tabSeason(season: BoardSeasonKey | string | undefined): SeasonKey {
  return String(season || "").toLowerCase().includes("sugunto") ? "sugunto" : "birimo";
}

const CUSTOM_FIELD_RE = /^FIELD_(BIRIMO|SUGUNTO|SABEEN)_([A-Z0-9_]{1,64})$/;

export function sectionPriceCategoryFilter() {
  return {
    OR: [
      { category: { in: [...SECTION_PRICE_KEYS] } },
      { category: { startsWith: "FIELD_BIRIMO_" } },
      { category: { startsWith: "FIELD_SUGUNTO_" } },
      { category: { startsWith: "FIELD_SABEEN_" } },
    ],
  };
}

/** Approved livestock rows that should appear on public / broker boards. */
export function approvedLivestockBoardWhere(animalTypes: AnimalType[]) {
  return {
    deletedAt: null,
    status: "APPROVED" as const,
    animalType: { in: animalTypes },
  };
}

/** Public type names follow the livestock admin; prices stay approved when available. */
export function publicLivestockBoardWhere(animalTypes: AnimalType[]) {
  return {
    deletedAt: null,
    status: "APPROVED" as PriceStatus,
    animalType: { in: animalTypes },
    OR: [
      { brokerId: null },
      { broker: { is: { deletedAt: null, status: "ACTIVE" as const } } },
    ],
    AND: [
      {
        OR: [
          { marketId: null },
          { market: { is: { deletedAt: null, status: "ACTIVE" as const } } },
        ],
      },
    ],
  };
}

export function mapPublicBoardPriceRows(
  rows: Array<{
    status: string;
    category: string | null;
    description: string | null;
    price: unknown;
    livestockTypeId?: number | null;
    livestockType?: { name: string; nameSomali: string | null } | null;
    ageClass?: string | null;
    originPlace?: string | null;
  }>
) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (
      isRetiredLivestockType(
        row.description,
        row.livestockType?.name,
        row.livestockType?.nameSomali
      )
    ) {
      continue;
    }
    const key = livestockBoardRowKey(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.values()].map((list) => {
    const newest = list[0];
    const approved = list.find((row) => row.status === "APPROVED");
    return {
      category: newest.category,
      description:
        newest.description?.trim() ||
        newest.livestockType?.nameSomali?.trim() ||
        newest.livestockType?.name ||
        null,
      livestockTypeName:
        newest.livestockType?.nameSomali?.trim() || newest.livestockType?.name || null,
      livestockTypeNameEn: newest.livestockType?.name || null,
      livestockTypeId: newest.livestockTypeId ?? null,
      price: approved ? Number(approved.price) : 0,
      ageClass: approved?.ageClass || newest.ageClass || null,
      originPlace: approved?.originPlace || newest.originPlace || null,
    };
  });
}

export function isAllowedPriceCategory(category: string): boolean {
  const raw = category.toUpperCase();
  return (
    SECTION_PRICE_KEYS.includes(raw as SectionPriceKey) ||
    CUSTOM_FIELD_RE.test(raw)
  );
}

export function parseFieldCategory(
  category: string | null | undefined
): { season: BoardSeasonKey; isCustom: boolean } | null {
  const raw = (category || "").toUpperCase().replace(/\s+/g, "_");
  const section = parseSectionPriceKey(raw);
  if (section) return { season: section.season, isCustom: false };
  const match = raw.match(CUSTOM_FIELD_RE);
  if (!match) return null;
  const rawSeason = match[1].toLowerCase();
  return {
    season: (rawSeason === "sabeen" ? "birimo" : rawSeason) as BoardSeasonKey,
    isCustom: true,
  };
}

export function seasonFromCategoryLabel(
  raw?: string | null
): BoardSeasonKey {
  const u = (raw || "").toUpperCase().replace(/\s+/g, "_");
  if (u.includes("SUGUNTO") || u.includes("SEKONT")) return "sugunto";
  if (u.includes("SABEEN") || u.includes("SABEN")) return "birimo";
  const parsed = parseFieldCategory(raw);
  if (parsed) return parsed.season === "sabeen" ? "birimo" : parsed.season;
  return "birimo";
}

/** Birimo / Sugunto class labels (First Class / Second Class). Not calendar seasons. */
export const PRICE_SEASON_LABELS = ["Birimo", "Sugunto"] as const;
export type PriceSeasonLabel = (typeof PRICE_SEASON_LABELS)[number];
/** Alias: Birimo/Sugunto are class types, not sessions. */
export const PRICE_CLASS_LABELS = PRICE_SEASON_LABELS;

export function displaySeasonLabel(raw?: string | null): PriceSeasonLabel {
  return seasonFromCategoryLabel(raw) === "sugunto" ? "Sugunto" : "Birimo";
}

/** English class names: First Class (Birimo) / Second Class (Sugunto). */
export function publicSeasonLabelEn(season: "birimo" | "sugunto" | string): string {
  return String(season).toLowerCase().includes("sugunto") ? "Second Class" : "First Class";
}

/** Somali class names: Birimo / Sugunto. */
export function publicSeasonLabelSo(season: "birimo" | "sugunto" | string): string {
  return String(season).toLowerCase().includes("sugunto") ? "Sugunto" : "Birimo";
}

export function canonicalTypeName(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const aliases: Record<string, string> = {
    bull: "Dibi",
    cow: "Sac",
    calf: "Weyl",
    heifer: "Qaalin",
    caysano: "Caysan",
    ceysano: "Caysan",
    ceysan: "Caysan",
    ceysaan: "Caysan",
    caysaan: "Caysan",
    cayso: "Caysan",
    ewe: "Lax",
    "ewe (female sheep)": "Lax",
    ram: "Wan",
    "ram (male sheep)": "Wan",
    lamb: "Caysan",
    "lamb (young sheep)": "Caysan",
    "young sheep": "Orgi",
    "yearling sheep": "Orgi",
    "sheep (general)": "Neyl",
    nayl: "Neyl",
    "neyl / nayl": "Neyl",
    "buck (male goat)": "Ri",
    "doe (female goat)": "Waxar",
    "kid (young goat)": "Sabeen",
    "goat (general)": "Sumal",
    "female camel": "Hal",
    "female camel (she-camel)": "Hal",
    "camel (general)": "Rati",
    "cow (female)": "Sac",
    "bull (male)": "Dibi",
    "calf (young)": "Weyl",
    "heifer (young female)": "Qaalin",
    wahaar: "Waxar",
    wahar: "Waxar",
    "wahar / wahaar": "Waxar",
    waxar: "Waxar",
    riyo: "Ri",
    ri: "Ri",
    nirig: "Qurbac",
    gurbac: "Qurbac",
    qurbac: "Qurbac",
    "gurbac / nirig": "Qurbac",
    suman: "Sumal",
    baarbo: "Baarqab",
    "baar bo": "Baarqab",
    "baar qab": "Baarqab",
    barqab: "Baarqab",
  };
  if (aliases[lower]) return aliases[lower];
  for (const [somali, english] of Object.entries(LIVESTOCK_TYPE_EN)) {
    if (somali.toLowerCase() === lower || english.toLowerCase() === lower) {
      if (somali === "Caysano" || somali === "Ceysano" || somali === "Ceysan") {
        return "Caysan";
      }
      return somali;
    }
  }
  const spaced = trimmed.replace(/_/g, " ");
  for (const somali of Object.keys(LIVESTOCK_TYPE_EN)) {
    if (spaced.toLowerCase() === somali.toLowerCase()) {
      if (somali === "Caysano" || somali === "Ceysano" || somali === "Ceysan") {
        return "Caysan";
      }
      return somali;
    }
  }
  return aliases[spaced.toLowerCase()] || trimmed;
}

export const RETIRED_LIVESTOCK_TYPE_ERROR =
  "Rati lagama gelin karo. Noocan waa laga saaray nidaamka.";

/** Retired types stay out of broker, public, and admin create/select lists. */
export function isRetiredLivestockType(
  ...values: Array<string | null | undefined>
): boolean {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    if (canonicalTypeName(raw).trim().toLowerCase() === "rati") return true;
  }
  return false;
}

export function withoutRetiredLivestockFields<T extends { name?: string | null }>(
  fields: T[]
): T[] {
  return fields.filter((field) => !isRetiredLivestockType(field.name));
}

function isGenericSpeciesLabel(name: string): boolean {
  return /^(goat|sheep|camel|cattle|lab|labka|dhedig|male|female|geelka?|lo'?da|loda|arriga|ariyaha|type)$/i.test(
    name.trim()
  );
}

export function sameLivestockTypeName(a?: string | null, b?: string | null): boolean {
  const left = canonicalTypeName(a).toLowerCase();
  const right = canonicalTypeName(b).toLowerCase();
  return Boolean(left && right && left === right);
}

function resolveBoardTypeName(row: {
  category?: string | null;
  description?: string | null;
  livestockTypeName?: string | null;
}): string {
  const fromDescRaw = String(row.description || "").trim();
  if (fromDescRaw && !isGenericSpeciesLabel(fromDescRaw)) {
    return canonicalTypeName(fromDescRaw) || fromDescRaw;
  }
  const fromField = canonicalTypeName(defaultNameForCategory(String(row.category || "")));
  const fromType = canonicalTypeName(row.livestockTypeName);
  const catalogHit = [fromField, fromType].find(
    (name) => name && !isGenericSpeciesLabel(name) && LIVESTOCK_TYPE_EN[name]
  );
  if (catalogHit) return catalogHit;
  const specific = [fromField, fromType].find(
    (name) => name && !isGenericSpeciesLabel(name)
  );
  return specific || fromField || fromType || "";
}

export function fieldCategoryFromTypeName(
  season: BoardSeasonKey,
  typeName: string
): string {
  const token = canonicalTypeName(typeName)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return `FIELD_${season.toUpperCase()}_${token || "TYPE"}`;
}

export function defaultNameForCategory(category: string): string {
  const raw = category.toUpperCase();
  if (raw === "BIRIMO_MALE" || raw === "SUGUNTO_MALE") return "Male";
  if (raw === "BIRIMO_FEMALE" || raw === "SUGUNTO_FEMALE") return "Female";
  const match = raw.match(CUSTOM_FIELD_RE);
  if (!match) return category;
  return match[2]
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function newCustomFieldCategory(season: SeasonKey): string {
  const token = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();
  return `FIELD_${season.toUpperCase()}_${token}`;
}

function parseUsdFirst(raw: string): number {
  return parseUsd(String(raw).split(/[–—-]/)[0] || "0");
}

export function officialTypeNameSet(slug: string): Set<string> {
  const names = new Set<string>();
  if (!isLivestockCategorySlug(slug)) return names;
  for (const season of ["birimo", "sugunto"] as SeasonKey[]) {
    for (const row of categoryTypePrices(slug, season)) {
      const canon = canonicalTypeName(row.name).trim().toLowerCase();
      if (canon) names.add(canon);
    }
  }
  return names;
}

function isOfficialTypeName(slug: string, name: string) {
  const canon = canonicalTypeName(name).trim().toLowerCase();
  return Boolean(canon && officialTypeNameSet(slug).has(canon));
}

export function defaultNamedFields(
  slug: LivestockCategorySlug,
  opts?: { emptyPrices?: boolean }
): NamedPriceField[] {
  const emptyPrices = Boolean(opts?.emptyPrices);
  return (["birimo", "sugunto"] as SeasonKey[]).flatMap((season) => {
    const list = categoryTypePrices(slug, season);
    return list.map((row) => ({
      category: `FIELD_${season.toUpperCase()}_${row.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}`,
      name: row.name,
      price: emptyPrices ? 0 : parseUsdFirst(row.price),
      season,
    }));
  });
}

export type BoardPriceRow = {
  id?: number;
  category?: string | null;
  description?: string | null;
  price: number | string;
  livestockTypeName?: string | null;
  livestockTypeNameEn?: string | null;
  ageClass?: string | null;
  originPlace?: string | null;
};

export function normalizeBoardRow(row: BoardPriceRow): {
  category: string;
  description: string;
  price: number | string;
  season: BoardSeasonKey;
  nameEn?: string;
} | null {
  const typeName = resolveBoardTypeName(row);
  const parsed = parseFieldCategory(row.category);
  const nameEn = row.livestockTypeNameEn?.trim() || undefined;
  if (parsed) {
    const category = String(row.category || "").toUpperCase();
    return {
      category,
      description: typeName || defaultNameForCategory(category),
      price: row.price,
      season: parsed.season,
      nameEn,
    };
  }
  const name =
    typeName ||
    canonicalTypeName(String(row.category || "").trim()) ||
    "";
  if (!name) return null;
  const season = seasonFromCategoryLabel(row.category);
  return {
    category: fieldCategoryFromTypeName(season, name),
    description: name,
    price: row.price,
    season,
    nameEn,
  };
}

export function rowsToNamedFields(rows: BoardPriceRow[]): NamedPriceField[] {
  const fields: NamedPriceField[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeBoardRow(row);
    if (!normalized) continue;
    const seenKey = `${normalized.category}|${ageClassKey(row.ageClass)}|${originPlaceKey(row.originPlace)}`;
    if (seen.has(seenKey)) continue;
    seen.add(seenKey);
    const price =
      typeof normalized.price === "number"
        ? normalized.price
        : parseUsd(String(normalized.price));
    fields.push({
      id: row.id,
      category: normalized.category,
      name: normalized.description,
      nameEn: normalized.nameEn || livestockTypeLabel(normalized.description, "en"),
      price,
      season: tabSeason(normalized.season),
      ageClass: row.ageClass || null,
      originPlace: row.originPlace || null,
    });
  }
  return fields;
}

export function isLegacyGenderCategory(category: string): boolean {
  return SECTION_PRICE_KEYS.includes(
    category.toUpperCase() as SectionPriceKey
  );
}

export function livestockBoardRowKey(row: {
  livestockTypeId?: number | null;
  category?: string | null;
  ageClass?: string | null;
  originPlace?: string | null;
}) {
  const season = seasonFromCategoryLabel(row.category);
  const age = ageClassKey(row.ageClass);
  const origin = originPlaceKey(row.originPlace);
  const base = row.livestockTypeId
    ? `t:${row.livestockTypeId}:${season}`
    : `c:${String(row.category || "").toUpperCase()}`;
  return `${base}:${age}:${origin}`;
}

/** Group editor/public rows by type name + season so approved prices are not hidden. */
export function livestockEditorGroupKey(row: {
  livestockTypeId?: number | null;
  category?: string | null;
  description?: string | null;
  livestockType?: { name: string; nameSomali: string | null } | null;
}) {
  const season = seasonFromCategoryLabel(row.category);
  const name = canonicalTypeName(
    row.description ||
      row.livestockType?.nameSomali ||
      row.livestockType?.name ||
      defaultNameForCategory(String(row.category || ""))
  );
  if (name && !isGenericSpeciesLabel(name)) {
    return `n:${season}:${name.toLowerCase()}`;
  }
  return livestockBoardRowKey(row);
}

export function pickLatestEditorRows<
  T extends { status: string; price: unknown },
>(rows: T[], keyOf: (row: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (String(row.status).toUpperCase() !== "APPROVED") continue;
    if (!(Number(row.price) > 0)) continue;
    const key = keyOf(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.values()].map((list) => list[0]!);
}

export function pickPendingEditorRows<
  T extends { status: string; price: unknown },
>(rows: T[], _keyOf?: (row: T) => string): T[] {
  void _keyOf;
  return rows.filter((row) => {
    const status = String(row.status).toUpperCase();
    return (
      (status === "PENDING" || status === "REJECTED") && Number(row.price) > 0
    );
  });
}

export function typeNamedFields(rows: BoardPriceRow[]): NamedPriceField[] {
  return withoutRetiredLivestockFields(
    rowsToNamedFields(rows).filter(
      (field) => !isLegacyGenderCategory(field.category)
    )
  );
}

export function hiddenTypeKeysFromDeletedRows(
  deletedRows: { category?: string | null; description?: string | null }[],
  liveFields: NamedPriceField[]
): string[] {
  const liveKeys = new Set(
    liveFields.map(
      (f) => `${tabSeason(f.season)}:${canonicalTypeName(f.name).trim().toLowerCase()}`
    )
  );
  const official = new Set([
    ...officialTypeNameSet("geel"),
    ...officialTypeNameSet("loda"),
    ...officialTypeNameSet("arri"),
  ]);
  const keys: string[] = [];
  for (const row of deletedRows) {
    const season = String(row.category || "").toLowerCase().includes("sugunto")
      ? "sugunto"
      : "birimo";
    const name = canonicalTypeName(row.description || "").trim().toLowerCase();
    if (!name || official.has(name)) continue;
    const key = `${season}:${name}`;
    if (!liveKeys.has(key)) keys.push(key);
  }
  return keys;
}

export function namedFieldsOrDefaults(
  slug: LivestockCategorySlug,
  rows: BoardPriceRow[],
  omit?: { categories?: string[]; names?: string[] }
): NamedPriceField[] {
  const omitCats = new Set(
    (omit?.categories || []).map((c) => c.toUpperCase()).filter(Boolean)
  );
  const omitNames = new Set(
    (omit?.names || []).map((n) => n.trim().toLowerCase()).filter(Boolean)
  );
  const live = typeNamedFields(rows);
  const defaults = defaultNamedFields(slug, { emptyPrices: true });
  const liveByKey = new Map<string, NamedPriceField>();
  const liveByCategory = new Map<string, NamedPriceField>();
  for (const field of live) {
    liveByKey.set(
      `${tabSeason(field.season)}:${canonicalTypeName(field.name).toLowerCase()}`,
      field
    );
    liveByCategory.set(field.category.toUpperCase(), field);
  }
  const catalogKeys = new Set<string>();
  const usedLive = new Set<string>();
  const merged: NamedPriceField[] = [];
  for (const field of defaults) {
    const key = `${field.season}:${canonicalTypeName(field.name).toLowerCase()}`;
    catalogKeys.add(key);
    if (
      !isOfficialTypeName(slug, field.name) &&
      (omitCats.has(field.category.toUpperCase()) ||
        omitNames.has(key) ||
        omitNames.has(canonicalTypeName(field.name).toLowerCase()))
    ) {
      continue;
    }
    const hit =
      liveByCategory.get(field.category.toUpperCase()) || liveByKey.get(key);
    if (!hit) {
      merged.push(field);
      continue;
    }
    usedLive.add(hit.category.toUpperCase());
    merged.push({
      ...field,
      id: hit.id,
      name: hit.name.trim() || field.name,
      price: hit.price > 0 ? hit.price : field.price,
      category: hit.category || field.category,
      ageClass: hit.ageClass || field.ageClass,
      originPlace: hit.originPlace || field.originPlace,
    });
  }
  for (const field of live) {
    if (usedLive.has(field.category.toUpperCase())) continue;
    const key = `${tabSeason(field.season)}:${canonicalTypeName(field.name).toLowerCase()}`;
    if (
      omitCats.has(field.category.toUpperCase()) ||
      omitNames.has(key)
    ) {
      continue;
    }
    usedLive.add(field.category.toUpperCase());
    merged.push({ ...field, season: tabSeason(field.season) });
  }
  const seenSugunto = new Set(
    merged
      .filter((f) => f.season === "sugunto")
      .map((f) => canonicalTypeName(f.name).toLowerCase())
  );
  for (const field of merged.filter((f) => f.season === "birimo")) {
    const nameKey = canonicalTypeName(field.name).toLowerCase();
    if (!nameKey || seenSugunto.has(nameKey)) continue;
    seenSugunto.add(nameKey);
    merged.push({
      category: fieldCategoryFromTypeName("sugunto", field.name),
      name: field.name,
      nameEn: field.nameEn,
      price: 0,
      season: "sugunto",
    });
  }
  return withoutRetiredLivestockFields(merged);
}

export function brokerTypePriceBoard(
  slug: LivestockCategorySlug
): { name: string; nameEn: string; price: string }[] {
  return overlayCatalogTypeBoard(slug, [], "birimo");
}

export function overlayCatalogTypeBoard(
  slug: string,
  fields: NamedPriceField[],
  season: SeasonKey = "birimo",
  opts?: {
    useCatalogWhenEmpty?: boolean;
    omitNames?: string[];
    catalogTypes?: { nameSo: string; nameEn: string }[];
    /** Public sector: only approved types that already have a price. */
    liveOnly?: boolean;
  }
): {
  name: string;
  nameEn: string;
  price: string;
  ageClass?: string | null;
  originPlace?: string | null;
}[] {
  const builtin = isLivestockCategorySlug(slug);
  const useCatalogWhenEmpty = opts?.useCatalogWhenEmpty !== false;
  const liveOnly = Boolean(opts?.liveOnly);
  const omit = new Set(
    (opts?.omitNames || []).map((n) => n.trim().toLowerCase()).filter(Boolean)
  );
  const hidden = (name: string) => {
    if (isRetiredLivestockType(name)) return true;
    if (isOfficialTypeName(slug, name)) return false;
    const raw = name.trim().toLowerCase();
    const canon = canonicalTypeName(name).trim().toLowerCase() || raw;
    return (
      omit.has(raw) ||
      omit.has(canon) ||
      omit.has(`${season}:${raw}`) ||
      omit.has(`${season}:${canon}`)
    );
  };

  const catalog =
    opts?.catalogTypes != null
      ? opts.catalogTypes.map((row) => ({
          name: row.nameSo,
          nameEn: row.nameEn,
          price: "—",
        }))
      : builtin
        ? categoryTypePrices(slug, season)
        : [];
  const seasonFields = fields.filter(
    (field) => tabSeason(field.season) === season && field.name.trim()
  );

  const shown = new Set<string>();
  const board: {
    name: string;
    nameEn: string;
    price: string;
    ageClass?: string | null;
    originPlace?: string | null;
  }[] = [];

  function pushRow(
    name: string,
    priceLabel: string,
    nameEn?: string,
    ageClass?: string | null,
    originPlace?: string | null
  ) {
    const label = name.trim();
    if (!label || hidden(label)) return;
    const key = `${label.toLowerCase()}|${priceLabel}|${ageClassKey(ageClass)}|${originPlaceKey(originPlace)}`;
    if (shown.has(key)) return;
    shown.add(key);
    board.push({
      name: label,
      nameEn: nameEn || livestockTypeLabel(label, "en") || label,
      price: priceLabel,
      ageClass: ageClass || null,
      originPlace: originPlace || null,
    });
  }

  for (const row of catalog) {
    const hits = seasonFields.filter((f) => {
      const sameName =
        canonicalTypeName(f.name).toLowerCase() ===
          canonicalTypeName(row.name).toLowerCase() ||
        f.name.trim().toLowerCase() === row.name.trim().toLowerCase();
      return sameName;
    });
    if (hits.length) {
      for (const hit of hits) {
        if (!liveOnly || hit.price > 0) {
          pushRow(
            hit.name.trim(),
            hit.price > 0 ? formatUsd(hit.price) : "—",
            hit.nameEn || row.nameEn || livestockTypeLabel(hit.name.trim(), "en"),
            hit.ageClass,
            hit.originPlace
          );
        }
      }
      continue;
    }
    if (!liveOnly) {
      pushRow(
        row.name,
        "—",
        row.nameEn || livestockTypeLabel(row.name, "en")
      );
    }
  }

  if (builtin || liveOnly) {
    for (const field of seasonFields) {
      if (liveOnly && !(field.price > 0)) continue;
      if (opts?.catalogTypes != null) {
        const want = canonicalTypeName(field.name).toLowerCase();
        const allowed = opts.catalogTypes.some((row) => {
          const so = canonicalTypeName(row.nameSo).toLowerCase();
          const en = canonicalTypeName(row.nameEn).toLowerCase();
          return so === want || en === want;
        });
        if (!allowed) continue;
      }
      pushRow(
        field.name.trim(),
        field.price > 0 ? formatUsd(field.price) : "—",
        field.nameEn,
        field.ageClass,
        field.originPlace
      );
    }
  }

  if (board.length > 0) return board;
  if (liveOnly || !useCatalogWhenEmpty) return [];
  return catalog
    .filter((row) => !hidden(row.name))
    .map((row) => ({
      name: row.name,
      nameEn:
        "nameEn" in row && row.nameEn
          ? String(row.nameEn)
          : livestockTypeLabel(row.name, "en") || row.name,
      price: "price" in row ? String(row.price) : "—",
    }));
}
