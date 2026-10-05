import { Droplets, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  BAWADCO_YEARLY_RATE_HISTORY,
  type WaterProviderMeta,
} from "@/lib/water-data";
import {
  ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY,
  ELECTRICITY_USAGE_TIERS,
  defaultElectricityTierRateMap,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";
import { adminMarketImageUrl } from "@/lib/market-logo-url";
import { getMarketLogoMap, withLogo } from "@/lib/market-logo-db";

const SLUG_PREFIX = "sa-market-";

export function adminMarketSlug(id: number) {
  return `${SLUG_PREFIX}${id}`;
}

export function parseAdminMarketSlug(slug: string): number | null {
  if (!slug.startsWith(SLUG_PREFIX)) return null;
  const id = Number(slug.slice(SLUG_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type AdminUtilityMarket = {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  marketType: "WATER" | "ELECTRICITY";
  logoFileName?: string | null;
};

export async function findActiveAdminUtilityMarket(
  id: number
): Promise<AdminUtilityMarket | null> {
  const row = await prisma.market.findFirst({
    where: {
      id,
      deletedAt: null,
      status: "ACTIVE",
      marketType: { in: ["WATER", "ELECTRICITY"] },
    },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      marketType: true,
    },
  });
  if (!row) return null;
  if (row.marketType !== "WATER" && row.marketType !== "ELECTRICITY") return null;
  const logos = await getMarketLogoMap([row.id]);
  return withLogo(
    {
      id: row.id,
      name: row.name,
      location: row.location,
      description: row.description,
      marketType: row.marketType,
    },
    logos
  );
}

export async function listActiveAdminUtilityMarkets(
  marketType: "WATER" | "ELECTRICITY"
): Promise<AdminUtilityMarket[]> {
  const rows = await prisma.market.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      marketType,
    },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      marketType: true,
    },
    orderBy: { name: "asc" },
  });
  const logos = await getMarketLogoMap(rows.map((row) => row.id));
  return rows.map((row) =>
    withLogo(
      {
        id: row.id,
        name: row.name,
        location: row.location,
        description: row.description,
        marketType,
      },
      logos
    )
  );
}

export function adminMarketToWaterMeta(m: AdminUtilityMarket): WaterProviderMeta {
  const slug = adminMarketSlug(m.id);
  const place = m.location?.trim() || "Mogadishu, Somalia";
  const brief =
    m.description?.trim() ||
    `${m.name} is a Super Admin water market location on MMPS.`;
  return {
    id: slug,
    slug,
    href: `/water/${slug}`,
    name: m.name,
    somali: m.name,
    tagline: place,
    description: brief,
    address: place,
    location: place,
    companyName: m.name,
    image: adminMarketImageUrl(m.logoFileName, ""),
    imageBg: "bg-white",
    cardImageCrop: "banner",
    imageWidth: 400,
    imageHeight: 160,
    infoTitle: `About ${m.name}`,
    infoBrief: brief,
    yearlyRateHistory: { ...BAWADCO_YEARLY_RATE_HISTORY },
    gradient: "from-sky-600 to-cyan-500",
    headerBg: "from-sky-600 to-cyan-500",
    cardBodyTint: "from-sky-50/90 via-white to-white",
    accent: "text-sky-800",
    accentBg: "bg-sky-50 border-sky-200",
    accentText: "text-sky-900",
    cardBorder: "border-sky-500",
    cardDivider: "bg-sky-500",
    border: "border-t-sky-500",
    bodyBg: "bg-white",
    icon: Droplets,
    cardLabel: "WATER MARKET",
    cardTitle: m.name,
    pillLabel: place,
  };
}

export function adminMarketToElectricityMeta(
  m: AdminUtilityMarket
): ElectricityProviderMeta {
  const slug = adminMarketSlug(m.id);
  const place = m.location?.trim() || "Mogadishu, Somalia";
  const brief =
    m.description?.trim() ||
    `${m.name} is a Super Admin electricity market location on MMPS.`;
  return {
    id: slug,
    slug,
    href: `/electricity/${slug}`,
    name: m.name,
    somali: m.name,
    tagline: place,
    description: brief,
    address: place,
    image: adminMarketImageUrl(m.logoFileName, ""),
    imageBg: "bg-white",
    cardImageCrop: "banner",
    imageWidth: 400,
    imageHeight: 160,
    infoTitle: `About ${m.name}`,
    infoBrief: brief,
    gradient: "from-amber-500 to-yellow-500",
    headerBg: "from-amber-500 to-yellow-500",
    cardBodyTint: "from-amber-50/90 via-white to-white",
    accentText: "text-amber-900",
    accentBg: "bg-amber-50 border-amber-200",
    cardBorder: "border-amber-400",
    cardDivider: "bg-amber-400",
    icon: Zap,
    cardLabel: "ELECTRICITY MARKET",
    cardTitle: m.name,
    pillLabel: place,
    usageTiers: ELECTRICITY_USAGE_TIERS,
    yearlyRateHistory: { ...ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY },
    tierRateHistory: defaultElectricityTierRateMap(),
  };
}
