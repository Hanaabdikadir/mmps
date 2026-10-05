import type { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function marketTypeForCompanyType(
  type: CompanyType
): "WATER" | "ELECTRICITY" | null {
  if (type === "WATER_SUPPLY") return "WATER";
  if (type === "ELECTRICITY") return "ELECTRICITY";
  return null;
}

export function defaultMarketNameForCompanyType(type: CompanyType): string | null {
  if (type === "WATER_SUPPLY") return "Water Supply Market";
  if (type === "ELECTRICITY") return "Electricity Market";
  return null;
}

export async function findDefaultMarketForCompanyType(
  type: CompanyType
): Promise<{ id: number | null; name: string } | null> {
  const marketType = marketTypeForCompanyType(type);
  if (!marketType) return null;
  const preferred = defaultMarketNameForCompanyType(type);
  const markets = await prisma.market.findMany({
    where: { deletedAt: null, status: "ACTIVE", marketType },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  if (preferred) {
    const named = markets.find(
      (m) => m.name.trim().toLowerCase() === preferred.toLowerCase()
    );
    if (named) return named;
  }
  if (markets[0]) return markets[0];
  return preferred ? { id: null, name: preferred } : null;
}

const ENSURE_TTL_MS = 30_000;
let lastEnsureAt = 0;
let ensureInFlight: Promise<number> | null = null;

export async function backfillMissingCompanyMarkets() {
  const [water, electricity] = await Promise.all([
    findDefaultMarketForCompanyType("WATER_SUPPLY"),
    findDefaultMarketForCompanyType("ELECTRICITY"),
  ]);

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      type: { in: ["WATER_SUPPLY", "ELECTRICITY"] },
    },
    select: { id: true, type: true, marketId: true },
  });

  let updated = 0;
  for (const company of companies) {
    const fallback = company.type === "WATER_SUPPLY" ? water : electricity;
    let marketId = company.marketId;
    if (!marketId && fallback?.id) {
      await prisma.company.update({
        where: { id: company.id },
        data: { marketId: fallback.id },
      });
      marketId = fallback.id;
      updated += 1;
    }
    if (!marketId) continue;
    const users = await prisma.user.updateMany({
      where: {
        deletedAt: null,
        companyId: company.id,
        marketId: null,
      },
      data: { marketId },
    });
    updated += users.count;
  }
  return updated;
}

/** Link water/electricity companies (and their admins) to the sector market. */
export async function ensureCompanyMarketsLinked() {
  const now = Date.now();
  if (now - lastEnsureAt < ENSURE_TTL_MS) return;
  if (ensureInFlight) return ensureInFlight;
  ensureInFlight = backfillMissingCompanyMarkets()
    .then((count) => {
      lastEnsureAt = Date.now();
      return count;
    })
    .finally(() => {
      ensureInFlight = null;
    });
  return ensureInFlight;
}
