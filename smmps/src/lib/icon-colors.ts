/**
 * MMPS icon color tokens — navy brand, amber accent, sector hues.
 * Use these for Lucide icons so color stays consistent app-wide.
 */

export type SectorId = "livestock" | "water" | "electricity";

/** Brand primaries (buttons, links, hero accents) */
export const BRAND_NAVY = "#0f2744";
export const BRAND_BLUE = "#1e40af";
export const BRAND_BLUE_MID = "#2563eb";
export const BRAND_AMBER = "#f59e0b";
export const BRAND_AMBER_DARK = "#d97706";

/** Form / auth field icons */
export const AUTH_FIELD_ICON = "text-blue-600";
export const AUTH_FIELD_ICON_FOCUS = "text-blue-700";
export const AUTH_FIELD_ICON_MUTED = "text-blue-400";
export const AUTH_TOGGLE_ICON = "text-blue-500 hover:text-blue-700";

/** Icons on navy hero panels */
export const AUTH_HERO_FEATURE_ICON = "text-amber-200";
export const AUTH_HERO_STATUS_ICON = "text-amber-200";

/** Header + footer navigation icon colors */
export const NAV_ICON_COLOR: Record<string, string> = {
  "/": "text-amber-300",
  "/livestock": "text-green-400",
  "/water": "text-blue-400",
  "/electricity": "text-amber-400",
};

export const FOOTER_LINK_ICON = {
  home: "text-amber-300",
  register: "text-amber-400",
  login: "text-sky-300",
} as const;

/** Sector icon styling (cards, lists, dark backgrounds) */
export const SECTOR_ICON = {
  livestock: {
    color: "text-green-600",
    onDark: "text-green-300",
    nav: "text-green-400",
    bg: "bg-green-100 ring-1 ring-green-200/80",
    hex: "#22c55e",
  },
  water: {
    color: "text-teal-600",
    onDark: "text-teal-300",
    nav: "text-teal-400",
    bg: "bg-teal-100 ring-1 ring-teal-200/80",
    hex: "#0d9488",
  },
  electricity: {
    color: "text-amber-600",
    onDark: "text-amber-300",
    nav: "text-amber-400",
    bg: "bg-amber-100 ring-1 ring-amber-200/80",
    hex: "#f59e0b",
  },
} as const satisfies Record<
  SectorId,
  {
    color: string;
    onDark: string;
    nav: string;
    bg: string;
    hex: string;
  }
>;

/** Registration document slot icons */
export const DOCUMENT_ICON_COLOR: Record<string, string> = {
  business_license: "text-blue-600",
  tax_certificate: "text-sky-600",
  sector_license: "text-amber-600",
  official_letter: "text-violet-600",
  id_passport: "text-indigo-600",
  personal_photo: "text-rose-600",
};

/** Login form field icons */
export const LOGIN_FIELD_ICON = {
  email: "text-sky-500",
  password: "text-amber-500",
  user: "text-blue-600",
} as const;

export function navIconColor(href: string): string {
  return NAV_ICON_COLOR[href] ?? "text-white/80";
}
