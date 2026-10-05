import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission, isCompanyAdmin, isLivestockBroker, isSuperAdmin } from "@/lib/auth";
import type { AnimalType, PriceStatus } from "@prisma/client";
import { mogadishuDayEnd, mogadishuDayStart } from "@/lib/mogadishu-time";
import { getAccountPlanTier } from "@/lib/subscriptions";

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!checkPermission(auth.user, "VIEW_REPORTS")) return jsonError("Forbidden", 403);
  if (isCompanyAdmin(auth.user) && !isSuperAdmin(auth.user) && auth.user.companyId) {
    const access = await getAccountPlanTier({ companyId: auth.user.companyId });
    if (access.tier !== "premium") {
      return jsonError("Detailed reports require the 1 Year plan", 403);
    }
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const kind = searchParams.get("kind") || "livestock"; // livestock | market
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const animalType = searchParams.get("animalType") as AnimalType | null;
  const status = searchParams.get("status") as PriceStatus | null;
  const market = searchParams.get("market");

  const dateFrom = mogadishuDayStart(from) ?? undefined;
  const dateTo = mogadishuDayEnd(to) ?? undefined;

  if (kind === "market") {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (isCompanyAdmin(auth.user) && auth.user.companyId) where.companyId = auth.user.companyId;
    if (market) where.marketId = Number(market);
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      };
    }
    if (dateFrom || dateTo) {
      where.effectiveDate = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const rows = await prisma.marketPrice.findMany({
      where,
      include: { company: { select: { name: true } }, market: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: { effectiveDate: "desc" },
      take: 1000,
    });

    const csv = toCsv(
      ["Product", "Company", "Market", "Section", "Price", "Currency", "Unit", "kWh", "m³", "Effective", "Status"],
      rows.map((r) => [
        r.productService,
        r.company?.name,
        r.market?.name,
        r.section?.name,
        r.price.toString(),
        r.currency,
        r.unit,
        r.kilowatt?.toString(),
        r.meterCubic?.toString(),
        r.effectiveDate.toISOString().slice(0, 10),
        r.status,
      ])
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="market-prices-report.csv"`,
      },
    });
  }

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (animalType) where.animalType = animalType;
  if (isLivestockBroker(auth.user)) {
    if (auth.user.brokerId) where.brokerId = auth.user.brokerId;
    else where.updatedById = auth.user.id;
  } else if (!isSuperAdmin(auth.user)) {
    where.status = "APPROVED";
  }
  if (market) where.marketId = Number(market);
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }
  if (dateFrom || dateTo) {
    where.dateRecorded = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const rows = await prisma.livestockPrice.findMany({
    where,
    include: { broker: { select: { name: true } }, market: { select: { name: true } } },
    orderBy: { dateRecorded: "desc" },
    take: 1000,
  });

  const csv = toCsv(
    ["Type", "Category", "Market", "Location", "Broker", "Price", "Currency", "Date", "Status"],
    rows.map((r) => [
      r.animalType,
      r.category,
      r.market?.name,
      r.marketLocation,
      r.broker?.name,
      r.price.toString(),
      r.currency,
      r.dateRecorded.toISOString().slice(0, 10),
      r.status,
    ])
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="livestock-prices-report.csv"`,
    },
  });
}
