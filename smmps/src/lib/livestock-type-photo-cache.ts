const PREFIX = "mmps-type-photos-v3:";

export function typePhotoCacheKey(slug: string, season: string) {
  return `${PREFIX}${slug}:${season}`;
}

export function readTypePhotoCache(
  slug: string,
  season: string
): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(typePhotoCacheKey(slug, season));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTypePhotoCache(
  slug: string,
  season: string,
  photos: Record<string, string>
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(typePhotoCacheKey(slug, season), JSON.stringify(photos));
  } catch {
    // quota / private mode
  }
}
