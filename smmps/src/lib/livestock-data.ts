/** Somali livestock reference data — Mogadishu market categories & 10-year price guides */

/** HD livestock market logo (camel, cow, goat) — Super Admin company avatars */
export const LIVESTOCK_MARKET_LOGO =
  "/images/livestock/livestock-market-logo.png";

export const LIVESTOCK_COLUMNS = {
  geel: { key: "geel", somali: "Geelka", english: "Camels" },
  loda: { key: "loda", somali: "Loda", english: "Cattle" },
  arri: { key: "arri", somali: "Ari & Ido", english: "Sheep & Goats" },
} as const;

export type LivestockColumnKey = keyof typeof LIVESTOCK_COLUMNS;

export const LIVESTOCK_CATEGORY_SLUGS = ["geel", "loda", "arri"] as const;
export type LivestockCategorySlug = (typeof LIVESTOCK_CATEGORY_SLUGS)[number];

export const LIVESTOCK_CATEGORY_PAGES: Record<
  LivestockCategorySlug,
  {
    slug: LivestockCategorySlug;
    somali: string;
    english: string;
    href: string;
    gradient: string;
    accent: string;
    border: string;
    bg: string;
    topBorder: string;
    animalTypes: readonly string[];
    defaultAnimalType: string;
    descriptionEn: string;
    descriptionSo: string;
    eyebrowEn: string;
    eyebrowSo: string;
  }
> = {
  geel: {
    slug: "geel",
    somali: "Geelka",
    english: "Camels",
    href: "/livestock/geel",
    descriptionEn: "Follow camel prices in Mogadishu markets.",
    descriptionSo: "La soco qiimaha geelka ee suuqyada Muqdisho.",
    eyebrowEn: "Livestock Provider",
    eyebrowSo: "Bixiyaha Xoolaha",
    gradient: "from-amber-500 to-orange-600",
    accent: "text-amber-800",
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    topBorder: "border-t-amber-500",
    animalTypes: ["CAMEL"],
    defaultAnimalType: "CAMEL",
  },
  loda: {
    slug: "loda",
    somali: "Loda",
    english: "Cattle",
    href: "/livestock/loda",
    descriptionEn: "Follow cattle prices in Mogadishu markets.",
    descriptionSo: "La soco qiimaha lo'da ee suuqyada Muqdisho.",
    eyebrowEn: "Livestock Provider",
    eyebrowSo: "Bixiyaha Xoolaha",
    gradient: "from-emerald-500 to-green-600",
    accent: "text-emerald-800",
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    topBorder: "border-t-emerald-500",
    animalTypes: ["CATTLE"],
    defaultAnimalType: "CATTLE",
  },
  arri: {
    slug: "arri",
    somali: "Ari & Ido",
    english: "Sheep & Goats",
    href: "/livestock/arri",
    descriptionEn: "Follow goat and sheep prices in Mogadishu markets.",
    descriptionSo: "La soco qiimaha arriga iyo idaha ee suuqyada Muqdisho.",
    eyebrowEn: "Livestock Provider",
    eyebrowSo: "Bixiyaha Xoolaha",
    gradient: "from-teal-500 to-cyan-600",
    accent: "text-teal-800",
    border: "border-teal-200",
    bg: "bg-teal-50/50",
    topBorder: "border-t-teal-500",
    animalTypes: ["GOAT", "SHEEP"],
    defaultAnimalType: "",
  },
};

export function isLivestockCategorySlug(
  value: string
): value is LivestockCategorySlug {
  return LIVESTOCK_CATEGORY_SLUGS.includes(value as LivestockCategorySlug);
}

export function filterRecordsForCategory<T extends { animalType: string }>(
  records: T[],
  category: LivestockCategorySlug,
  animalType?: string
): T[] {
  if (animalType) return records;
  const allowed = LIVESTOCK_CATEGORY_PAGES[category].animalTypes;
  return records.filter((r) => allowed.includes(r.animalType));
}

/** Section 1 — Noocyada Xoolaha (Types of Livestock) */
export const LIVESTOCK_TYPES = [
  { no: 1, geel: "Awr", loda: "Sac", arri: "Lax" },
  { no: 2, geel: "Hal", loda: "Dibi", arri: "Wan" },
  { no: 3, geel: "Qurbac / Nirig", loda: "Weyl", arri: "Caysan" },
  { no: 4, geel: "Qalin", loda: "Qaalin", arri: "Orgi" },
  { no: 5, geel: null, loda: null, arri: "Neyl / Nayl" },
  { no: 6, geel: "Baarqab", loda: null, arri: "Ri" },
  { no: 7, geel: null, loda: null, arri: "Waxar" },
  { no: 8, geel: null, loda: null, arri: "Sabeen" },
  { no: 9, geel: null, loda: null, arri: "Sumal" },
] as const;

/** English display labels for Noocyada cards (first image layout) */
export const LIVESTOCK_TYPE_LABELS_EN = {
  geel: {
    1: "Male Camel",
    2: "Female Camel (She-Camel)",
    3: "Young Camel",
    4: "Young Female Camel",
    6: "Breeding Male Camel",
  },
  loda: {
    1: "Cow (Female)",
    2: "Bull (Male)",
    3: "Calf (Young)",
    4: "Heifer (Young Female)",
  },
  arri: {
    1: "Ewe (Female Sheep)",
    2: "Ram (Male Sheep)",
    3: "Lamb (Young Sheep)",
    4: "Young Sheep",
    5: "Sheep (General)",
    6: "Buck (Male Goat)",
    7: "Doe (Female Goat)",
    8: "Kid (Young Goat)",
    9: "Goat (General)",
  },
} as const;

/** Arriga sheep group = nos 1–5, goats = nos 6–9 */
export const ARRI_SHEEP_NOS = [1, 2, 3, 4, 5] as const;
export const ARRI_GOAT_NOS = [6, 7, 8, 9] as const;

export interface PriceRow {
  label: string;
  labelEn: string;
  geel: string;
  loda: string;
  arri: string;
}

export interface LivestockPriceSection {
  id: string;
  titleSomali: string;
  titleEnglish: string;
  description: string;
  theme: "green" | "yellow" | "cyan" | "red" | "purple";
  rows: PriceRow[];
}

/** Geelka — Birimo reference prices by camel type */
export const GEELKA_BIRIMO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Awr", price: "$1,000 – $1,250" },
  { name: "Hal", price: "$1,100 – $1,550" },
  { name: "Qurbac", price: "$350 – $500" },
  { name: "Qalin", price: "$500 – $650" },
  { name: "Baarqab", price: "$1,600 – $2,700" },
];

/** Geelka — Sugunto reference prices by camel type (secondary / younger stock) */
export const GEELKA_SUGUNTO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Awr", price: "$700 – $900" },
  { name: "Hal", price: "$750 – $1,000" },
  { name: "Qurbac", price: "$250 – $350" },
  { name: "Qalin", price: "$350 – $450" },
  { name: "Baarqab", price: "$1,100 – $1,800" },
];

/** Lo'da — Birimo prices by cattle type (no Lab/Dhedig) */
export const LODA_BIRIMO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Sac", price: "$350 – $450" },
  { name: "Dibi", price: "$450 – $550" },
  { name: "Weyl", price: "$200 – $300" },
  { name: "Qaalin", price: "$150 – $250" },
];

/** Lo'da — Sugunto prices by cattle type */
export const LODA_SUGUNTO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Sac", price: "$250 – $350" },
  { name: "Dibi", price: "$350 – $450" },
  { name: "Weyl", price: "$150 – $220" },
  { name: "Qaalin", price: "$100 – $180" },
];

/** Arriga — Birimo prices by goat/sheep type (no Lab/Dhedig) */
export const ARRI_BIRIMO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Lax", price: "$80 – $120" },
  { name: "Wan", price: "$100 – $150" },
  { name: "Caysan", price: "$90 – $130" },
  { name: "Orgi", price: "$110 – $160" },
  { name: "Neyl", price: "$85 – $125" },
  { name: "Ri", price: "$95 – $140" },
  { name: "Waxar", price: "$70 – $110" },
  { name: "Sabeen", price: "$75 – $115" },
  { name: "Sumal", price: "$80 – $120" },
];

/** Arriga — Sugunto prices by goat/sheep type */
export const ARRI_SUGUNTO_TYPE_PRICES: { name: string; price: string }[] = [
  { name: "Lax", price: "$60 – $90" },
  { name: "Wan", price: "$75 – $110" },
  { name: "Caysan", price: "$70 – $100" },
  { name: "Orgi", price: "$80 – $120" },
  { name: "Neyl", price: "$65 – $95" },
  { name: "Ri", price: "$70 – $105" },
  { name: "Waxar", price: "$55 – $85" },
  { name: "Sabeen", price: "$60 – $90" },
  { name: "Sumal", price: "$65 – $95" },
];

export type LivestockTypePriceRow = { name: string; nameEn?: string; price: string };

/** English labels used whenever the site language is English. */
export const LIVESTOCK_TYPE_EN: Record<string, string> = {
  Awr: "Male Camel",
  Hal: "She-Camel",
  Qurbac: "Young Camel",
  Gurbac: "Young Camel",
  Nirig: "Young Camel",
  "Qurbac / Nirig": "Young Camel",
  "Gurbac / Nirig": "Young Camel",
  Qalin: "Young Female Camel",
  Rati: "Camel",
  Baarqab: "Breeding Male Camel",
  Sac: "Cow",
  Dibi: "Bull",
  Weyl: "Calf",
  Qaalin: "Heifer",
  Lax: "Ewe",
  Wan: "Ram",
  Caysan: "Lamb",
  Caysano: "Lamb",
  Ceysano: "Lamb",
  Ceysan: "Lamb",
  Orgi: "Yearling Sheep",
  Neyl: "Sheep",
  Nayl: "Sheep",
  "Neyl / Nayl": "Sheep",
  Ri: "Buck",
  Riyo: "Buck",
  Waxar: "Doe",
  Wahar: "Doe",
  Wahaar: "Doe",
  "Wahar / Wahaar": "Doe",
  Sabeen: "Kid",
  Sumal: "Goat",
};

function typeNameKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

/** Catalog English labels (and stripped variants) → Somali type. */
const CATALOG_EN_TO_SO: Record<string, string> = {
  "ewe female sheep": "Lax",
  "ram male sheep": "Wan",
  "lamb young sheep": "Caysan",
  "young sheep": "Orgi",
  "yearling sheep": "Orgi",
  "sheep general": "Neyl",
  "buck male goat": "Ri",
  "doe female goat": "Waxar",
  "kid young goat": "Sabeen",
  "goat general": "Sumal",
  "female camel she-camel": "Hal",
  "female camel": "Hal",
  "she camel": "Hal",
  "camel general": "Rati",
  "cow female": "Sac",
  "bull male": "Dibi",
  "calf young": "Weyl",
  "heifer young female": "Qaalin",
};

function typeLookupKeys(raw: string): string[] {
  const keys: string[] = [];
  const push = (value: string) => {
    const key = typeNameKey(value);
    if (key && !keys.includes(key)) keys.push(key);
  };
  push(raw);
  push(raw.replace(/\([^)]*\)/g, " "));
  return keys;
}

const TYPE_EN_BY_KEY = (() => {
  const map = new Map<string, string>();
  for (const [so, en] of Object.entries(LIVESTOCK_TYPE_EN)) {
    map.set(typeNameKey(so), en);
    map.set(typeNameKey(en), en);
  }
  for (const [enKey, so] of Object.entries(CATALOG_EN_TO_SO)) {
    map.set(enKey, LIVESTOCK_TYPE_EN[so] || enKey);
  }
  return map;
})();

const TYPE_SO_BY_KEY = (() => {
  const map = new Map<string, string>();
  for (const [so, en] of Object.entries(LIVESTOCK_TYPE_EN)) {
    const somali = so.includes("/") ? so.split("/")[0].trim() : so;
    map.set(typeNameKey(so), somali);
    map.set(typeNameKey(en), somali);
  }
  for (const [enKey, so] of Object.entries(CATALOG_EN_TO_SO)) {
    map.set(enKey, so);
  }
  const shorts: Record<string, string> = {
    bull: "Dibi",
    cow: "Sac",
    calf: "Weyl",
    heifer: "Qaalin",
    ewe: "Lax",
    ram: "Wan",
    lamb: "Caysan",
    sheep: "Neyl",
    buck: "Ri",
    doe: "Waxar",
    kid: "Sabeen",
    goat: "Sumal",
  };
  for (const [en, so] of Object.entries(shorts)) {
    if (!map.has(en)) map.set(en, so);
    if (!TYPE_EN_BY_KEY.has(en)) TYPE_EN_BY_KEY.set(en, LIVESTOCK_TYPE_EN[so] || en);
  }
  map.set("riyo", "Ri");
  map.set("ri", "Ri");
  map.set("wahar", "Waxar");
  map.set("wahaar", "Waxar");
  map.set("waxar", "Waxar");
  map.set("buck", "Ri");
  map.set("doe", "Waxar");
  map.set("lo'da", "Lo'");
  map.set("loda", "Lo'");
  return map;
})();

/** English or Somali type name for the current site language. */
export function livestockTypeLabel(
  name: string | null | undefined,
  lang: "en" | "so" = "en"
): string {
  const raw = String(name || "").trim();
  if (!raw) return "";
  for (const key of typeLookupKeys(raw)) {
    const so = TYPE_SO_BY_KEY.get(key);
    if (!so) continue;
    if (lang === "so") return so;
    return TYPE_EN_BY_KEY.get(typeNameKey(so)) || TYPE_EN_BY_KEY.get(key) || raw;
  }
  if (lang === "so") return raw.charAt(0).toUpperCase() + raw.slice(1);
  return TYPE_EN_BY_KEY.get(typeNameKey(raw)) || raw;
}

/** Livestock type/category name for the current UI language. */
export function adminLivestockName(
  name?: string | null,
  nameSomali?: string | null,
  lang: "en" | "so" = "so"
): string {
  const somali = String(nameSomali || "").trim();
  const english = String(name || "").trim();
  const raw = lang === "so" ? somali || english : english || somali;
  if (!raw) return "";
  return livestockTypeLabel(raw, lang) || raw;
}

export function categoryTypePrices(
  slug: string,
  season: "birimo" | "sugunto"
): LivestockTypePriceRow[] {
  if (slug === "geel") {
    return season === "birimo"
      ? GEELKA_BIRIMO_TYPE_PRICES
      : GEELKA_SUGUNTO_TYPE_PRICES;
  }
  if (slug === "loda") {
    return season === "birimo"
      ? LODA_BIRIMO_TYPE_PRICES
      : LODA_SUGUNTO_TYPE_PRICES;
  }
  if (slug === "arri") {
    return season === "birimo"
      ? ARRI_BIRIMO_TYPE_PRICES
      : ARRI_SUGUNTO_TYPE_PRICES;
  }
  return [];
}

/** Sections 2–5 — Historical price guides (last 10 years) */
export const LIVESTOCK_PRICE_SECTIONS: LivestockPriceSection[] = [
  {
    id: "barimada-caadiga",
    titleSomali: "Neefka Barimada 10 Sano ee Udanbeeyey — Xiliga Caadiga",
    titleEnglish: "Primary Breeding Stock — Last 10 Years (Normal Season)",
    description: "Reference prices during regular market conditions (Xiliga Caadiga).",
    theme: "yellow",
    rows: [
      {
        label: "Dhedig",
        labelEn: "Female",
        geel: "$1,500",
        loda: "$400",
        arri: "$80 – $150",
      },
      {
        label: "Labka",
        labelEn: "Male",
        geel: "$2,500",
        loda: "$500",
        arri: "$150 – $180",
      },
    ],
  },
  {
    id: "sekontada",
    titleSomali: "Neefka Sekontada 10 Sano ee Udanbeeyey",
    titleEnglish: "Secondary Stock — Last 10 Years",
    description: "Reference prices for secondary (younger) livestock categories.",
    theme: "cyan",
    rows: [
      {
        label: "Dhedig",
        labelEn: "Female",
        geel: "$800 – $900",
        loda: "$350 – $400",
        arri: "$80 – $150",
      },
      {
        label: "Labka",
        labelEn: "Male",
        geel: "$1,200",
        loda: "$400 – $600",
        arri: "$150 – $180",
      },
    ],
  },
  {
    id: "barimada-jilaal",
    titleSomali: "Neefka Barimada 10 Sano ee Udanbeeyey — Xiliga Jilaalka",
    titleEnglish: "Primary Breeding Stock — Last 10 Years (Dry Season)",
    description: "Dry-season reference prices (Xiliga Jilaalka).",
    theme: "red",
    rows: [
      {
        label: "Dhedig",
        labelEn: "Female",
        geel: "$1,200",
        loda: "$250 – $300",
        arri: "$80 – $100",
      },
      {
        label: "Lab",
        labelEn: "Male",
        geel: "$1,500 – $2,000",
        loda: "$300 – $400",
        arri: "$100 – $150",
      },
    ],
  },
  {
    id: "sekontada-alt",
    titleSomali: "Neefka Sekontada 10 Sano ee Udanbeeyey (Variation)",
    titleEnglish: "Secondary Stock — Last 10 Years (Market Variation)",
    description: "Secondary stock price ranges across Mogadishu markets.",
    theme: "purple",
    rows: [
      {
        label: "Dhedig",
        labelEn: "Female",
        geel: "$800 – $900",
        loda: "$250 – $300",
        arri: "$100 – $150",
      },
      {
        label: "Lab",
        labelEn: "Male",
        geel: "$1,000 – $1,200",
        loda: "$300 – $400",
        arri: "$150 – $180",
      },
    ],
  },
];

export const SECTION_THEMES = {
  green: {
    header: "bg-gradient-to-r from-emerald-600 to-green-700",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-950",
    accent: "text-emerald-900",
    card: "from-emerald-50 to-green-50",
  },
  yellow: {
    header: "bg-gradient-to-r from-amber-500 to-orange-600",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-950",
    accent: "text-amber-900",
    card: "from-amber-50 to-orange-50",
  },
  cyan: {
    header: "bg-gradient-to-r from-teal-600 to-cyan-700",
    border: "border-teal-300",
    badge: "bg-teal-100 text-teal-950",
    accent: "text-teal-900",
    card: "from-teal-50 to-cyan-50",
  },
  red: {
    header: "bg-gradient-to-r from-red-500 to-rose-600",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    accent: "text-red-700",
    card: "from-red-50 to-rose-50",
  },
  purple: {
    header: "bg-gradient-to-r from-violet-500 to-purple-600",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-800",
    accent: "text-violet-700",
    card: "from-violet-50 to-purple-50",
  },
} as const;

/** Livestock photos — local copies for fast, reliable display */
export const LIVESTOCK_PHOTO_URLS = {
  geel: "/images/livestock/geel.jpg",
  loda: "/images/livestock/loda-cattle.jpg",
  arri: "/images/livestock/arri.jpg",
  /** Banadir livestock market — livestock hero background / featured visual */
  marketHero: "/images/livestock/livestock-market-hero.png",
} as const;

/** Crop focal point per category (for object-position) */
export const LIVESTOCK_IMAGE_FOCUS: Record<LivestockColumnKey, string> = {
  geel: "50% 40%",
  loda: "50% 50%",
  arri: "50% 45%",
};

/** Real animal photos used across home, livestock gallery, and price tables */
export const LIVESTOCK_ANIMAL_IMAGES = {
  geel: {
    key: "geel",
    somali: "Geelka",
    english: "Camels",
    url: LIVESTOCK_PHOTO_URLS.geel,
    types: ["Awr", "Hal", "Qurbac", "Qalin", "Baarqab"],
  },
  loda: {
    key: "loda",
    somali: "Loda",
    english: "Cattle",
    url: LIVESTOCK_PHOTO_URLS.loda,
    types: ["Sac", "Dibi", "Weyl", "Qaalin"],
  },
  arri: {
    key: "arri",
    somali: "Ari & Ido",
    english: "Sheep & Goats",
    url: LIVESTOCK_PHOTO_URLS.arri,
    types: [
      "Lax",
      "Wan",
      "Caysan",
      "Orgi",
      "Neyl / Nayl",
      "Ri",
      "Waxar",
      "Sabeen",
      "Suman",
    ],
  },
} as const;

export const MARKET_ANIMAL_IMAGES: Record<
  string,
  { url: string; label: string }
> = {
  CAMEL: {
    url: LIVESTOCK_PHOTO_URLS.geel,
    label: "Geelka · Camels",
  },
  CATTLE: {
    url: LIVESTOCK_PHOTO_URLS.loda,
    label: "Loda · Cattle",
  },
  GOAT: {
    url: LIVESTOCK_PHOTO_URLS.arri,
    label: "Ri · Goats",
  },
  SHEEP: {
    url: LIVESTOCK_PHOTO_URLS.arri,
    label: "Idaha · Sheep",
  },
  POULTRY: {
    url: LIVESTOCK_PHOTO_URLS.arri,
    label: "Digaag · Poultry",
  },
};
