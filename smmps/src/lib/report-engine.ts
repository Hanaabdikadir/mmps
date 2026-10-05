import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  type AuthUser,
  isCompanyAdmin,
  isSuperAdmin,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import { hasPermission } from "@/lib/rbac-permissions";
import {
  companySectorForSlug,
  providerMetaForSlug,
  resolveProviderSlug,
} from "@/lib/company-scope-server";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";
import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import type { AnimalType, PriceStatus } from "@prisma/client";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { getCompanyProfileOverride } from "@/lib/company-profile-store";
import {
  buildProviderNeedles,
  matchesProvider,
} from "@/lib/provider-match";
import {
  mogadishuDayEnd,
  mogadishuDayStart,
  parseIsoDateOnly,
  yearOverlapsMogadishuRange,
} from "@/lib/mogadishu-time";

export type ReportSector = "water" | "electricity" | "livestock";
export type ReportSectorFilter = ReportSector | "all";
export type ReportStatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export interface ReportFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  sector?: ReportSectorFilter | null;
  status?: ReportStatusFilter | null;
  /** Market section id from `market_sections` */
  sectionId?: number | string | null;
  /** Provider slug or display name — Super Admin only */
  company?: string | null;
  /** Alias for company (provider name / slug) */
  provider?: string | null;
}

export interface ReportRow {
  id: string;
  sector: "Water" | "Electricity" | "Livestock";
  item: string;
  provider: string;
  section?: string | null;
  unit: string;
  price: number;
  status: PriceStatus;
  dateRecorded: string;
  submittedBy: string;
  rejectionReason?: string | null;
}

export interface ReportSummary {
  total: number;
  averagePrice: number | null;
  highestPrice: number | null;
  lowestPrice: number | null;
  bySector: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface GeneratedReport {
  rows: ReportRow[];
  summary: ReportSummary;
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
    sector: ReportSectorFilter;
    status: ReportStatusFilter;
    sectionId: number | null;
    company: string | null;
    provider: string | null;
  };
  scoped: boolean;
}

function parseDateBoundary(
  value: string | null | undefined,
  endOfDay: boolean
): Date | null {
  return endOfDay ? mogadishuDayEnd(value) : mogadishuDayStart(value);
}

function normalizeSector(value?: string | null): ReportSectorFilter {
  const v = (value ?? "all").toLowerCase();
  if (v === "water") return "water";
  if (v === "electricity") return "electricity";
  if (v === "livestock") return "livestock";
  return "all";
}

function normalizeStatus(value?: string | null): ReportStatusFilter {
  const v = (value ?? "ALL").toUpperCase();
  if (v === "PENDING" || v === "APPROVED" || v === "REJECTED") return v;
  return "ALL";
}

function marketTypeToSector(
  type: string | null | undefined
): "Water" | "Electricity" | "Livestock" {
  const key = (type || "").toUpperCase();
  if (key === "WATER") return "Water";
  if (key === "ELECTRICITY") return "Electricity";
  return "Livestock";
}

function animalTypesFromSectionName(name: string): AnimalType[] | null {
  const n = name.toLowerCase();
  const types: AnimalType[] = [];
  if (n.includes("camel") || n.includes("hal") || n.includes("geel")) {
    types.push("CAMEL", "HAL");
  }
  if (n.includes("cattle") || n.includes("awar") || n.includes("cow") || n.includes("lo'")) {
    types.push("CATTLE", "AWAR");
  }
  if (n.includes("goat") || n.includes("ari")) {
    types.push("GOAT", "QURBAC");
  }
  if (n.includes("sheep") || n.includes("ido")) types.push("SHEEP");
  if (n.includes("poultry") || n.includes("chicken") || n.includes("digaag")) {
    types.push("POULTRY");
  }
  return types.length ? types : null;
}

async function providerNeedlesForSlug(slug: string | null): Promise<string[]> {
  if (!slug) return [];
  const meta = await providerMetaForSlug(slug);
  let providerLabel: string | null = null;
  try {
    const profile = await getCompanyProfileOverride(slug);
    providerLabel = profile?.providerLabel ? String(profile.providerLabel) : null;
  } catch {
    // ignore
  }
  return buildProviderNeedles({
    slug,
    name: meta && "name" in meta ? String(meta.name) : null,
    acronym: meta && "acronym" in meta ? String(meta.acronym ?? "") : null,
    cardTitle: meta && "cardTitle" in meta ? String(meta.cardTitle ?? "") : null,
    cardLabel: meta && "cardLabel" in meta ? String(meta.cardLabel ?? "") : null,
    tagline: meta && "tagline" in meta ? String(meta.tagline ?? "") : null,
    providerLabel,
  });
}

async function companyUserIdsForSlug(slug: string | null): Promise<Set<number>> {
  if (!slug) return new Set();
  try {
    const users = await prisma.user.findMany({
      where: { companySlug: slug, deletedAt: null },
      select: { id: true },
    });
    return new Set(users.map((u) => u.id));
  } catch {
    return new Set();
  }
}

/** Resolve Prisma user id (session id may differ from DB row after company bootstrap). */
async function resolveReportUserId(user: AuthUser): Promise<number> {
  try {
    const byId = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (byId) return byId.id;
  } catch {
    // ignore
  }
  try {
    const byEmail = await prisma.user.findUnique({
      where: { email: user.email.trim().toLowerCase() },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  } catch {
    // ignore
  }
  return user.id;
}

function buildSummary(rows: ReportRow[]): ReportSummary {
  // Prefer real price submissions; yearly history (YH-*) is for the table only.
  const live = rows.filter((r) => !String(r.id).startsWith("YH-"));
  const forStats = live.length > 0 ? live : rows;

  if (!forStats.length) {
    return {
      total: 0,
      averagePrice: null,
      highestPrice: null,
      lowestPrice: null,
      bySector: {},
      byStatus: {},
    };
  }
  const prices = forStats.map((r) => r.price);
  const bySector: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const r of forStats) {
    bySector[r.sector] = (bySector[r.sector] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  return {
    total: forStats.length,
    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    highestPrice: Math.max(...prices),
    lowestPrice: Math.min(...prices),
    bySector,
    byStatus,
  };
}

/**
 * Generate a filtered market-prices report with RBAC:
 * - SUPER_ADMIN: all companies (optional company/provider filter)
 * - COMPANY_ADMIN: only their company prices
 * - LIVESTOCK_BROKER_USER: livestock rows they submitted (or livestock market)
 */
export async function generateReport(
  user: AuthUser,
  filters: ReportFilters = {}
): Promise<GeneratedReport> {
  if (!hasPermission(user.role, "VIEW_REPORTS")) {
    throw new Error("FORBIDDEN");
  }

  const sector = normalizeSector(filters.sector);
  const status = normalizeStatus(filters.status);
  const dateFrom = parseDateBoundary(filters.dateFrom, false);
  const dateTo = parseDateBoundary(filters.dateTo, true);
  const companyOrProvider =
    filters.company?.trim() || filters.provider?.trim() || null;
  const requestedSectionId = Number(filters.sectionId);
  const sectionId =
    Number.isInteger(requestedSectionId) && requestedSectionId > 0
      ? requestedSectionId
      : null;

  let selectedSection: {
    id: number;
    name: string;
    marketType: string;
    marketName: string;
  } | null = null;
  if (sectionId) {
    const row = await prisma.marketSection.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: { market: { select: { name: true, marketType: true } } },
    });
    if (row) {
      selectedSection = {
        id: row.id,
        name: row.name,
        marketType: row.market.marketType,
        marketName: row.market.name,
      };
    }
  }

  const dateWhere =
    dateFrom || dateTo
      ? {
          dateRecorded: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {};

  const statusWhere =
    status === "ALL" ? {} : { status: status as PriceStatus };

  const scoped = !isSuperAdmin(user);
  let companyNeedles: string[] = [];
  let companyUserIds = new Set<number>();
  let companySlug: string | null = null;
  let restrictToUpdatedById: number | null = null;
  let forceLivestockOnly = false;
  let allowSectors: ReportSector[] = ["water", "electricity", "livestock"];

  if (isSuperAdmin(user)) {
    if (companyOrProvider) {
      const asSlug =
        (await resolveProviderSlug(companyOrProvider, "water")) ||
        (await resolveProviderSlug(companyOrProvider, "electricity")) ||
        (companyOrProvider.toLowerCase().includes("livestock")
          ? "livestock-market"
          : null) ||
        companyOrProvider;
      companySlug = asSlug;
      companyNeedles = await providerNeedlesForSlug(asSlug);
      companyUserIds = await companyUserIdsForSlug(asSlug);
      if (!companyNeedles.length) {
        companyNeedles = [companyOrProvider.toLowerCase()];
      }
      const sectorOf = await companySectorForSlug(asSlug);
      if (sectorOf) allowSectors = [sectorOf];
    }
  } else if (isCompanyAdmin(user)) {
    const slug = resolveCompanyAdminSlug(user);
    companySlug = slug;
    companyNeedles = await providerNeedlesForSlug(slug);
    companyUserIds = await companyUserIdsForSlug(slug);
    restrictToUpdatedById = await resolveReportUserId(user);
    if (restrictToUpdatedById != null) companyUserIds.add(restrictToUpdatedById);
    const sectorOf = slug ? await companySectorForSlug(slug) : null;
    if (sectorOf) allowSectors = [sectorOf];
  } else if (user.role === "LIVESTOCK_BROKER_USER") {
    forceLivestockOnly = true;
    restrictToUpdatedById = await resolveReportUserId(user);
    allowSectors = ["livestock"];
  } else {
    // Other roles with VIEW_REPORTS — only rows they submitted
    restrictToUpdatedById = await resolveReportUserId(user);
  }

  if (selectedSection) {
    const t = selectedSection.marketType.toUpperCase();
    if (t === "WATER") allowSectors = ["water"];
    else if (t === "ELECTRICITY") allowSectors = ["electricity"];
    else allowSectors = ["livestock"];
  }

  const animalTypeFilter = selectedSection
    ? animalTypesFromSectionName(selectedSection.name)
    : null;

  const activeSectors = (forceLivestockOnly
    ? (["livestock"] as ReportSector[])
    : allowSectors
  ).filter((s) => sector === "all" || sector === s);

  const userSelect = {
    updatedBy: { select: { id: true, fullName: true, email: true } },
  } as const;

  const marketDateWhere =
    dateFrom || dateTo
      ? {
          effectiveDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {};

  const includeMarketPrices = isSuperAdmin(user) || Boolean(companySlug);

  const [water, electricity, livestock, marketPrices] = await withDbTimeout(
    Promise.all([
      activeSectors.includes("water")
        ? prisma.waterPrice.findMany({
            where: {
              ...dateWhere,
              ...statusWhere,
              waterType: UTILITY_SERVICE_TYPE,
            },
            orderBy: { dateRecorded: "desc" },
            take: 2000,
            include: userSelect,
          })
        : Promise.resolve([]),
      activeSectors.includes("electricity")
        ? prisma.electricityPrice.findMany({
            where: {
              ...dateWhere,
              ...statusWhere,
              serviceType: UTILITY_SERVICE_TYPE,
            },
            orderBy: { dateRecorded: "desc" },
            take: 2000,
            include: userSelect,
          })
        : Promise.resolve([]),
      activeSectors.includes("livestock")
        ? prisma.livestockPrice.findMany({
            where: {
              ...dateWhere,
              ...statusWhere,
              deletedAt: null,
              ...(forceLivestockOnly && status === "ALL"
                ? { status: { not: "REJECTED" as PriceStatus } }
                : {}),
              ...(animalTypeFilter ? { animalType: { in: animalTypeFilter } } : {}),
            },
            orderBy: { dateRecorded: "desc" },
            take: 2000,
            include: userSelect,
          })
        : Promise.resolve([]),
      includeMarketPrices
        ? prisma.marketPrice.findMany({
            where: {
              deletedAt: null,
              ...marketDateWhere,
              ...statusWhere,
              ...(selectedSection ? { sectionId: selectedSection.id } : {}),
              ...(sector !== "all" && !selectedSection
                ? {
                    market: {
                      marketType:
                        sector === "water"
                          ? "WATER"
                          : sector === "electricity"
                            ? "ELECTRICITY"
                            : "LIVESTOCK",
                    },
                  }
                : {}),
            },
            orderBy: { effectiveDate: "desc" },
            take: 2000,
            include: {
              ...userSelect,
              section: { select: { id: true, name: true } },
              market: { select: { name: true, marketType: true } },
              company: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]),
    10000
  );

  const passesScope = (
    providerName: string,
    updatedById: number,
    rowSector: ReportSector
  ) => {
    if (isSuperAdmin(user)) {
      if (!companyNeedles.length && companyUserIds.size === 0) return true;
      if (rowSector === "livestock") {
        return companyNeedles.some(
          (n) => n.includes("livestock") || n === "livestock-market"
        );
      }
      if (companyUserIds.has(updatedById)) return true;
      return matchesProvider(providerName, companyNeedles);
    }

    if (forceLivestockOnly) {
      return updatedById === (restrictToUpdatedById ?? -1);
    }

    // Every water/electricity company: own submissions OR own provider name.
    if (companyUserIds.has(updatedById)) return true;
    if (companyNeedles.length && matchesProvider(providerName, companyNeedles)) {
      return true;
    }
    if (
      companyUserIds.size === 0 &&
      restrictToUpdatedById != null &&
      updatedById === restrictToUpdatedById
    ) {
      return true;
    }
    return false;
  };

  const rows: ReportRow[] = [
    ...water
      .filter((r) => passesScope(r.providerName, r.updatedById, "water"))
      .map((r) => ({
        id: `W-${r.id}`,
        sector: "Water" as const,
        item: "Standard rate",
        provider: r.providerName,
        section: selectedSection?.name ?? "Water",
        unit: "per m³",
        price: Number(r.pricePerUnit),
        status: r.status,
        dateRecorded: new Date(r.dateRecorded).toISOString(),
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        rejectionReason: r.rejectionReason,
      })),
    ...electricity
      .filter((r) => passesScope(r.providerName, r.updatedById, "electricity"))
      .map((r) => ({
        id: `E-${r.id}`,
        sector: "Electricity" as const,
        item: "Standard rate",
        provider: r.providerName,
        section: selectedSection?.name ?? "Electricity",
        unit: "per kWh",
        price: Number(r.pricePerKwh),
        status: r.status,
        dateRecorded: new Date(r.dateRecorded).toISOString(),
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        rejectionReason: r.rejectionReason,
      })),
    ...livestock
      .filter((r) =>
        passesScope(r.marketLocation, r.updatedById, "livestock")
      )
      .map((r) => ({
        id: `L-${r.id}`,
        sector: "Livestock" as const,
        item: r.animalType,
        provider: r.marketLocation,
        section: selectedSection?.name ?? r.animalType,
        unit: "per head",
        price: Number(r.price),
        status: r.status,
        dateRecorded: new Date(r.dateRecorded).toISOString(),
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        rejectionReason: r.rejectionReason,
      })),
    ...marketPrices
      .filter((r) =>
        passesScope(
          r.company?.name || r.market?.name || r.productService,
          r.updatedById,
          selectedSection
            ? selectedSection.marketType === "WATER"
              ? "water"
              : selectedSection.marketType === "ELECTRICITY"
                ? "electricity"
                : "livestock"
            : r.market?.marketType === "WATER"
              ? "water"
              : r.market?.marketType === "ELECTRICITY"
                ? "electricity"
                : "livestock"
        )
      )
      .map((r) => ({
        id: `M-${r.id}`,
        sector: marketTypeToSector(r.market?.marketType),
        item: r.productService,
        provider: r.company?.name || r.market?.name || "Market",
        section: r.section?.name || selectedSection?.name || r.market?.name || "—",
        unit: r.unit || "USD",
        price: Number(r.price),
        status: r.status,
        dateRecorded: new Date(r.effectiveDate).toISOString(),
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        rejectionReason: r.rejectionReason,
      })),
  ];

  // Own-company yearly profile rates (same pattern for every water/electricity provider)
  if (
    companySlug &&
    (activeSectors.includes("water") || activeSectors.includes("electricity"))
  ) {
    const sectorOf = await companySectorForSlug(companySlug);
    if (sectorOf === "water" || sectorOf === "electricity") {
      const profile = await getCompanyProfileOverride(companySlug);
      const meta = await providerMetaForSlug(companySlug);
      const providerName =
        (meta && "name" in meta && meta.name ? String(meta.name) : "") ||
        companySlug;
      const history: Record<string, number> = {
        ...((meta && "yearlyRateHistory" in meta
          ? (meta.yearlyRateHistory as Record<string, number>)
          : {}) || {}),
        ...(profile?.yearlyRateHistory ?? {}),
      };
      const seedElec = MOGADISHU_ELECTRICITY_PROVIDERS.find(
        (p) => p.slug === companySlug
      );
      const seedWater = MOGADISHU_WATER_PROVIDERS.find(
        (p) => p.slug === companySlug
      );
      const tiers: Record<
        string,
        { low: number; mid: number; high: number }
      > = {
        ...((seedElec?.tierRateHistory as Record<
          string,
          { low: number; mid: number; high: number }
        >) || {}),
        ...((meta && "tierRateHistory" in meta
          ? (meta.tierRateHistory as Record<
              string,
              { low: number; mid: number; high: number }
            >)
          : {}) || {}),
        ...(profile?.tierRateHistory ?? {}),
      };
      const unit = sectorOf === "water" ? "per m³" : "per kWh";
      const sectorLabel =
        sectorOf === "water" ? ("Water" as const) : ("Electricity" as const);

      const years = new Set<string>([
        ...Object.keys(history),
        ...Object.keys(tiers),
        ...Object.keys(seedWater?.yearlyRateHistory || {}),
      ]);

      const fromYmd = parseIsoDateOnly(filters.dateFrom);
      const toYmd = parseIsoDateOnly(filters.dateTo);

      for (const yearKey of years) {
        const year = Number(yearKey);
        if (!Number.isFinite(year)) continue;
        if (!yearOverlapsMogadishuRange(year, fromYmd, toYmd)) continue;
        const recorded = new Date(Date.UTC(year, 11, 31, 12, 0, 0));

        const band = tiers[yearKey];
        if (
          sectorOf === "electricity" &&
          band &&
          Number(band.low) > 0 &&
          Number(band.mid) > 0 &&
          Number(band.high) > 0
        ) {
          const bands = [
            { item: "1–1,000 kWh", price: Number(band.low) },
            { item: "1,001–5,000 kWh", price: Number(band.mid) },
            { item: "5,001+ kWh", price: Number(band.high) },
          ];
          for (const b of bands) {
            rows.push({
              id: `YH-${sectorOf}-${companySlug}-${year}-${b.item}`,
              sector: sectorLabel,
              item: b.item,
              provider: providerName,
              unit,
              price: b.price,
              status: "APPROVED",
              dateRecorded: recorded.toISOString(),
              submittedBy: "Price History",
              rejectionReason: null,
            });
          }
          continue;
        }

        const price = Number(
          history[yearKey] ??
            seedWater?.yearlyRateHistory?.[year]
        );
        if (!Number.isFinite(price) || price <= 0) continue;
        rows.push({
          id: `YH-${sectorOf}-${companySlug}-${year}`,
          sector: sectorLabel,
          item: "Standard rate",
          provider: providerName,
          unit,
          price,
          status: "APPROVED",
          dateRecorded: recorded.toISOString(),
          submittedBy: "Yearly rate",
          rejectionReason: null,
        });
      }
    }
  }

  rows.sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));

  return {
    rows,
    summary: buildSummary(rows),
    filters: {
      dateFrom: dateFrom?.toISOString() ?? null,
      dateTo: dateTo?.toISOString() ?? null,
      sector,
      status,
      sectionId: selectedSection?.id ?? sectionId,
      company: filters.company?.trim() || null,
      provider: filters.provider?.trim() || companyOrProvider,
    },
    scoped,
  };
}
