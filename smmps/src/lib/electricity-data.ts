import type { LucideIcon } from "lucide-react";
import { Plug, Zap } from "lucide-react";

export type ElectricityServiceKey = "SERVICE_PROVIDER";

export interface ElectricityServiceMeta {
  key: ElectricityServiceKey;
  label: string;
  somali: string;
  description: string;
  gradient: string;
  border: string;
  icon: LucideIcon;
  accentText: string;
  accentBg: string;
}

export const ELECTRICITY_SERVICES: ElectricityServiceMeta[] = [
  {
    key: "SERVICE_PROVIDER",
    label: "Professionals",
    somali: "Xirfadlayaasha",
    description: "Registered electricity service providers in Banadir",
    gradient: "from-emerald-700 to-teal-600",
    border: "border-t-emerald-600",
    icon: Plug,
    accentText: "text-emerald-900",
    accentBg: "bg-emerald-50 border-emerald-200",
  },
];

export const ELECTRICITY_SERVICE_MAP = Object.fromEntries(
  ELECTRICITY_SERVICES.map((s) => [s.key, s])
) as Record<ElectricityServiceKey, ElectricityServiceMeta>;

export const ELECTRICITY_PAGE_CARD_THEME = {
  headerBg: "bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500",
  cardBodyTint: "from-emerald-50/90 via-white to-white",
  accent: "text-emerald-700",
  accentBg: "bg-emerald-50 border-emerald-200",
  accentText: "text-emerald-900",
  chartColor: "#10b981",
} as const;

/** Distinct header + border for each provider detail card (2×2 grid). */
export const ELECTRICITY_PROVIDER_CARD_THEMES = {
  contact: {
    headerBg: "bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400",
    border: "border-rose-200/80",
  },
  info: {
    headerBg: "bg-gradient-to-br from-emerald-700 via-teal-600 to-green-500",
    border: "border-emerald-200/80",
  },
  calculator: {
    headerBg: "bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-400",
    border: "border-amber-200/80",
  },
  rates: {
    headerBg: "bg-gradient-to-br from-teal-700 via-emerald-600 to-green-400",
    border: "border-teal-200/80",
  },
  tariff: {
    headerBg: "bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400",
    border: "border-amber-200/80",
  },
} as const;

export interface ElectricityProviderMeta {
  id: string;
  slug: string;
  href: string;
  name: string;
  somali: string;
  tagline: string;
  taglineSo?: string;
  description: string;
  descriptionSo?: string;
  acronym?: string;
  phone?: string;
  phoneHint?: string;
  telephone?: string;
  alternatePhone?: string;
  callCenter?: string;
  email?: string;
  alternateEmail?: string;
  website?: string;
  address: string;
  addressSo?: string;
  addressLabel?: string;
  supplyType?: string;
  cardLabel: string;
  cardTitle: string;
  pillLabel: string;
  gradient: string;
  headerBg: string;
  cardBodyTint: string;
  accentText: string;
  accentBg: string;
  cardBorder: string;
  cardDivider: string;
  icon: LucideIcon;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBg?: string;
  imageFocus?: string;
  cardImageCrop?: "logo" | "banner";
  imageBlendMultiply?: boolean;
  heroLogoClassName?: string;
  viewBtnText?: string;
  infoTitle?: string;
  infoBrief?: string;
  infoPoints?: string[];
  usageTiers?: ElectricityUsageTier[];
  /** Fixed USD/kWh per calendar year for the rates history panel */
  yearlyRateHistory?: Partial<Record<number, number>>;
  /** Per-year usage-tier tariffs (USD/kWh) managed by company admin */
  tierRateHistory?: ElectricityTierRateMap;
}

export interface ElectricityUsageTier {
  label: string;
  minKwh: number;
  maxKwh: number | null;
  ratePerKwh: number;
  sampleUsage: number;
}

export const ELECTRICITY_USAGE_TIERS: ElectricityUsageTier[] = [
  {
    label: "1–1,000 kWh",
    minKwh: 1,
    maxKwh: 1000,
    ratePerKwh: 0.41,
    sampleUsage: 500,
  },
  {
    label: "1,001–5,000 kWh",
    minKwh: 1001,
    maxKwh: 5000,
    ratePerKwh: 0.35,
    sampleUsage: 2500,
  },
  {
    label: "5,001+ kWh",
    minKwh: 5001,
    maxKwh: null,
    ratePerKwh: 0.3,
    sampleUsage: 6000,
  },
];

/** Column keys for the usage-tier tariff history table */
export type ElectricityTierRateKey = "low" | "mid" | "high";

export interface ElectricityTierRateRow {
  year: number;
  low: number;
  mid: number;
  high: number;
}

/**
 * Official BECO-style usage-tier tariffs (USD/kWh) — 2022–2026.
 * Default seed for electricity providers; each company can override via profileData.
 */
export const ELECTRICITY_TIER_RATE_HISTORY: ElectricityTierRateRow[] = [
  { year: 2026, low: 0.41, mid: 0.35, high: 0.3 },
  { year: 2025, low: 0.41, mid: 0.35, high: 0.3 },
  { year: 2024, low: 0.4, mid: 0.3, high: 0.26 },
  { year: 2023, low: 0.43, mid: 0.38, high: 0.36 },
  { year: 2022, low: 0.45, mid: 0.37, high: 0.33 },
];

export type ElectricityTierRates = {
  low: number;
  mid: number;
  high: number;
};

export type ElectricityTierRateMap = Partial<
  Record<number, ElectricityTierRates>
>;

export function defaultElectricityTierRateMap(): ElectricityTierRateMap {
  const map: ElectricityTierRateMap = {};
  for (const row of ELECTRICITY_TIER_RATE_HISTORY) {
    map[row.year] = { low: row.low, mid: row.mid, high: row.high };
  }
  return map;
}

function normalizeTierRates(raw: unknown): ElectricityTierRates | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const low = Number(o.low);
  const mid = Number(o.mid);
  const high = Number(o.high);
  if (!(low > 0 && mid > 0 && high > 0)) return null;
  return {
    low: Math.round(low * 1000) / 1000,
    mid: Math.round(mid * 1000) / 1000,
    high: Math.round(high * 1000) / 1000,
  };
}

/** Clean a raw tier map (API / profile JSON). */
export function cleanElectricityTierRateMap(
  raw: unknown
): ElectricityTierRateMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ElectricityTierRateMap = {};
  for (const [yearKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const year = Number(yearKey);
    const rates = normalizeTierRates(value);
    if (Number.isFinite(year) && rates) out[year] = rates;
  }
  return out;
}

/** Merge company override onto seed defaults (override wins per year). */
export function mergeElectricityTierRateMap(
  override?: ElectricityTierRateMap | null,
  fallback: ElectricityTierRateMap = defaultElectricityTierRateMap()
): ElectricityTierRateMap {
  const cleaned = cleanElectricityTierRateMap(override ?? {});
  return { ...fallback, ...cleaned };
}

/** Headline yearly rates (USD/kWh) from the low (1–1,000) tier. */
export function yearlyRateHistoryFromTiers(
  map: ElectricityTierRateMap
): Partial<Record<number, number>> {
  const out: Partial<Record<number, number>> = {};
  for (const [yearKey, rates] of Object.entries(map)) {
    const year = Number(yearKey);
    if (Number.isFinite(year) && rates && rates.low > 0) {
      out[year] = rates.low;
    }
  }
  return out;
}

/** Build calculator usage tiers from a company's year rates (defaults to 2026). */
export function usageTiersForYear(
  history?: ElectricityTierRateMap | null,
  year = 2026
): ElectricityUsageTier[] {
  const map = mergeElectricityTierRateMap(history);
  const rates = map[year] ?? map[2026] ?? {
    low: 0.41,
    mid: 0.35,
    high: 0.3,
  };

  return [
    {
      label: "1–1,000 kWh",
      minKwh: 1,
      maxKwh: 1000,
      ratePerKwh: rates.low,
      sampleUsage: 500,
    },
    {
      label: "1,001–5,000 kWh",
      minKwh: 1001,
      maxKwh: 5000,
      ratePerKwh: rates.mid,
      sampleUsage: 2500,
    },
    {
      label: "5,001+ kWh",
      minKwh: 5001,
      maxKwh: null,
      ratePerKwh: rates.high,
      sampleUsage: 6000,
    },
  ];
}

export const ELECTRICITY_TIER_COLUMN_META: {
  key: ElectricityTierRateKey;
  labelEn: string;
  labelSo: string;
}[] = [
  { key: "low", labelEn: "1–1,000 kWh", labelSo: "1–1,000 kWh" },
  { key: "mid", labelEn: "1,001–5,000 kWh", labelSo: "1,001–5,000 kWh" },
  { key: "high", labelEn: "5,001+ kWh", labelSo: "5,001+ kWh" },
];

/** Table columns for electricity price history including YoY CHANGE. */
export const ELECTRICITY_TIER_HISTORY_COLUMNS: {
  key: ElectricityTierRateKey | "change";
  labelEn: string;
  labelSo: string;
}[] = [
  ...ELECTRICITY_TIER_COLUMN_META,
  { key: "change", labelEn: "CHANGE", labelSo: "ISBEDDEL" },
];

/**
 * Build tier rate rows with YoY change on the 1–1,000 kWh (low) rate
 * from a company (or default) tier map.
 */
export function buildElectricityTierHistoryRowsFromMap(
  history?: ElectricityTierRateMap | null,
  startYear = 2022,
  endYear = 2026
): Array<{
  year: number;
  rates: Record<string, number>;
}> {
  const byYear = mergeElectricityTierRateMap(history);

  const years: number[] = [];
  for (let y = endYear; y >= startYear; y--) years.push(y);

  return years.map((year) => {
    const row = byYear[year];
    const prev = byYear[year - 1];
    const low = row?.low ?? Number.NaN;
    const mid = row?.mid ?? Number.NaN;
    const high = row?.high ?? Number.NaN;
    let change = Number.NaN;
    if (row && prev) {
      change = Math.round((row.low - prev.low) * 100) / 100;
    } else if (row && year === startYear) {
      change = 0;
    }
    return {
      year,
      rates: { low, mid, high, change },
    };
  });
}

/**
 * Build 2022–2026 tier rate rows with YoY change on the 1–1,000 kWh (low) rate.
 */
export function buildElectricityTierHistoryRows(
  startYear = 2022,
  endYear = 2026
): Array<{
  year: number;
  rates: Record<string, number>;
}> {
  return buildElectricityTierHistoryRowsFromMap(
    defaultElectricityTierRateMap(),
    startYear,
    endYear
  );
}

/** Standard 5-year price history (USD per kWh) — shared across all Mogadishu electricity providers */
export const ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY: Partial<
  Record<number, number>
> = {
  2022: 0.35,
  2023: 0.38,
  2024: 0.41,
  2025: 0.41,
  2026: 0.41,
};

/** Blue Sky Energy price history (USD per kWh) */
export const BLUE_SKY_YEARLY_RATE_HISTORY: Partial<Record<number, number>> = {
  2022: 0.35,
  2023: 0.38,
  2024: 0.41,
  2025: 0.41,
  2026: 0.41,
};

export const ELECTRICITY_PROVIDER_SLUGS = [
  "beco",
  "mogadishu-power-supply",
  "blue-sky-energy",
] as const;

export type ElectricityProviderSlug = (typeof ELECTRICITY_PROVIDER_SLUGS)[number];

export const MOGADISHU_ELECTRICITY_PROVIDERS: ElectricityProviderMeta[] = [
  {
    id: "beco",
    slug: "beco",
    href: "/electricity/beco",
    name: "BECO",
    somali: "Shirkadda BECO",
    tagline: "Powering Somalia",
    taglineSo: "Korontada Soomaaliya",
    description:
      "BECO is a Somalia-based energy company that owns and operates most of the electricity transmission and distribution systems in South Central Somalia. BECO provides quality and reliable electricity service to some of our state’s biggest industries and residential areas, thus boosting the operating areas’ socio-economic development. We aim to go beyond the normal call of duty and hope to build strong, long-lasting relationships with our clients. All of our work is carried out to the highest standards and we pride ourselves on being big enough to deliver and care.",
    descriptionSo:
      "BECO waa shirkadda ugu weyn ee bixisa korontada Soomaaliya, iyadoo adeegsanaysa koronto danab sare leh iyo nidaamyada tamarta qorraxda.",
    acronym: "BECO",
    phone: "+252 619 111 114",
    callCenter: "333",
    email: "info@beco.so",
    website: "https://beco.so/",
    address: "Tarabuun Street, Hodan District, Mogadishu, Somalia",
    addressSo: "Waddada Tarabuun, Degmada Hodan, Muqdisho, Soomaaliya",
    addressLabel: "Head Office",
    supplyType: "Grid Electricity & Solar Power",
    cardLabel: "BENADIR ELECTRIC CO.",
    cardTitle: "BECO",
    pillLabel: "Grid Electricity & Solar Power",
    gradient: "from-teal-600 to-emerald-500",
    headerBg: "from-teal-600 to-emerald-500",
    cardBodyTint: "from-teal-50/90 via-white to-white",
    accentText: "text-teal-900",
    accentBg: "bg-teal-50 border-teal-200",
    cardBorder: "border-teal-300",
    cardDivider: "bg-teal-400",
    icon: Zap,
    image: "/images/electricity/beco-logo.png",
    imageWidth: 420,
    imageHeight: 140,
    imageBg: "bg-white",
    /** Contain scale matches MPS / Blue Sky visual weight */
    cardImageCrop: "banner",
    imageFocus: "50% 50%",
    infoTitle: "About BECO",
    infoBrief:
      "BECO is a Somalia-based energy company that owns and operates most of the electricity transmission and distribution systems in South Central Somalia. BECO provides quality and reliable electricity service to some of our state’s biggest industries and residential areas, thus boosting the operating areas’ socio-economic development. We aim to go beyond the normal call of duty and hope to build strong, long-lasting relationships with our clients. All of our work is carried out to the highest standards and we pride ourselves on being big enough to deliver and care.",
    infoPoints: [
      "Headquarters: Hodan, Mogadishu",
      "Coverage: All 17 districts of Banadir Region",
      "Also serves Jubbaland, South West State, and Hirshabelle",
      "Key sites: Aden Adde Airport, Mogadishu Seaport, government & embassies",
      "Energy: Grid electricity & solar power",
      "Support: +252 619 111 114 · Call Center: 333 · info@beco.so",
    ],
    usageTiers: ELECTRICITY_USAGE_TIERS,
    yearlyRateHistory: ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY,
    tierRateHistory: defaultElectricityTierRateMap(),
  },
  {
    id: "mogadishu-power-supply",
    slug: "mogadishu-power-supply",
    href: "/electricity/mogadishu-power-supply",
    name: "Mogadishu Power Supply",
    somali: "Korontada Muqdisho",
    tagline: "Powering Mogadishu since 1994",
    taglineSo: "Korontada Muqdisho tan iyo 1994",
    description:
      "Mogadishu Power Supply (MPS) is one of Somalia's oldest private electricity companies, providing generation, transmission, distribution, and renewable energy solutions across Mogadishu and nearby regions since 1994.",
    descriptionSo:
      "Mogadishu Power Supply (MPS) waa mid ka mid ah shirkadaha gaarka ah ee korontada ee ugu da'da weyn Soomaaliya, waxayna bixisaa soo saarid, gudbin, qaybin, iyo xalalka tamarta la cusboonaysiin karo ee Muqdisho iyo gobollada u dhow tan iyo 1994.",
    acronym: "MPS",
    callCenter: "188",
    telephone: "654698",
    phone: "+252 621000111",
    phoneHint: "Mobile",
    alternatePhone: "+252 621111100",
    email: "info@muqdishopower.com",
    alternateEmail: "mpspowersupply@gmail.com",
    website: "https://www.muqdishopower.com/",
    address: "Bakaro Market, Howlwadaag District, Mogadishu, Somalia",
    addressSo: "Suuqa Bakaaraha, Degmada Howlwadaag, Muqdisho, Soomaaliya",
    addressLabel: "Head Office",
    supplyType: "Grid Electricity & Solar Power",
    cardLabel: "MOGADISHU POWER SUPPLY CO.",
    cardTitle: "Mogadishu Power",
    pillLabel: "Grid Electricity & Solar Power",
    viewBtnText: "text-amber-950",
    gradient: "from-amber-500 to-yellow-500",
    headerBg: "from-amber-500 to-yellow-500",
    cardBodyTint: "from-amber-50/90 via-white to-white",
    accentText: "text-amber-900",
    accentBg: "bg-amber-50 border-amber-200",
    cardBorder: "border-amber-300",
    cardDivider: "bg-amber-400",
    icon: Zap,
    image: "/images/electricity/banadir-power-logo.png",
    imageWidth: 440,
    imageHeight: 140,
    imageBg: "bg-[#F5C518]",
    heroLogoClassName: "h-16 w-[7.5rem] rounded-xl p-0 ring-0",
    cardImageCrop: "banner",
    infoTitle: "About Mogadishu Power Supply",
    infoBrief:
      "Mogadishu Power Supply (MPS) is one of Somalia's oldest private electricity companies, founded in 1994. The company provides electricity generation, transmission, distribution, electrical installation services, and renewable energy solutions for residential, commercial, and industrial customers across Mogadishu and nearby regions.",
    infoPoints: [
      "Headquarters: Bakaro Market, Howlwadaag",
      "Coverage: Bakaro, Howlwadaag, Waberi, Hodan, Yaaqshiid, Hiliwaa & more",
      "Also serves Dayniile, Kaaraan, Tabeelaha, Garasbaaley, Balcad & Jowhar",
      "Services: Grid supply, installations & renewable energy solutions",
      "Energy: Grid electricity & solar power",
      "Support: Call Center 188 · +252 621000111 · info@muqdishopower.com",
    ],
    usageTiers: ELECTRICITY_USAGE_TIERS,
    yearlyRateHistory: ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY,
    tierRateHistory: defaultElectricityTierRateMap(),
  },
  {
    id: "blue-sky-energy",
    slug: "blue-sky-energy",
    href: "/electricity/blue-sky-energy",
    name: "Blue Sky Energy",
    somali: "Blue Sky Energy",
    tagline: "Reliable Energy",
    taglineSo: "Tamarta La Isku Hallayn Karo",
    description:
      "Blue Sky Energy (BSE) is a private energy company established in Mogadishu in 2015 to provide reliable, affordable, and safe electricity — including low-, medium-, and high-voltage supply and solar power across Somalia.",
    descriptionSo:
      "Blue Sky Energy (BSE) waa shirkad tamar gaar ah oo Muqdisho laga aasaasay 2015 si ay u bixiso koronto la isku hallayn karo, qiimo jaban, oo ammaan ah — oo ay ku jirto bixinta danab hoose, dhexe, iyo sare iyo tamarta qorraxda ee Soomaaliya.",
    acronym: "BSE",
    callCenter: "3030",
    phone: "+252 62 899 9645",
    phoneHint: "Mobile",
    alternatePhone: "+252 61 287 8830",
    email: "info@blueskyenergy.so",
    website: "https://blueskyenergy.so/",
    address: "Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia",
    addressSo: "Garoonka Eng. Yariisow, Degmada Cabdicasiis, Muqdisho, Soomaaliya",
    addressLabel: "Head Office",
    supplyType: "Grid Electricity & Solar Power",
    cardLabel: "BLUE SKY ENERGY CO.",
    cardTitle: "Blue Sky Energy",
    pillLabel: "Grid Electricity & Solar Power",
    gradient: "from-[#FF8000] to-[#f59e0b]",
    headerBg: "from-[#FF8000] to-[#f59e0b]",
    cardBodyTint: "from-orange-50/90 via-white to-white",
    accentText: "text-orange-900",
    accentBg: "bg-orange-50 border-orange-200",
    cardBorder: "border-orange-400",
    cardDivider: "bg-orange-400",
    icon: Zap,
    image: "/images/electricity/blue-sky-energy-logo.png",
    imageWidth: 440,
    imageHeight: 140,
    imageBg: "bg-white",
    heroLogoClassName: "h-16 w-[7.5rem] rounded-xl p-0 ring-0",
    cardImageCrop: "banner",
    infoTitle: "About Blue Sky Energy",
    infoBrief:
      "Blue Sky Energy (BSE) is a private electricity company established in Mogadishu in 2015, providing reliable grid and solar power services — including low-, medium-, and high-voltage supply across Somalia.",
    infoPoints: [
      "HQ: Abdiaziz District, Mogadishu",
      "Residential, commercial, industrial & government customers",
      "NGOs and international companies served nationwide",
      "Low, medium & high voltage electricity across Somalia",
      "Energy: Grid electricity & solar power",
      "Support: Call Center 3030 · +252 62 899 9645 · info@blueskyenergy.so",
    ],
    usageTiers: ELECTRICITY_USAGE_TIERS,
    yearlyRateHistory: BLUE_SKY_YEARLY_RATE_HISTORY,
    tierRateHistory: defaultElectricityTierRateMap(),
  },
];

export function isElectricityProviderSlug(
  slug: string
): slug is ElectricityProviderSlug {
  return ELECTRICITY_PROVIDER_SLUGS.includes(slug as ElectricityProviderSlug);
}

export function getElectricityProviderBySlug(
  slug: string
): ElectricityProviderMeta | undefined {
  return MOGADISHU_ELECTRICITY_PROVIDERS.find((p) => p.slug === slug);
}
