import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CompanyProfileOverride = {
  slug: string;
  phone?: string;
  phoneHint?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  addressLabel?: string;
  location?: string;
  businessHours?: string;
  waterSource?: string;
  supplyType?: string;
  callCenter?: string;
  facebook?: string;
  tagline?: string;
  description?: string;
  infoTitle?: string;
  infoBrief?: string;
  infoPoints?: string[];
  currentPrice?: string;
  somali?: string;
  /** Hero Provider card label (e.g. MPS / BECO) */
  providerLabel?: string;
  /** Full company name on listing cards (cardLabel / name) */
  companyName?: string;
  /** Public logo path e.g. /uploads/companies/beco-logo.png */
  image?: string;
  /** USD per kWh (electricity) or per m³ (water) by calendar year */
  yearlyRateHistory?: Partial<Record<number, number>>;
  /** Electricity usage-tier tariffs by year (low / mid / high USD/kWh) */
  tierRateHistory?: Partial<
    Record<number, { low: number; mid: number; high: number }>
  >;
  /** Note under the 5-year rates chart (water / electricity) */
  ratesNote?: string;
  /** Service areas shown on contact card */
  serviceAreas?: string;
  /** Price calculator card copy */
  calculatorTitle?: string;
  calculatorSubtitle?: string;
  calculatorEmptyHint?: string;
  /** Provider page hero eyebrow (e.g. Bixiyaha Biyaha) */
  heroEyebrow?: string;
  /** Livestock homepage section copy */
  categoriesTitle?: string;
  categoriesSubtitle?: string;
  typesTitle?: string;
  typesSubtitle?: string;
  snapshotTitle?: string;
  snapshotSubtitle?: string;
  trendsTitle?: string;
  trendsSubtitle?: string;
  updatedAt: string;
};

/** String fields that may be cleared to hide seed defaults on public pages. */
const CLEARABLE_STRING_KEYS = [
  "phone",
  "phoneHint",
  "altPhone",
  "email",
  "website",
  "address",
  "addressLabel",
  "location",
  "businessHours",
  "waterSource",
  "supplyType",
  "callCenter",
  "facebook",
  "tagline",
  "description",
  "infoTitle",
  "infoBrief",
  "currentPrice",
  "somali",
  "providerLabel",
  "companyName",
  "image",
  "ratesNote",
  "serviceAreas",
  "calculatorTitle",
  "calculatorSubtitle",
  "calculatorEmptyHint",
  "heroEyebrow",
  "categoriesTitle",
  "categoriesSubtitle",
  "typesTitle",
  "typesSubtitle",
  "snapshotTitle",
  "snapshotSubtitle",
  "trendsTitle",
  "trendsSubtitle",
] as const;

function parseProfile(slug: string, value: Prisma.JsonValue | null): CompanyProfileOverride | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return { ...(value as Record<string, unknown>), slug } as CompanyProfileOverride;
}

export async function getCompanyProfileOverride(
  slug: string
): Promise<CompanyProfileOverride | null> {
  const company = await prisma.company.findFirst({
    where: { slug, deletedAt: null },
    select: { profileData: true, updatedAt: true },
  });
  if (!company) return null;
  const profile = parseProfile(slug, company.profileData);
  return profile
    ? { ...profile, slug, updatedAt: company.updatedAt.toISOString() }
    : null;
}

/**
 * True when the override explicitly set this key (including empty string clears).
 */
export function overrideHas(
  override: CompanyProfileOverride | null | undefined,
  key: keyof CompanyProfileOverride
): boolean {
  return Boolean(override && Object.prototype.hasOwnProperty.call(override, key));
}

/**
 * Prefer an explicit override (even "") over seed/meta defaults.
 */
export function overrideString(
  override: CompanyProfileOverride | null | undefined,
  key: (typeof CLEARABLE_STRING_KEYS)[number],
  fallback: unknown = ""
): string {
  if (overrideHas(override, key)) {
    const v = override?.[key];
    return typeof v === "string" ? v : "";
  }
  return typeof fallback === "string" ? fallback : fallback == null ? "" : String(fallback);
}

export async function upsertCompanyProfileOverride(
  slug: string,
  patch: Partial<Omit<CompanyProfileOverride, "slug" | "updatedAt">>
): Promise<CompanyProfileOverride> {
  const company = await prisma.company.findFirstOrThrow({
    where: { slug, deletedAt: null },
    select: { id: true, profileData: true },
  });
  const prev = parseProfile(slug, company.profileData) ?? {
    slug,
    updatedAt: new Date().toISOString(),
  };
  const next: CompanyProfileOverride = {
    ...prev,
    ...patch,
    slug,
    updatedAt: new Date().toISOString(),
  };

  // Keep empty strings for clearable fields so "clear + save" hides seed defaults.
  // Only trim whitespace-only values down to "".
  for (const key of CLEARABLE_STRING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const val = next[key];
    if (typeof val === "string") {
      next[key] = val.trim();
    }
  }

  if (Array.isArray(next.infoPoints)) {
    next.infoPoints = next.infoPoints.map((p) => p.trim()).filter(Boolean);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "infoPoints") && !next.infoPoints?.length) {
    next.infoPoints = [];
  }

  if (next.yearlyRateHistory && typeof next.yearlyRateHistory === "object") {
    const cleaned: Partial<Record<number, number>> = {};
    for (const [yearKey, rate] of Object.entries(next.yearlyRateHistory)) {
      const year = Number(yearKey);
      const value = Number(rate);
      if (Number.isFinite(year) && Number.isFinite(value) && value > 0) {
        cleaned[year] = Math.round(value * 1000) / 1000;
      }
    }
    next.yearlyRateHistory = cleaned;
  }

  if (next.tierRateHistory && typeof next.tierRateHistory === "object") {
    const cleaned: NonNullable<CompanyProfileOverride["tierRateHistory"]> = {};
    for (const [yearKey, rates] of Object.entries(next.tierRateHistory)) {
      const year = Number(yearKey);
      if (!Number.isFinite(year) || !rates || typeof rates !== "object") continue;
      const low = Number((rates as { low?: unknown }).low);
      const mid = Number((rates as { mid?: unknown }).mid);
      const high = Number((rates as { high?: unknown }).high);
      if (low > 0 && mid > 0 && high > 0) {
        cleaned[year] = {
          low: Math.round(low * 1000) / 1000,
          mid: Math.round(mid * 1000) / 1000,
          high: Math.round(high * 1000) / 1000,
        };
      }
    }
    next.tierRateHistory = cleaned;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { profileData: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

/** Merge editable overrides onto a static provider meta object. */
export function applyProfileOverrideToMeta<T extends object>(
  meta: T,
  override: CompanyProfileOverride | null
): T {
  if (!override) return meta;
  const merged: Record<string, unknown> = { ...(meta as Record<string, unknown>) };

  const applyClearable = (
    key: (typeof CLEARABLE_STRING_KEYS)[number],
    aliases: string[] = []
  ) => {
    if (!overrideHas(override, key)) return;
    const raw = override[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) {
      merged[key] = value;
      for (const alias of aliases) merged[alias] = value;
    } else {
      // Explicit clear — remove seed default so public UI hides the field
      delete merged[key];
      for (const alias of aliases) delete merged[alias];
    }
  };

  applyClearable("phone");
  applyClearable("phoneHint");
  applyClearable("altPhone", ["alternatePhone"]);
  applyClearable("email");
  applyClearable("website");
  applyClearable("address");
  applyClearable("addressLabel");
  applyClearable("location");
  applyClearable("businessHours");
  applyClearable("waterSource");
  // supplyType drives the home-card pill — never leave it blank when cleared;
  // fall back to waterSource / seed pill so cards still show e.g. "Underground Borehole Water"
  if (overrideHas(override, "supplyType")) {
    const supply = (override.supplyType ?? "").trim();
    if (supply) {
      merged.supplyType = supply;
      merged.pillLabel = supply;
    } else {
      delete merged.supplyType;
      const metaRecord = meta as Record<string, unknown>;
      const fromWater =
        (typeof override.waterSource === "string" && override.waterSource.trim()) ||
        (typeof metaRecord.waterSource === "string" && metaRecord.waterSource.trim()) ||
        (typeof metaRecord.pillLabel === "string" && metaRecord.pillLabel.trim()) ||
        "";
      if (fromWater) merged.pillLabel = fromWater;
    }
  }
  applyClearable("callCenter", ["telephone"]);
  applyClearable("facebook");
  applyClearable("tagline");
  // Hero description: company admin stores one language; sync both fields so
  // public UI live-translates EN ↔ SO instead of keeping a stale seed SO copy.
  if (overrideHas(override, "description")) {
    const raw = override.description;
    const value = typeof raw === "string" ? raw.trim() : "";
    const metaRecord = meta as Record<string, unknown>;
    if (value) {
      merged.description = value;
      merged.descriptionSo = value;
    } else {
      if (typeof metaRecord.description === "string") {
        merged.description = metaRecord.description;
      } else {
        delete merged.description;
      }
      if (typeof metaRecord.descriptionSo === "string") {
        merged.descriptionSo = metaRecord.descriptionSo;
      } else {
        delete merged.descriptionSo;
      }
    }
  }
  applyClearable("infoTitle");
  applyClearable("infoBrief");
  applyClearable("currentPrice");
  applyClearable("somali");
  applyClearable("image");
  applyClearable("ratesNote");
  applyClearable("serviceAreas");
  applyClearable("calculatorTitle");
  applyClearable("calculatorSubtitle");
  applyClearable("calculatorEmptyHint");
  applyClearable("heroEyebrow");
  applyClearable("categoriesTitle");
  applyClearable("categoriesSubtitle");
  applyClearable("typesTitle");
  applyClearable("typesSubtitle");
  applyClearable("snapshotTitle");
  applyClearable("snapshotSubtitle");
  applyClearable("trendsTitle");
  applyClearable("trendsSubtitle");

  if (overrideHas(override, "providerLabel")) {
    const label = (override.providerLabel ?? "").trim();
    if (label) {
      merged.providerLabel = label;
      merged.acronym = label;
      merged.cardTitle = label;
    }
  }

  if (overrideHas(override, "companyName")) {
    const companyName = (override.companyName ?? "").trim();
    if (companyName) {
      merged.companyName = companyName;
      merged.name = companyName;
      merged.cardLabel = companyName;
    }
  }

  if (overrideHas(override, "infoPoints")) {
    const points = Array.isArray(override.infoPoints) ? override.infoPoints : [];
    if (points.length > 0) merged.infoPoints = points;
    else delete merged.infoPoints;
  }

  if (
    override.yearlyRateHistory &&
    typeof override.yearlyRateHistory === "object" &&
    Object.keys(override.yearlyRateHistory).length > 0
  ) {
    const metaRecord = meta as Record<string, unknown>;
    const base =
      metaRecord.yearlyRateHistory &&
      typeof metaRecord.yearlyRateHistory === "object"
        ? { ...(metaRecord.yearlyRateHistory as Record<string, number>) }
        : {};
    const mergedYears: Record<number, number> = {};
    for (const [k, v] of Object.entries(base)) {
      const year = Number(k);
      const value = Number(v);
      if (Number.isFinite(year) && Number.isFinite(value) && value > 0) {
        mergedYears[year] = value;
      }
    }
    for (const [k, v] of Object.entries(override.yearlyRateHistory)) {
      const year = Number(k);
      const value = Number(v);
      if (Number.isFinite(year) && Number.isFinite(value) && value > 0) {
        mergedYears[year] = value;
      }
    }
    if (Object.keys(mergedYears).length > 0) {
      merged.yearlyRateHistory = mergedYears;
    }
  }

  if (
    override.tierRateHistory &&
    typeof override.tierRateHistory === "object" &&
    Object.keys(override.tierRateHistory).length > 0
  ) {
    const metaRecord = meta as Record<string, unknown>;
    const base =
      metaRecord.tierRateHistory &&
      typeof metaRecord.tierRateHistory === "object"
        ? {
            ...(metaRecord.tierRateHistory as Record<
              string,
              { low: number; mid: number; high: number }
            >),
          }
        : {};
    const mergedTiers: Record<
      number,
      { low: number; mid: number; high: number }
    > = {};
    for (const [k, v] of Object.entries(base)) {
      const year = Number(k);
      const low = Number(v?.low);
      const mid = Number(v?.mid);
      const high = Number(v?.high);
      if (Number.isFinite(year) && low > 0 && mid > 0 && high > 0) {
        mergedTiers[year] = { low, mid, high };
      }
    }
    for (const [k, v] of Object.entries(override.tierRateHistory)) {
      const year = Number(k);
      const low = Number(v?.low);
      const mid = Number(v?.mid);
      const high = Number(v?.high);
      if (Number.isFinite(year) && low > 0 && mid > 0 && high > 0) {
        mergedTiers[year] = { low, mid, high };
      }
    }
    if (Object.keys(mergedTiers).length > 0) {
      merged.tierRateHistory = mergedTiers;
    }
  }
  return merged as T;
}
