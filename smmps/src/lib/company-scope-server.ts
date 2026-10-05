import "server-only";

import {
  getRegisteredCompanyByEmail,
  getRegisteredCompanyBySlug,
  isExtraPublicCompany,
  listRegisteredCompanies,
  registeredCompanyToElectricityMeta,
  registeredCompanyToLivestockCard,
  registeredCompanyToWaterMeta,
  type RegisteredCompanyRecord,
} from "@/lib/registered-companies-store";
import {
  MOGADISHU_WATER_PROVIDERS,
  type WaterProviderMeta,
} from "@/lib/water-data";
import {
  MOGADISHU_ELECTRICITY_PROVIDERS,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";
import { prisma } from "@/lib/prisma";
import {
  applyProfileOverrideToMeta,
  getCompanyProfileOverride,
} from "@/lib/company-profile-store";
import {
  adminMarketToElectricityMeta,
  adminMarketToWaterMeta,
  findActiveAdminUtilityMarket,
  parseAdminMarketSlug,
} from "@/lib/public-admin-markets";

async function approvedCompanySlugs(): Promise<Set<string>> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "APPROVED",
      companySlug: { not: null },
      role: "COMPANY_ADMIN",
    },
    select: { companySlug: true },
  });
  return new Set(users.map((u) => u.companySlug).filter(Boolean) as string[]);
}

/** Seed/catalog providers stay public only while their DB company row is ACTIVE (or missing). */
async function hiddenPublicCompanySlugs(): Promise<Set<string>> {
  const rows = await prisma.company.findMany({
    where: {
      OR: [{ deletedAt: { not: null } }, { status: { not: "ACTIVE" } }],
    },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug).filter(Boolean));
}

async function isCompanySlugPubliclyVisible(slug: string): Promise<boolean> {
  const row = await prisma.company.findFirst({
    where: { slug },
    select: { status: true, deletedAt: true },
  });
  if (!row) return true;
  if (row.deletedAt) return false;
  return row.status === "ACTIVE";
}

function mergeWaterMeta(
  base: WaterProviderMeta,
  registered: RegisteredCompanyRecord | null
): WaterProviderMeta {
  if (!registered) return base;
  return {
    ...base,
    name: registered.name || base.name,
    phone: registered.phone || base.phone,
    email: registered.companyEmail || registered.email || base.email,
    address: registered.address || base.address,
    location: registered.location || base.location,
    image: registered.logoUrl || base.image,
  };
}

function mergeElectricityMeta(
  base: ElectricityProviderMeta,
  registered: RegisteredCompanyRecord | null
): ElectricityProviderMeta {
  if (!registered) return base;
  return {
    ...base,
    name: registered.name || base.name,
    phone: registered.phone || base.phone,
    email: registered.companyEmail || registered.email || base.email,
    address: registered.address || base.address,
    image: registered.logoUrl || base.image,
  };
}

/** Resolve provider name → slug including registered companies (server only). */
export async function resolveProviderSlug(
  providerName: string,
  sector: "water" | "electricity"
): Promise<string | null> {
  const needle = providerName.trim().toLowerCase();
  if (!needle) return null;

  const catalog =
    sector === "water"
      ? MOGADISHU_WATER_PROVIDERS
      : MOGADISHU_ELECTRICITY_PROVIDERS;
  const fromCatalog = catalog.find(
    (p) =>
      p.slug.toLowerCase() === needle ||
      p.name.toLowerCase() === needle ||
      (p.acronym ?? "").toLowerCase() === needle ||
      p.cardTitle.toLowerCase() === needle
  );
  if (fromCatalog) return fromCatalog.slug;

  const registered = await listRegisteredCompanies(
    sector === "water" ? "Water" : "Electricity"
  );
  const exact = registered.find(
    (p) =>
      p.name.toLowerCase() === needle ||
      p.slug.toLowerCase() === needle ||
      p.acronym.toLowerCase() === needle
  );
  if (exact) return exact.slug;

  const partial = registered.find(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      needle.includes(p.slug.toLowerCase()) ||
      needle.includes(p.acronym.toLowerCase())
  );
  return partial?.slug ?? null;
}

export async function companySectorForSlug(
  slug: string
): Promise<"water" | "electricity" | "livestock" | null> {
  if (MOGADISHU_WATER_PROVIDERS.some((p) => p.slug === slug)) return "water";
  if (MOGADISHU_ELECTRICITY_PROVIDERS.some((p) => p.slug === slug)) {
    return "electricity";
  }
  if (slug === "livestock-market") return "livestock";

  const registered = await getRegisteredCompanyBySlug(slug);
  if (registered?.sector === "Water") return "water";
  if (registered?.sector === "Electricity") return "electricity";
  if (registered?.sector === "Livestock") return "livestock";

  const marketId = parseAdminMarketSlug(slug);
  if (marketId) {
    const market = await findActiveAdminUtilityMarket(marketId);
    if (market?.marketType === "WATER") return "water";
    if (market?.marketType === "ELECTRICITY") return "electricity";
  }
  return null;
}

export async function providerMetaForSlug(slug: string) {
  const water = MOGADISHU_WATER_PROVIDERS.find((p) => p.slug === slug);
  if (water) {
    const registered = await getRegisteredCompanyBySlug(slug);
    return mergeWaterMeta(water, registered);
  }
  const electricity = MOGADISHU_ELECTRICITY_PROVIDERS.find((p) => p.slug === slug);
  if (electricity) {
    const registered = await getRegisteredCompanyBySlug(slug);
    return mergeElectricityMeta(electricity, registered);
  }

  const registered = await getRegisteredCompanyBySlug(slug);
  if (!registered) {
    const marketId = parseAdminMarketSlug(slug);
    if (marketId) {
      const market = await findActiveAdminUtilityMarket(marketId);
      if (market?.marketType === "WATER") return adminMarketToWaterMeta(market);
      if (market?.marketType === "ELECTRICITY") {
        return adminMarketToElectricityMeta(market);
      }
    }
    return null;
  }
  if (registered.sector === "Water") return registeredCompanyToWaterMeta(registered);
  if (registered.sector === "Electricity") {
    return registeredCompanyToElectricityMeta(registered);
  }
  return {
    id: registered.slug,
    slug: registered.slug,
    href: `/livestock`,
    name: registered.name,
    acronym: registered.acronym,
  };
}

export async function publicHrefForCompanySlug(slug: string): Promise<string> {
  const sector = await companySectorForSlug(slug);
  if (sector === "water") return `/water/${slug}`;
  if (sector === "electricity") return `/electricity/${slug}`;
  if (sector === "livestock") return "/livestock";
  return "/";
}

/**
 * Public home/sector cards and provider pages: only Super-Admin–approved
 * (Active / accepted) companies. Pending, rejected, and Not Active (suspended) stay hidden.
 */
export async function isPubliclyListedSlug(slug: string): Promise<boolean> {
  if (!(await isCompanySlugPubliclyVisible(slug))) return false;

  if (MOGADISHU_WATER_PROVIDERS.some((p) => p.slug === slug)) return true;
  if (MOGADISHU_ELECTRICITY_PROVIDERS.some((p) => p.slug === slug)) return true;
  if (slug === "livestock-market") return true;

  const company = await getRegisteredCompanyBySlug(slug);
  if (company && isExtraPublicCompany(company)) {
    const approved = await approvedCompanySlugs();
    return approved.has(slug);
  }

  const marketId = parseAdminMarketSlug(slug);
  if (!marketId) return false;
  const market = await findActiveAdminUtilityMarket(marketId);
  return Boolean(market);
}

/**
 * Core seed providers (+ optional newly approved applicants for sector hubs).
 * Home page should pass `{ includeExtras: false }` so new companies stay off the homepage.
 */
export type PublicProviderListOptions = {
  includeExtras?: boolean;
};

function brandKey(raw: string) {
  return raw
    .toLowerCase()
    .replace(
      /shirkadda|shirkada|korontada|electric(?:ity)?|market|suuqa|company|co\.?/g,
      ""
    )
    .replace(/[^a-z0-9]+/g, "");
}

function isDuplicateElectricityBrand(
  candidate: { name: string; slug?: string },
  existing: { name: string; slug: string; somali?: string; cardTitle?: string }[]
) {
  const keys = [candidate.name, candidate.slug || ""]
    .map(brandKey)
    .filter((k) => k.length >= 3);
  return existing.some((row) => {
    const rowKeys = [row.name, row.slug, row.somali || "", row.cardTitle || ""]
      .map(brandKey)
      .filter((k) => k.length >= 3);
    return keys.some((k) =>
      rowKeys.some((r) => k === r || k.includes(r) || r.includes(k))
    );
  });
}

export async function listPublicWaterProviders(
  opts?: PublicProviderListOptions
): Promise<WaterProviderMeta[]> {
  const includeExtras = opts?.includeExtras !== false;
  const [registered, hidden] = await Promise.all([
    listRegisteredCompanies("Water"),
    hiddenPublicCompanySlugs(),
  ]);
  const bySlug = new Map(registered.map((c) => [c.slug, c]));

  const core = (
    await Promise.all(
      MOGADISHU_WATER_PROVIDERS.filter((p) => !hidden.has(p.slug)).map(
        async (provider) => {
          const merged = mergeWaterMeta(
            provider,
            bySlug.get(provider.slug) ?? null
          );
          const profile = await getCompanyProfileOverride(provider.slug);
          return applyProfileOverrideToMeta(merged, profile);
        }
      )
    )
  );

  if (!includeExtras) return core;

  const approved = await approvedCompanySlugs();
  const extras = registered
    .filter((c) => isExtraPublicCompany(c) && approved.has(c.slug))
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
    .map(registeredCompanyToWaterMeta);

  return [...core, ...extras];
}

/**
 * Core seed providers (+ optional newly approved applicants for sector hubs).
 * Home page should pass `{ includeExtras: false }` so new companies stay off the homepage.
 */
export async function listPublicElectricityProviders(
  opts?: PublicProviderListOptions
): Promise<ElectricityProviderMeta[]> {
  const includeExtras = opts?.includeExtras !== false;
  const [registered, hidden] = await Promise.all([
    listRegisteredCompanies("Electricity"),
    hiddenPublicCompanySlugs(),
  ]);
  const bySlug = new Map(registered.map((c) => [c.slug, c]));

  const core = (
    await Promise.all(
      MOGADISHU_ELECTRICITY_PROVIDERS.filter((p) => !hidden.has(p.slug)).map(
        async (provider) => {
          const merged = mergeElectricityMeta(
            provider,
            bySlug.get(provider.slug) ?? null
          );
          const profile = await getCompanyProfileOverride(provider.slug);
          return applyProfileOverrideToMeta(merged, profile);
        }
      )
    )
  );

  if (!includeExtras) return core;

  const approved = await approvedCompanySlugs();
  const extras = registered
    .filter((c) => isExtraPublicCompany(c) && approved.has(c.slug))
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
    .map(registeredCompanyToElectricityMeta)
    .filter((m) => !isDuplicateElectricityBrand(m, core));

  return [...core, ...extras];
}

/** Newly approved livestock companies — sector page only (never on home). */
export async function listPublicLivestockCompanies() {
  const registered = await listRegisteredCompanies("Livestock");
  const approved = await approvedCompanySlugs();
  return registered
    .filter((c) => isExtraPublicCompany(c) && approved.has(c.slug))
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
    .map((c) => registeredCompanyToLivestockCard(c));
}

export async function companySlugForEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const fromStore = (await getRegisteredCompanyByEmail(normalized))?.slug;
  if (fromStore) return fromStore;

  // Built-in company admin logins (admin@bawadco.so → bawadco, etc.)
  const domain = normalized.split("@")[1] ?? "";
  const domainMap: Record<string, string> = {
    "bawadco.so": "bawadco",
    "wabax.so": "wabax",
    "hawdco.so": "banadir-water",
    "beco.so": "beco",
    "mps.so": "mogadishu-power-supply",
    "muqdishopower.com": "mogadishu-power-supply",
    "blueskyenergy.so": "blue-sky-energy",
    "livestock.so": "livestock-market",
  };
  if (domainMap[domain]) return domainMap[domain];

  return null;
}
