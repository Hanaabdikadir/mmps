/** Muqdishu Market Price System — bilingual home / sector content */

import { LIVESTOCK_PHOTO_URLS } from "./livestock-data";

/** Official full system name — use everywhere for branding */
export const SYSTEM_NAME = "Mogadishu Market Price System";

/**
 * Official short name (acronym).
 * Muqdishu Market Price System
 */
export const SYSTEM_SHORT = "MMPS";

/** Public sector names in display order (xoolaha → korontada → biyaha). */
export const SYSTEM_SECTORS_TAGLINE = "Xoolaha · Korontada · Biyaha";
export const SYSTEM_SECTORS_TAGLINE_EN = "Livestock · Electricity · Water";

/** Canonical sector order across UI (xoolaha → korontada → biyaha). */
export const SECTOR_DISPLAY_ORDER = ["livestock", "electricity", "water"] as const;

/** Two-line wrap for thesis-readable brand blocks */
export const SYSTEM_NAME_LINES = [
  "Mogadishu Market",
  "Price System",
] as const;

export const SYSTEM_NAME_LINES_SO = [
  "Nidaamka Qiimaha",
  "Suuqa Muqdisho",
] as const;

/** Somali short label (eyebrow / secondary) */
export const SYSTEM_NAME_SOMALI = "Nidaamka Qiimaha Suuqa Muqdisho";

/** Official support inbox */
export const MMPS_SUPPORT_EMAIL = "info@mmps.so";

export const MMPS_PLATFORM_DOMAIN = "mmps.so";
export const MMPS_LEGACY_PLATFORM_DOMAIN = "smmps.so";

/** Platform operator accounts (@mmps.so, legacy @smmps.so). */
export function isMmpsPlatformEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return (
    e.endsWith(`@${MMPS_PLATFORM_DOMAIN}`) ||
    e.endsWith(`@${MMPS_LEGACY_PLATFORM_DOMAIN}`)
  );
}

/** One-line hero / eyebrow: acronym + official English name */
export const MMPS_TAGLINE = `${SYSTEM_SHORT} — ${SYSTEM_NAME}`;

/** Somali professional name */
export const MMPS_TAGLINE_SOMALI = `${SYSTEM_NAME_SOMALI} — ${SYSTEM_SHORT}`;

export const MMPS_MISSION_EN =
  "The Mogadishu Market Price System (MMPS) provides up-to-date, verified price information for livestock, water, and electricity in Mogadishu, Somalia.";

export const MMPS_MISSION_SO =
  "Nidaamka Qiimaha Suuqa Muqdisho (MMPS) wuxuu bixiyaa xog ku saabsan qiimaha xoolaha, biyaha, iyo korontada ee Muqdisho, Soomaaliya.";

export const MMPS_MISSION = MMPS_MISSION_SO;

/** @deprecated use MMPS_TAGLINE */
export const SMMPS_TAGLINE = MMPS_TAGLINE;
/** @deprecated use MMPS_TAGLINE_SOMALI */
export const SMMPS_TAGLINE_SOMALI = MMPS_TAGLINE_SOMALI;
/** @deprecated use MMPS_MISSION_EN */
export const SMMPS_MISSION_EN = MMPS_MISSION_EN;
/** @deprecated use MMPS_MISSION_SO */
export const SMMPS_MISSION_SO = MMPS_MISSION_SO;
/** @deprecated use MMPS_MISSION_SO / MMPS_MISSION_EN */
export const SMMPS_MISSION = MMPS_MISSION;

export const HOME_SECTORS = [
  {
    id: "livestock",
    english: "Livestock",
    somali: "Xoolaha",
    titleEn: "Livestock Market",
    titleSo: "Suuqa Xoolaha",
    href: "/livestock",
    descriptionEn:
      "Official Mogadishu market prices for camels, cattle, goats and sheep.",
    descriptionSo:
      "Suuqaan wuxuu soo bandhigaya xogta ku saabsan qiimaha xoolaha.",
    highlightsEn: ["Camels", "Cattle", "Goats & Sheep"],
    highlightsSo: ["Geelka", "Lo'da", "Ari & Ido"],
    image: LIVESTOCK_PHOTO_URLS.marketHero,
    imageFocus: "50% 45%",
    gradient: "from-[#22c55e] to-[#16a34a]",
    iconColor: "text-[#16a34a]",
    iconColorOnDark: "text-green-300",
    iconBg: "bg-green-100 ring-1 ring-green-200/80",
    iconBoxOnDark: "bg-white/90 ring-1 ring-green-200/60",
    accent: "text-green-800",
    border: "border-green-200",
    bg: "bg-green-50/50",
  },
  {
    id: "electricity",
    english: "Electricity",
    somali: "Korontada",
    titleEn: "Electricity Market",
    titleSo: "Suuqa Korontada",
    href: "/electricity",
    descriptionEn: "Follow Electricity Prices",
    descriptionSo: "La soco qiimaha korontada.",
    highlightsEn: [] as string[],
    highlightsSo: [] as string[],
    image: "/images/electricity/electricity-hero-bg.jpg",
    imageFocus: "50% 40%",
    gradient: "from-[#f59e0b] to-[#d97706]",
    iconColor: "text-[#d97706]",
    iconColorOnDark: "text-amber-300",
    iconBg: "bg-amber-100 ring-1 ring-amber-200/80",
    iconBoxOnDark: "bg-white/90 ring-1 ring-amber-200/60",
    accent: "text-amber-800",
    border: "border-amber-200",
    bg: "bg-amber-50/50",
  },
  {
    id: "water",
    english: "Water",
    somali: "Biyaha",
    titleEn: "Water Market",
    titleSo: "Suuqa Biyaha",
    href: "/water",
    descriptionEn: "Follow Water Prices",
    descriptionSo: "La soco qiimaha biyaha.",
    highlightsEn: [] as string[],
    highlightsSo: [] as string[],
    image: "/images/water/water-market-card.jpg",
    imageFocus: "50% 50%",
    gradient: "from-[#3b82f6] to-[#2563eb]",
    iconColor: "text-[#2563eb]",
    iconColorOnDark: "text-blue-300",
    iconBg: "bg-blue-100 ring-1 ring-blue-200/80",
    iconBoxOnDark: "bg-white/90 ring-1 ring-blue-200/60",
    accent: "text-blue-800",
    border: "border-blue-200",
    bg: "bg-blue-50/50",
  },
] as const;

export const LIVESTOCK_CATEGORIES = [
  {
    id: "geel",
    somali: "Geelka",
    english: "Camels",
    subtitleEn: "Camel Types",
    subtitleSo: "Noocyada Geelka",
    types: ["Awr", "Hal", "Qurbac", "Qalin", "Baarqab"],
    href: "/livestock/geel",
    image: LIVESTOCK_PHOTO_URLS.geel,
    gradient: "from-amber-500 to-orange-600",
    accent: "text-amber-800",
    border: "border-amber-200",
    bg: "bg-amber-50/60",
  },
  {
    id: "loda",
    somali: "Lo'da",
    english: "Cattle",
    subtitleEn: "Cattle Types",
    subtitleSo: "Noocyada Lo'da",
    types: ["Sac", "Dibi", "Weyl", "Qaalin"],
    href: "/livestock/loda",
    image: LIVESTOCK_PHOTO_URLS.loda,
    gradient: "from-emerald-500 to-green-600",
    accent: "text-emerald-800",
    border: "border-emerald-200",
    bg: "bg-emerald-50/60",
  },
  {
    id: "arri",
    somali: "Ari & Ido",
    english: "Sheep & Goats",
    subtitleEn: "Goat & Sheep Types",
    subtitleSo: "Noocyada Arriga",
    types: ["Lax", "Wan", "Caysan", "Orgi", "Neyl", "Ri", "Waxar", "Sabeen", "Suman"],
    href: "/livestock/arri",
    image: LIVESTOCK_PHOTO_URLS.arri,
    gradient: "from-teal-500 to-cyan-600",
    accent: "text-teal-800",
    border: "border-teal-200",
    bg: "bg-teal-50/60",
  },
] as const;

/** Original outline chips — light fill, colored ring and text. */
export const LIVESTOCK_TYPE_CHIP_CLASS: Record<string, string> = {
  Awr: "text-emerald-700 ring-emerald-400 bg-white",
  Hal: "text-amber-700 ring-amber-400 bg-white",
  Qurbac: "text-teal-700 ring-teal-400 bg-white",
  Gurbac: "text-teal-700 ring-teal-400 bg-white",
  Qalin: "text-orange-700 ring-orange-400 bg-white",
  Rati: "text-lime-700 ring-lime-400 bg-white",
  Baarqab: "text-yellow-700 ring-yellow-400 bg-white",
  Sac: "text-green-700 ring-green-400 bg-white",
  Dibi: "text-amber-700 ring-amber-400 bg-white",
  Weyl: "text-teal-700 ring-teal-400 bg-white",
  Qaalin: "text-rose-600 ring-rose-400 bg-white",
  Lax: "text-teal-700 ring-teal-400 bg-white",
  Wan: "text-violet-600 ring-violet-400 bg-white",
  Caysan: "text-emerald-700 ring-emerald-400 bg-white",
  Orgi: "text-orange-700 ring-orange-400 bg-white",
  Neyl: "text-green-800 ring-green-500 bg-white",
  Ri: "text-rose-600 ring-rose-400 bg-white",
  Riyo: "text-rose-600 ring-rose-400 bg-white",
  Waxar: "text-sky-600 ring-sky-400 bg-white",
  Wahar: "text-sky-600 ring-sky-400 bg-white",
  Sabeen: "text-blue-700 ring-blue-400 bg-white",
  Suman: "text-stone-700 ring-stone-400 bg-white",
};

export const DISTRICT_COUNT = 16;

/** Common provider pill / contact value labels — English → Somali */
export const PROVIDER_PILL_SO: Record<string, string> = {
  "Grid Electricity & Solar Power": "Korontada Shabakadda & Tamarta Qorraxda",
  "Grid Electricity": "Korontada Shabakadda",
  "Underground Borehole Water": "Biyaha Ceelasha Dhulka",
  "Livestock Market & Trading": "Suuqa Xoolaha & Ganacsiga",
  "Open 24 Hours": "Furan 24 Saacadood",
  Mobile: "Moobil",
};

/** Localize a shared provider pill/label for the active language. */
export function localizeProviderLabel(
  value: string,
  lang: "en" | "so"
): string {
  if (lang !== "so") return value;
  return PROVIDER_PILL_SO[value] ?? value;
}

/** Short English water home/sector card titles. */
export const WATER_CARD_TITLE_EN: Record<string, string> = {
  bawadco: "BAWADCO",
  wabax: "WABAX",
  "banadir-water": "Towfiiq",
};

/** Somali water card titles — each company is prefixed. */
export const WATER_CARD_TITLE_SO: Record<string, string> = {
  bawadco: "Shirkada biyaha hormarinta Banadir",
  wabax: "Shirkada biyaha hormarinta Wabax",
  "banadir-water": "Shirkada biyaha Towfiiq",
};

export const WATER_CARD_LABEL_EN: Record<string, string> = {
  bawadco: "BANADIR WATER DEVELOPMENT CO.",
  wabax: "WABAX WATER SUPPLY CO.",
  "banadir-water": "TOWFIIQ WATER DEVELOPMENT CO.",
};

/** Short English electricity home/sector card titles (full `cardTitle` / names stay for hero/meta). */
export const ELECTRICITY_CARD_TITLE_EN: Record<string, string> = {
  beco: "BECO",
  "mogadishu-power-supply": "MPS",
  "blue-sky-energy": "BSE",
};

/** Short Somali electricity home/sector card titles (full `somali` names stay for hero/meta). */
export const ELECTRICITY_CARD_TITLE_SO: Record<string, string> = {
  beco: "Shirkada Korontada Beco",
  "mogadishu-power-supply": "Shirkada Korontada MPS",
  "blue-sky-energy": "Shirkada Korontada BSE",
};
