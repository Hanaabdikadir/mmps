import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api-guard";
import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ADVANCED_REPORT_OPTIONS,
  advancedReportToCsv,
  generateAdvancedReport,
  type AdvancedReportFilters,
  type AdvancedReportType,
  type PriceCompareOp,
  type RateSort,
  type RegisteredKind,
  type UtilityKind,
} from "@/lib/super-admin-advanced-reports";
import {
  isValidReportYear,
  REPORT_YEAR_MAX,
  REPORT_YEAR_MIN,
  validateReportDateRange,
  validateReportMonthRange,
} from "@/lib/super-admin-advanced-reports-shared";
import { ensureCompanyMarketsLinked } from "@/lib/company-default-market";
import { adminLivestockName } from "@/lib/livestock-data";
import { isRetiredLivestockType } from "@/lib/livestock-section-prices";
import { ensureLivestockCatalog } from "@/lib/livestock-catalog";

function parseBody(body: Record<string, unknown>): AdvancedReportFilters {
  return {
    reportType: String(body.reportType || "") as AdvancedReportType,
    dateFrom: body.dateFrom ? String(body.dateFrom) : null,
    dateTo: body.dateTo ? String(body.dateTo) : null,
    marketName: body.marketName ? String(body.marketName) : null,
    marketNameB: body.marketNameB ? String(body.marketNameB) : null,
    livestockTypeId:
      body.livestockTypeId != null && body.livestockTypeId !== ""
        ? Number(body.livestockTypeId)
        : null,
    companySlug: body.companySlug ? String(body.companySlug) : null,
    companyName: body.companyName ? String(body.companyName) : null,
    companyNameB: body.companyNameB ? String(body.companyNameB) : null,
    utilityKind: (body.utilityKind as UtilityKind) || null,
    priceOp: (body.priceOp as PriceCompareOp) || null,
    priceMin:
      body.priceMin != null && body.priceMin !== ""
        ? Number(body.priceMin)
        : null,
    priceMax:
      body.priceMax != null && body.priceMax !== ""
        ? Number(body.priceMax)
        : null,
    rateSort: (body.rateSort as RateSort) || null,
    year: body.year != null && body.year !== "" ? Number(body.year) : null,
    monthFrom: body.monthFrom ? String(body.monthFrom) : null,
    monthTo: body.monthTo ? String(body.monthTo) : null,
    registeredKind: (body.registeredKind as RegisteredKind) || null,
    livestockSeason:
      body.livestockSeason === "sugunto" || body.livestockSeason === "birimo"
        ? body.livestockSeason
        : null,
    ageClass: body.ageClass ? String(body.ageClass).trim() : null,
    ageMin:
      body.ageMin != null && body.ageMin !== "" ? Number(body.ageMin) : null,
    ageMax:
      body.ageMax != null && body.ageMax !== "" ? Number(body.ageMax) : null,
    originPlace: body.originPlace ? String(body.originPlace).trim() : null,
    livestockCategory: body.livestockCategory
      ? String(body.livestockCategory).trim()
      : null,
    approvalStatus:
      body.approvalStatus === "PENDING" ||
      body.approvalStatus === "APPROVED" ||
      body.approvalStatus === "REJECTED"
        ? body.approvalStatus
        : null,
    sector: body.sector ? String(body.sector).trim().toLowerCase() : null,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!isSuperAdmin(auth.user)) {
    return jsonError("Forbidden — Super Admin only", 403);
  }

  await ensureCompanyMarketsLinked();
  await ensureLivestockCatalog();

  const [
    waterCompanies,
    electricityCompanies,
    waterProviders,
    elecProviders,
    animalTypes,
    livestockMarkets,
    rawAges,
  ] = await Promise.all([
      prisma.company.findMany({
        where: { deletedAt: null, type: "WATER_SUPPLY" },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.company.findMany({
        where: { deletedAt: null, type: "ELECTRICITY" },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.waterPrice.findMany({
        distinct: ["providerName"],
        select: { providerName: true },
        orderBy: { providerName: "asc" },
      }),
      prisma.electricityPrice.findMany({
        distinct: ["providerName"],
        select: { providerName: true },
        orderBy: { providerName: "asc" },
      }),
      prisma.livestockAnimalType.findMany({
        where: { status: "ACTIVE" },
        include: {
          category: { select: { name: true, nameSomali: true, slug: true } },
        },
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.market.findMany({
        where: { deletedAt: null, marketType: "LIVESTOCK" },
        select: { id: true, name: true, location: true, status: true },
        orderBy: { name: "asc" },
      }),
      prisma.livestockPrice.findMany({
        where: { deletedAt: null, ageClass: { not: null } },
        select: { ageClass: true },
        distinct: ["ageClass"],
      }),
    ]);

  const uniq = (names: string[]) =>
    [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

  const defaultAges = ["1jir", "2jir", "3jir", "4jir"];
  const livestockAges = [
    ...new Set([
      ...rawAges.map((a) => (a.ageClass || "").trim()).filter(Boolean),
      ...defaultAges,
    ]),
  ]
    .filter((a) => {
      const lower = a.toLowerCase();
      return (
        lower !== "yar" &&
        lower !== "weyn" &&
        lower !== "young" &&
        lower !== "adult"
      );
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const livestockTypes = animalTypes
    .filter((t) => !isRetiredLivestockType(t.slug, t.name, t.nameSomali))
    .map((t) => {
      const label = adminLivestockName(t.name, t.nameSomali) || t.name;
      return {
        id: t.id,
        label,
        categoryLabel:
          adminLivestockName(t.category?.name, t.category?.nameSomali) ||
          t.category?.slug ||
          "—",
        status: t.status,
      };
    });

  return NextResponse.json({
    options: ADVANCED_REPORT_OPTIONS,
    livestockTypes,
    livestockMarkets: livestockMarkets.map((m) => ({
      id: m.id,
      name: m.name,
      location: m.location,
      label: m.name,
    })),
    livestockAges,
    utilityCompanies: {
      water: uniq([
        ...waterCompanies.map((c) => c.name),
        ...waterProviders.map((p) => p.providerName),
      ]),
      electricity: uniq([
        ...electricityCompanies.map((c) => c.name),
        ...elecProviders.map((p) => p.providerName),
      ]),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!isSuperAdmin(auth.user)) {
    return jsonError("Forbidden — Super Admin only", 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const filters = parseBody(body);
  if (!filters.reportType) {
    return jsonError("reportType is required", 400);
  }

  const dateError = validateReportDateRange(filters.dateFrom, filters.dateTo);
  if (dateError) {
    return jsonError(dateError, 400);
  }
  if (!isValidReportYear(filters.year)) {
    return jsonError(
      `Year must be between ${REPORT_YEAR_MIN} and ${REPORT_YEAR_MAX}.`,
      400
    );
  }
  if (filters.reportType === "registered_in_year") {
    const monthError = validateReportMonthRange(
      filters.monthFrom,
      filters.monthTo
    );
    if (monthError) {
      return jsonError(monthError, 400);
    }
  }

  const format = String(body.format || "json").toLowerCase();

  try {
    const report = await generateAdvancedReport(filters);

    if (format === "csv") {
      const csv = advancedReportToCsv(report);
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mmps-${filters.reportType}-${stamp}.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    console.error("[super-admin/advanced-reports]", e);
    const msg = e instanceof Error ? e.message : "Failed to generate report";
    const badDate = /invalid date/i.test(msg);
    return jsonError(msg, badDate ? 400 : 500);
  }
}
