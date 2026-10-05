import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";

export type PublicMarketSector = "livestock" | "water" | "electricity";

const SECTOR_TO_MARKET_TYPE: Record<
  PublicMarketSector,
  "LIVESTOCK" | "WATER" | "ELECTRICITY"
> = {
  livestock: "LIVESTOCK",
  water: "WATER",
  electricity: "ELECTRICITY",
};

const MARKET_TYPE_TO_SECTOR: Record<string, PublicMarketSector> = {
  LIVESTOCK: "livestock",
  WATER: "water",
  ELECTRICITY: "electricity",
};

/**
 * Public sector hubs stay open unless Super Admin suspends that market type.
 * Missing market rows do not block the public site.
 */
export async function isPublicSectorActive(
  sector: PublicMarketSector
): Promise<boolean> {
  try {
    const markets = await withDbTimeout(
      prisma.market.findMany({
        where: {
          deletedAt: null,
          marketType: SECTOR_TO_MARKET_TYPE[sector],
        },
        select: { status: true },
      })
    );
    if (markets.length === 0) return true;
    return markets.some(
      (row) => String(row.status).toUpperCase() === "ACTIVE"
    );
  } catch {
    return true;
  }
}

export async function getActivePublicSectors(): Promise<PublicMarketSector[]> {
  const sectors: PublicMarketSector[] = ["livestock", "electricity", "water"];
  const active: PublicMarketSector[] = [];
  for (const sector of sectors) {
    if (await isPublicSectorActive(sector)) active.push(sector);
  }
  return active;
}

export async function getPublicMarketAvailability(): Promise<
  Record<PublicMarketSector, boolean>
> {
  const [livestock, water, electricity] = await Promise.all([
    isPublicSectorActive("livestock"),
    isPublicSectorActive("water"),
    isPublicSectorActive("electricity"),
  ]);
  return { livestock, water, electricity };
}

export const getPublicMarketAvailabilityCached = unstable_cache(
  async () => getPublicMarketAvailability(),
  ["public-market-availability"],
  { revalidate: 30 }
);

export function sectorFromMarketType(
  marketType: string
): PublicMarketSector | null {
  return MARKET_TYPE_TO_SECTOR[marketType.toUpperCase()] ?? null;
}
