import type { LivestockCategorySlug } from "@/lib/livestock-data";
import { LIVESTOCK_PHOTO_URLS, livestockTypeLabel } from "@/lib/livestock-data";
import { canonicalTypeName } from "@/lib/livestock-section-prices";

const YOUNG_TYPES = new Set([
  "Qurbac",
  "Qalin",
  "Weyl",
  "Qaalin",
  "Caysan",
  "Neyl",
]);

const SHEEP_TYPES = new Set(["Lax", "Wan", "Neyl"]);

export function isYoungLivestockType(typeName: string): boolean {
  return YOUNG_TYPES.has(canonicalTypeName(typeName));
}

export function livestockTypePhotoKey(typeName: string) {
  const key = canonicalTypeName(typeName).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (key === "gurbac") return "qurbac";
  return key;
}

function typePhotoSlug(typeName: string) {
  return livestockTypePhotoKey(typeName);
}

export function livestockTypePhoto(
  slug: string,
  typeName: string,
  season: "birimo" | "sugunto"
): string {
  const key = typePhotoSlug(typeName);
  const version = "arri-hero-safe-1";
  if (key) return `/images/livestock/types/${season}/${key}.jpg?v=${version}`;
  if (slug === "geel") return LIVESTOCK_PHOTO_URLS.geel;
  if (slug === "loda") return LIVESTOCK_PHOTO_URLS.loda;
  if (slug === "arri") {
    const name = canonicalTypeName(typeName);
    if (SHEEP_TYPES.has(name)) return "/images/livestock/sheep.jpg";
    return "/images/livestock/goats.jpg";
  }
  return LIVESTOCK_PHOTO_URLS.marketHero;
}

export function usesGeneratedTypePhoto(slug: string) {
  return slug === "arri" || slug === "loda" || slug === "geel";
}

export function livestockTypeVisual(
  slug: string,
  typeName: string,
  season: "birimo" | "sugunto",
  photoUrl?: string | null
) {
  const name = canonicalTypeName(typeName) || typeName;
  const young = isYoungLivestockType(name);
  const catalogOnly = usesGeneratedTypePhoto(slug);
  const catalog = livestockTypePhoto(slug, name, season);
  const uploadedUrl = photoUrl?.trim() || "";
  const uploaded = catalogOnly ? false : Boolean(uploadedUrl);
  return {
    name,
    nameEn: livestockTypeLabel(name, "en") || name,
    src: catalogOnly ? catalog : uploadedUrl || catalog,
    focus: "50% 50%",
    young,
    uploaded,
    sizeSo: young ? "Yar" : "Weyn",
    sizeEn: young ? "Young" : "Adult",
  };
}

export function pickTypePhotoUrl(
  photos: Record<string, string> | null | undefined,
  typeName: string
): string | null {
  if (!photos) return null;
  const canon = canonicalTypeName(typeName);
  for (const key of [canon, typeName, typeName.trim()]) {
    const url = key ? photos[key]?.trim() : "";
    if (url) return url;
  }
  const needle = (canon || typeName).trim().toLowerCase();
  if (!needle) return null;
  for (const [name, url] of Object.entries(photos)) {
    if (!url?.trim()) continue;
    if (canonicalTypeName(name).toLowerCase() === needle) return url.trim();
  }
  return null;
}

export function livestockTypeHref(
  slug: string,
  season: "birimo" | "sugunto",
  typeName: string
) {
  return `/livestock/${slug}/${season}/${encodeURIComponent(canonicalTypeName(typeName) || typeName)}`;
}
