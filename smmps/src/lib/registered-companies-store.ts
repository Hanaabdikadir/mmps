import "server-only";
import { Prisma, type CompanyType } from "@prisma/client";
import { Building2, Beef, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isMmpsPlatformEmail } from "@/lib/home-content";
import { findDefaultMarketForCompanyType } from "@/lib/company-default-market";
import {
  BAWADCO_YEARLY_RATE_HISTORY,
  MOGADISHU_WATER_PROVIDERS,
  type WaterProviderMeta,
} from "@/lib/water-data";
import {
  ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY,
  ELECTRICITY_USAGE_TIERS,
  MOGADISHU_ELECTRICITY_PROVIDERS,
  defaultElectricityTierRateMap,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";

export type RegisteredCompanySector = "Water" | "Electricity" | "Livestock";

export type RegisteredCompanyRecord = {
  slug: string;
  email: string;
  name: string;
  acronym: string;
  sector: RegisteredCompanySector;
  phone?: string;
  companyEmail?: string;
  address?: string;
  district?: string;
  location?: string;
  logoUrl?: string;
  approvedAt: string;
};

function sectorToType(sector: RegisteredCompanySector): CompanyType {
  return sector === "Water"
    ? "WATER_SUPPLY"
    : sector === "Electricity"
      ? "ELECTRICITY"
      : "OTHER";
}

function typeToSector(type: CompanyType): RegisteredCompanySector {
  return type === "WATER_SUPPLY"
    ? "Water"
    : type === "ELECTRICITY"
      ? "Electricity"
      : "Livestock";
}

function fromCompany(row: {
  name: string;
  slug: string;
  type: CompanyType;
  email: string | null;
  phone: string | null;
  location: string | null;
  district: string | null;
  address: string | null;
  logoFileName: string | null;
  profileData: Prisma.JsonValue | null;
  createdAt: Date;
}): RegisteredCompanyRecord {
  const profile =
    row.profileData && typeof row.profileData === "object" && !Array.isArray(row.profileData)
      ? (row.profileData as Record<string, unknown>)
      : {};
  return {
    slug: row.slug,
    email: row.email ?? "",
    name: row.name,
    acronym:
      typeof profile.acronym === "string" ? profile.acronym : row.name.slice(0, 6).toUpperCase(),
    sector: typeToSector(row.type),
    phone: row.phone ?? undefined,
    companyEmail:
      typeof profile.companyEmail === "string" ? profile.companyEmail : row.email ?? undefined,
    address: row.address ?? undefined,
    district: row.district ?? undefined,
    location: row.location ?? undefined,
    logoUrl: row.logoFileName ?? undefined,
    approvedAt: row.createdAt.toISOString(),
  };
}

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "company";
}

function reservedSlugs(): Set<string> {
  return new Set([
    ...MOGADISHU_WATER_PROVIDERS.map((p) => p.slug),
    ...MOGADISHU_ELECTRICITY_PROVIDERS.map((p) => p.slug),
    "livestock-market",
  ]);
}

/** Platform / super-admin emails must never become public provider cards. */
export function isPlatformCompanyEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return (
    isMmpsPlatformEmail(e) ||
    e.startsWith("superadmin@") ||
    e.startsWith("super.admin@")
  );
}

export function isCoreCompanyEmail(email: string): boolean {
  return (
    /@(bawadco|wabax|hawdco|beco|mps|blueskyenergy|livestock)\.so$/i.test(
      email
    ) || /@muqdishopower\.com$/i.test(email)
  );
}

/** Approved applicant companies for sector hub cards (not reserved/core/platform). */
export function isExtraPublicCompany(c: RegisteredCompanyRecord): boolean {
  if (reservedSlugs().has(c.slug)) return false;
  if (isPlatformCompanyEmail(c.email)) return false;
  if (isCoreCompanyEmail(c.email)) return false;
  if (/system\s*admin/i.test(c.name) || c.slug === "system-administrator") {
    return false;
  }
  return true;
}

export async function allocateUniqueCompanySlug(
  companyName: string,
  preferred?: string | null
): Promise<string> {
  const reserved = reservedSlugs();
  const existing = new Set(
    (await prisma.company.findMany({ select: { slug: true } })).map((c) => c.slug)
  );
  const base = slugifyCompanyName(preferred?.trim() || companyName);
  let candidate = base;
  let n = 2;
  while (reserved.has(candidate) || existing.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function upsertRegisteredCompany(
  input: Omit<RegisteredCompanyRecord, "approvedAt"> & { approvedAt?: string }
): Promise<RegisteredCompanyRecord> {
  const email = input.email.trim().toLowerCase();
  const existing = email
    ? await prisma.company.findFirst({ where: { email, deletedAt: null } })
    : null;
  const slug = existing?.slug ?? input.slug;
  const existingProfile =
    existing?.profileData &&
    typeof existing.profileData === "object" &&
    !Array.isArray(existing.profileData)
      ? (existing.profileData as Prisma.JsonObject)
      : {};
  const profileData = {
    ...existingProfile,
    acronym: input.acronym,
    companyEmail: input.companyEmail,
  } satisfies Prisma.InputJsonObject;
  const companyType = sectorToType(input.sector);
  const defaultMarket = await findDefaultMarketForCompanyType(companyType);
  const existingBySlug = await prisma.company.findUnique({ where: { slug } });
  if (existingBySlug?.deletedAt) {
    return fromCompany(existingBySlug);
  }
  const row = await prisma.company.upsert({
    where: { slug },
    create: {
      slug,
      name: input.name,
      type: companyType,
      email,
      phone: input.phone,
      address: input.address,
      district: input.district,
      location: input.location,
      logoFileName: input.logoUrl,
      status: "ACTIVE",
      profileData,
      ...(defaultMarket?.id ? { marketId: defaultMarket.id } : {}),
    },
    update: {
      name: input.name,
      type: companyType,
      email,
      phone: input.phone,
      address: input.address,
      district: input.district,
      location: input.location,
      logoFileName: input.logoUrl,
      profileData,
      ...(existing?.marketId || !defaultMarket?.id
        ? {}
        : { marketId: defaultMarket.id }),
    },
  });
  return fromCompany(row);
}

/** Update only the public card logo for an approved company (by slug). */
export async function setRegisteredCompanyLogo(
  slug: string,
  logoUrl: string
): Promise<RegisteredCompanyRecord | null> {
  const existing = await prisma.company.findFirst({ where: { slug, deletedAt: null } });
  if (!existing) return null;
  return fromCompany(
    await prisma.company.update({ where: { id: existing.id }, data: { logoFileName: logoUrl } })
  );
}

/** Permanently remove a registered company by slug and/or email. */
export async function removeRegisteredCompany(opts: {
  slug?: string;
  email?: string;
}): Promise<boolean> {
  const { hardDeleteCompany } = await import("@/lib/delete-user");
  const email = opts.email?.trim().toLowerCase();
  const slug = opts.slug?.trim();
  const rows = await prisma.company.findMany({
    where: {
      OR: [...(slug ? [{ slug }] : []), ...(email ? [{ email }] : [])],
    },
    select: { id: true },
  });
  for (const row of rows) {
    await hardDeleteCompany(row.id);
  }
  return rows.length > 0;
}

export async function getRegisteredCompanyBySlug(
  slug: string
): Promise<RegisteredCompanyRecord | null> {
  const row = await prisma.company.findFirst({
    where: { slug, deletedAt: null, status: "ACTIVE" },
  });
  return row ? fromCompany(row) : null;
}

export async function getRegisteredCompanyByEmail(
  email: string
): Promise<RegisteredCompanyRecord | null> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.company.findFirst({
    where: { email: normalized, deletedAt: null },
  });
  return row ? fromCompany(row) : null;
}

export async function listRegisteredCompanies(
  sector?: RegisteredCompanySector
): Promise<RegisteredCompanyRecord[]> {
  const rows = await prisma.company.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(sector ? { type: sectorToType(sector) } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(fromCompany);
}

function extraThemeIndex(slug: string, count: number) {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h += slug.charCodeAt(i);
  return h % count;
}

const WATER_EXTRA_CARD_THEMES = [
  {
    gradient: "from-[#22c55e] to-[#16a34a]",
    headerBg: "from-[#22c55e] to-[#16a34a]",
    cardBodyTint: "from-green-50/90 via-white to-white",
    accent: "text-green-800",
    accentBg: "bg-green-50 border-green-200",
    accentText: "text-green-900",
    cardBorder: "border-green-500",
    cardDivider: "bg-green-500",
    border: "border-t-green-500",
  },
  {
    gradient: "from-teal-600 to-cyan-500",
    headerBg: "from-teal-600 to-cyan-500",
    cardBodyTint: "from-teal-50/90 via-white to-white",
    accent: "text-teal-800",
    accentBg: "bg-teal-50 border-teal-200",
    accentText: "text-teal-800",
    cardBorder: "border-teal-500",
    cardDivider: "bg-teal-500",
    border: "border-t-teal-500",
  },
  {
    gradient: "from-[#FF8000] to-[#f59e0b]",
    headerBg: "from-[#FF8000] to-[#f59e0b]",
    cardBodyTint: "from-orange-50/90 via-white to-white",
    accent: "text-orange-800",
    accentBg: "bg-orange-50 border-orange-200",
    accentText: "text-orange-900",
    cardBorder: "border-orange-400",
    cardDivider: "bg-orange-400",
    border: "border-t-orange-500",
  },
] as const;

const ELECTRICITY_EXTRA_CARD_THEMES = [
  {
    gradient: "from-amber-500 to-yellow-500",
    headerBg: "from-amber-500 to-yellow-500",
    cardBodyTint: "from-amber-50/90 via-white to-white",
    accentText: "text-amber-900",
    accentBg: "bg-amber-50 border-amber-200",
    cardBorder: "border-amber-400",
    cardDivider: "bg-amber-400",
  },
  {
    gradient: "from-[#FF8000] to-[#f59e0b]",
    headerBg: "from-[#FF8000] to-[#f59e0b]",
    cardBodyTint: "from-orange-50/90 via-white to-white",
    accentText: "text-orange-900",
    accentBg: "bg-orange-50 border-orange-200",
    cardBorder: "border-orange-400",
    cardDivider: "bg-orange-400",
  },
  {
    gradient: "from-emerald-600 to-teal-500",
    headerBg: "from-emerald-600 to-teal-500",
    cardBodyTint: "from-emerald-50/90 via-white to-white",
    accentText: "text-emerald-900",
    accentBg: "bg-emerald-50 border-emerald-200",
    cardBorder: "border-emerald-400",
    cardDivider: "bg-emerald-400",
  },
] as const;

export function registeredCompanyToWaterMeta(
  c: RegisteredCompanyRecord
): WaterProviderMeta {
  const title = c.acronym || c.name;
  const theme =
    WATER_EXTRA_CARD_THEMES[
      extraThemeIndex(c.slug, WATER_EXTRA_CARD_THEMES.length)
    ];
  return {
    id: c.slug,
    slug: c.slug,
    href: `/water/${c.slug}`,
    name: c.name,
    somali: `Shirkadda hormarinta biyaha ${title}`,
    tagline: "Registered water company on MMPS",
    taglineSo: "Shirkad biyo oo ka diiwaan gashan MMPS",
    description: `${c.name} provides water services in Mogadishu.`,
    descriptionSo: `${c.name} waxay adeegyo biyo ka bixisaa Muqdisho.`,
    acronym: c.acronym,
    phone: c.phone,
    email: c.companyEmail || c.email,
    address: c.address || c.district || "Mogadishu, Somalia",
    addressSo: c.address || c.district || "Muqdisho, Soomaaliya",
    location: c.location || c.district || "Banadir",
    locationSo: c.location || c.district || "Banaadir",
    companyName: c.name,
    image: c.logoUrl,
    imageBg: "bg-white",
    cardImageCrop: "banner",
    imageWidth: 400,
    imageHeight: 160,
    infoTitle: `About ${title}`,
    infoBrief: `${c.name} provides water services in Mogadishu.`,
    yearlyRateHistory: { ...BAWADCO_YEARLY_RATE_HISTORY },
    ...theme,
    bodyBg: "bg-white",
    icon: Building2,
    cardLabel: `${c.name.trim().toUpperCase().replace(/\.?\s*(CO|COMPANY)\.?$/i, "")} WATER DEVELOPMENT CO.`,
    cardTitle: title,
    pillLabel: "Underground Borehole Water",
  };
}

export function registeredCompanyToElectricityMeta(
  c: RegisteredCompanyRecord
): ElectricityProviderMeta {
  const title = c.acronym || c.name;
  const theme =
    ELECTRICITY_EXTRA_CARD_THEMES[
      extraThemeIndex(c.slug, ELECTRICITY_EXTRA_CARD_THEMES.length)
    ];
  return {
    id: c.slug,
    slug: c.slug,
    href: `/electricity/${c.slug}`,
    name: c.name,
    somali: `Shirkada korontada ${title}`,
    tagline: "Registered electricity company on MMPS",
    taglineSo: "Shirkad koronto oo ka diiwaan gashan MMPS",
    description: `${c.name} provides electricity services in Mogadishu.`,
    descriptionSo: `${c.name} waxay adeegyo koronto ka bixisaa Muqdisho.`,
    acronym: c.acronym,
    phone: c.phone,
    email: c.companyEmail || c.email,
    address: c.address || c.district || "Mogadishu, Somalia",
    addressSo: c.address || c.district || "Muqdisho, Soomaaliya",
    image: c.logoUrl,
    imageBg: "bg-white",
    cardImageCrop: "banner",
    imageWidth: 400,
    imageHeight: 160,
    ...theme,
    icon: Zap,
    cardLabel: `${c.name.trim().toUpperCase().replace(/\.?\s*(CO|COMPANY)\.?$/i, "")} ELECTRICITY CO.`,
    cardTitle: title,
    pillLabel: "Grid Electricity & Solar Power",
    usageTiers: ELECTRICITY_USAGE_TIERS,
    yearlyRateHistory: { ...ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY },
    tierRateHistory: defaultElectricityTierRateMap(),
  };
}

/** Card shape for approved livestock applicants on the livestock sector page. */
export function registeredCompanyToLivestockCard(c: RegisteredCompanyRecord) {
  const title = c.acronym || c.name;
  return {
    id: c.slug,
    slug: c.slug,
    href: "/livestock",
    name: c.name,
    somali: title,
    acronym: c.acronym,
    phone: c.phone,
    email: c.companyEmail || c.email,
    address: c.address || c.district || "Mogadishu, Somalia",
    image: c.logoUrl,
    imageBg: "bg-white",
    cardImageCrop: "banner" as const,
    imageWidth: 400,
    imageHeight: 160,
    headerBg: "bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-500",
    cardBodyTint: "from-orange-50/90 via-white to-white",
    accentText: "text-orange-900",
    accentBg: "bg-orange-50 border-orange-200",
    cardBorder: "border-orange-200/80",
    cardDivider: "border-orange-200",
    icon: Beef,
    cardLabel: "LIVESTOCK COMPANY",
    cardTitle: title,
    pillLabel: "Livestock Market & Trading",
  };
}
