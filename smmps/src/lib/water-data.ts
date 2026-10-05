import type { LucideIcon } from "lucide-react";
import { Building2, Droplets, Truck } from "lucide-react";

export interface WaterServiceMeta {
  key: string;
  label: string;
  somali: string;
  description: string;
  gradient: string;
  border: string;
  icon: LucideIcon;
  accentText: string;
  accentBg: string;
}

/** Professionals / service-provider rates only */
export const WATER_SERVICES = [
  {
    key: "SERVICE_PROVIDER",
    label: "Professionals",
    somali: "Xirfadlayaasha",
    description: "Registered water service providers in Banadir",
    gradient: "from-teal-600 to-emerald-500",
    border: "border-t-teal-500",
    icon: Building2,
    accentText: "text-teal-900",
    accentBg: "bg-teal-50 border-teal-200",
  },
] as const satisfies readonly WaterServiceMeta[];

export type WaterServiceKey = (typeof WATER_SERVICES)[number]["key"];

/** Standard 5-year water rates (USD per m³) — BAWADCO */
export const BAWADCO_YEARLY_RATE_HISTORY: Partial<Record<number, number>> = {
  2022: 1.4,
  2023: 1.4,
  2024: 1.5,
  2025: 0.41,
  2026: 1.6,
};

/** Standard 5-year water rates (USD per m³) — WABAX */
export const WABAX_YEARLY_RATE_HISTORY: Partial<Record<number, number>> = {
  2022: 1.4,
  2023: 1.4,
  2024: 1.5,
  2025: 0.41,
  2026: 1.6,
};

/** Standard 5-year water rates (USD per m³) — Towfiiq */
export const TOWFIIQ_YEARLY_RATE_HISTORY: Partial<Record<number, number>> = {
  2022: 1.4,
  2023: 1.4,
  2024: 1.5,
  2025: 0.41,
  2026: 1.6,
};

export interface WaterProviderMeta {
  id: string;
  slug: string;
  href: string;
  name: string;
  somali: string;
  tagline: string;
  taglineSo?: string;
  description: string;
  descriptionSo?: string;
  category?: string;
  acronym?: string;
  phone?: string;
  /** Secondary line under phone (e.g. publicly listed contact) */
  phoneHint?: string;
  /** Alternative / secondary phone number */
  altPhone?: string;
  /** Business hours note shown on contact card */
  businessHours?: string;
  email?: string;
  address: string;
  addressSo?: string;
  /** Contact card label for address row (e.g. HQ) */
  addressLabel?: string;
  /** District / area location line */
  location?: string;
  locationSo?: string;
  website?: string;
  /** Shown when no website URL is available */
  websiteNote?: string;
  facebook?: string;
  waterSource?: string;
  ratesNote?: string;
  /** Call-center / hotline number */
  callCenter?: string;
  telephone?: string;
  calculatorTitle?: string;
  calculatorSubtitle?: string;
  calculatorEmptyHint?: string;
  /** Hero eyebrow above the main title (e.g. Bixiyaha Biyaha) */
  heroEyebrow?: string;
  /** Full legal name row on contact card */
  companyName?: string;
  serviceAreas?: string;
  currentPrice?: string;
  priceUpdated?: string;
  gradient: string;
  headerBg: string;
  bodyBg: string;
  /** Soft tint fading from logo into card text area */
  cardBodyTint: string;
  accent: string;
  accentBg: string;
  accentText: string;
  /** Thin connected border around the card */
  cardBorder: string;
  /** Horizontal line between logo and text (2px, matches card border) */
  cardDivider: string;
  border: string;
  icon: LucideIcon;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** Header background behind logo banner */
  imageBg?: string;
  /** object-position for card banner (e.g. "50% 40%") */
  imageFocus?: string;
  /** Crop wide banners to the centered logo only */
  cardImageCrop?: "logo" | "banner";
  /** Small uppercase label above the title (English) */
  cardLabel: string;
  /** Short bold title on the card (one line) */
  cardTitle: string;
  /** Pill badge text at bottom of card */
  pillLabel: string;
  /** View button text color (for light gradients) */
  viewBtnText?: string;
  /** Optional about / mission card on provider page */
  infoTitle?: string;
  infoBrief?: string;
  infoPoints?: string[];
  imageBlendMultiply?: boolean;
  heroLogoClassName?: string;
  /** Optional admin-editable 5-year rate history (USD/m³) */
  yearlyRateHistory?: Partial<Record<number, number>>;
}

export const MOGADISHU_WATER_PROVIDERS: WaterProviderMeta[] = [
  {
    id: "bawadco",
    slug: "bawadco",
    href: "/water/bawadco",
    name: "Banadir Water Development Company",
    somali: "Shirkadda Horumarinta Biyaha ee Banadir",
    tagline: "Banadir Water Development Company",
    taglineSo: "Shirkadda Horumarinta Biyaha ee Banaadir",
    category: "Water utility company",
    acronym: "BAWADCO",
    phone: "+252 613 491 008",
    email: "info@banadirwater.so",
    description:
      "Locally owned water utility supplying clean underground water to residential, commercial, and industrial customers throughout Banadir Region.",
    descriptionSo:
      "Shirkad biyaha oo maxalli ah oo bixisa biyo nadiif ah oo ka yimaada ceelasha dhulka macaamiisha guryaha, ganacsiga, iyo warshadaha ee gobolka Banaadir.",
    address: "Howlwadaag District, Banadir Region, Mogadishu, Somalia",
    addressSo: "Degmada Howlwadaag, Gobolka Banaadir, Muqdisho, Soomaaliya",
    addressLabel: "HQ",
    website: "https://banadirwater.so/",
    waterSource: "Underground Borehole Water",
    gradient: "from-[#22c55e] to-[#16a34a]",
    headerBg: "from-[#22c55e] to-[#16a34a]",
    bodyBg: "bg-white",
    cardBodyTint: "from-green-50/90 via-white to-white",
    accent: "text-green-800",
    accentBg: "bg-green-50 border-green-200",
    accentText: "text-green-900",
    cardBorder: "border-green-500",
    cardDivider: "bg-green-500",
    border: "border-t-green-500",
    icon: Truck,
    image: "/images/water/bawadco-card.png",
    imageWidth: 1024,
    imageHeight: 1024,
    imageBg: "bg-white",
    heroLogoClassName: "h-16 w-[7.5rem] rounded-xl p-0 ring-0",
    /** Full brand mark — same scale as WABAX / Towfiiq */
    cardImageCrop: "banner",
    imageFocus: "50% 50%",
    cardLabel: "BANADIR WATER DEVELOPMENT CO.",
    cardTitle: "BAWADCO",
    pillLabel: "Underground Borehole Water",
    infoTitle: "About BAWADCO",
    infoBrief:
      "Banadir Water Development Company (BAWADCO) is a locally owned water utility established in 2013. The company supplies clean underground water to residential, commercial, and industrial customers throughout Banadir Region. Its services include water production, piped distribution, and customer connection services.",
    infoPoints: [
      "Company: Banadir Water Development Company (BAWADCO)",
      "HQ: Howlwadaag District, Banadir Region, Mogadishu",
      "Supply Type: Underground Borehole Water",
      "Coverage: All Districts of Banadir Region",
      "Support: +252 613 491 008",
      "Email: info@banadirwater.so",
    ],
    yearlyRateHistory: BAWADCO_YEARLY_RATE_HISTORY,
  },
  {
    id: "wabax",
    slug: "wabax",
    href: "/water/wabax",
    name: "WABAX Water Supply Co.",
    somali: "WABAX",
    tagline: "Water Supply & Distribution · Mogadishu",
    taglineSo: "Bixinta & Qaybinta Biyaha · Muqdisho",
    category: "Water utility company",
    acronym: "WABAX",
    phone: "+252 61 999 0049",
    email: "info@wabax.so",
    waterSource: "Underground Borehole Water",
    location: "372F+Q92, Afgoye–Mogadishu Road, Mogadishu, Somalia",
    locationSo: "372F+Q92, Waddada Afgooye–Muqdisho, Muqdisho, Soomaaliya",
    description:
      "Private water utility based in Mogadishu supplying clean underground borehole water to residential and commercial customers through a local distribution network.",
    descriptionSo:
      "Shirkad biyaha oo gaar ah oo ku salaysan Muqdisho oo macaamiisha guryaha iyo ganacsiga u keenaysa biyo nadiif ah oo ka yimaada ceelasha dhulka iyadoo adeegsanaysa shabakad qaybinta maxalliga ah.",
    address: "Afgoye–Mogadishu Road, Mogadishu, Somalia",
    addressSo: "Waddada Afgooye–Muqdisho, Muqdisho, Soomaaliya",
    addressLabel: "HQ",
    gradient: "from-teal-600 to-cyan-500",
    headerBg: "from-teal-600 to-cyan-500",
    bodyBg: "bg-white",
    cardBodyTint: "from-teal-50/90 via-white to-white",
    accent: "text-teal-800",
    accentBg: "bg-teal-50 border-teal-200",
    accentText: "text-teal-800",
    cardBorder: "border-teal-500",
    cardDivider: "bg-teal-500",
    border: "border-t-teal-500",
    icon: Droplets,
    image: "/images/water/wabax-logo-card.png",
    imageWidth: 1024,
    imageHeight: 1024,
    imageBg: "bg-white",
    heroLogoClassName: "h-16 w-[7.5rem] rounded-xl p-0 ring-0",
    cardImageCrop: "banner",
    imageFocus: "50% 50%",
    cardLabel: "WABAX WATER SUPPLY CO.",
    cardTitle: "WABAX",
    pillLabel: "Underground Borehole Water",
    infoTitle: "About WABAX",
    infoBrief:
      "WABAX Water Supply Company is a private water utility company based in Mogadishu. It supplies clean underground borehole water to residential and commercial customers through its local water distribution network, with a focus on providing reliable and affordable water services.",
    infoPoints: [
      "Company: WABAX Water Supply Company",
      "HQ: Afgoye–Mogadishu Road, Mogadishu",
      "Supply Type: Underground Borehole Water",
      "Coverage: Residential & Commercial Areas",
      "Phone: +252 61 999 0049",
      "Address: 372F+Q92, Afgoye–Mogadishu Road, Mogadishu",
    ],
    yearlyRateHistory: WABAX_YEARLY_RATE_HISTORY,
  },
  {
    id: "banadir-water",
    slug: "banadir-water",
    href: "/water/banadir-water",
    name: "Towfiiq",
    somali: "Shirkadda Biyaha Towfiiq",
    tagline: "Towfiiq Water Development Company",
    taglineSo: "Shirkadda Horumarinta Biyaha ee Towfiiq",
    category: "Water utility company",
    acronym: "TOWFIIQ",
    phone: "+252 610 795 571",
    altPhone: "+252 61 925 6728",
    email: "info@towfiiq.so",
    businessHours: "Open 24 Hours",
    facebook: "https://www.facebook.com/Towfiiq",
    waterSource: "Underground Borehole Water",
    description:
      "Private water utility supplying clean underground borehole water to households and businesses across several Mogadishu districts.",
    descriptionSo:
      "Shirkad biyaha oo gaar ah oo bixisa biyo nadiif ah oo ka yimaada ceelasha dhulka guryaha iyo ganacsiyada degmooyin badan oo Muqdisho ah.",
    address: "Sinai Street, Mogadishu, Somalia",
    addressSo: "Waddada Siinaay, Muqdisho, Soomaaliya",
    addressLabel: "HQ",
    gradient: "from-[#f59e0b] to-[#ea580c]",
    headerBg: "from-[#f59e0b] to-[#ea580c]",
    bodyBg: "bg-white",
    cardBodyTint: "from-orange-50/90 via-white to-white",
    accent: "text-orange-800",
    accentBg: "bg-orange-50 border-orange-200",
    accentText: "text-orange-900",
    cardBorder: "border-orange-500",
    cardDivider: "bg-orange-500",
    border: "border-t-orange-500",
    icon: Building2,
    image: "/images/water/towfiiq-water-logo.png",
    imageWidth: 1024,
    imageHeight: 1024,
    imageBg: "bg-white",
    heroLogoClassName: "h-16 w-[7.5rem] rounded-xl p-0 ring-0",
    cardImageCrop: "banner",
    imageFocus: "50% 50%",
    cardLabel: "TOWFIIQ WATER DEVELOPMENT CO.",
    cardTitle: "Towfiiq",
    pillLabel: "Underground Borehole Water",
    viewBtnText: "text-amber-950",
    infoTitle: "About Towfiiq",
    infoBrief:
      "Towfiiq is a private water utility company that supplies clean drinking water from underground boreholes to households and businesses in Mogadishu. The company operates a local water distribution network and serves several districts in northern and central Mogadishu, focusing on reliable and safe water services.",
    infoPoints: [
      "Company: Towfiiq",
      "HQ: Sinai Street, Mogadishu",
      "Supply Type: Underground Borehole Water",
      "Coverage: Kaaraan, Yaaqshiid, Shibis, Boondheere, Abdiaziz, Shangaani & Hiliwaa",
      "Phone: +252 610 795 571",
      "Alternative Phone: +252 61 925 6728",
      "Status: Open 24 Hours",
    ],
    yearlyRateHistory: TOWFIIQ_YEARLY_RATE_HISTORY,
  },
];

export const WATER_PROVIDER_SLUGS = MOGADISHU_WATER_PROVIDERS.map((p) => p.slug);

export const WATER_PROVIDER_MAP = Object.fromEntries(
  MOGADISHU_WATER_PROVIDERS.map((p) => [p.name, p])
) as Record<string, WaterProviderMeta>;

export const WATER_PROVIDER_BY_SLUG = Object.fromEntries(
  MOGADISHU_WATER_PROVIDERS.map((p) => [p.slug, p])
) as Record<string, WaterProviderMeta>;

/** Card headers on provider pages — system green (matches hero-pattern) */
export const WATER_PAGE_CARD_THEME = {
  headerBg: "bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500",
  cardBodyTint: "from-emerald-50/90 via-white to-white",
  accent: "text-emerald-700",
  accentBg: "bg-emerald-50 border-emerald-200",
  accentText: "text-emerald-900",
  chartColor: "#10b981",
} as const;

/** Distinct header + border for each provider detail card (2×2 grid). */
export const WATER_PROVIDER_CARD_THEMES = {
  contact: {
    headerBg: "bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400",
    border: "border-rose-200/80",
  },
  info: {
    headerBg: "bg-gradient-to-br from-emerald-700 via-teal-600 to-amber-400",
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
    headerBg: "bg-gradient-to-br from-emerald-700 via-green-600 to-amber-400",
    border: "border-emerald-200/80",
  },
} as const;

export function isWaterProviderSlug(
  slug: string
): slug is (typeof WATER_PROVIDER_SLUGS)[number] {
  return WATER_PROVIDER_SLUGS.includes(slug as (typeof WATER_PROVIDER_SLUGS)[number]);
}

export function getProviderBySlug(slug: string): WaterProviderMeta | undefined {
  return WATER_PROVIDER_BY_SLUG[slug];
}
