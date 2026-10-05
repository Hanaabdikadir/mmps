import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";

/**
 * Client-safe company scope helpers (static providers only).
 * For registered/disk-backed companies use `@/lib/company-scope-server`.
 */

/** Resolve a provider display name to its canonical slug (static catalogs). */
export function resolveProviderSlug(
  providerName: string,
  sector: "water" | "electricity"
): string | null {
  const needle = providerName.trim().toLowerCase();
  if (!needle) return null;

  const staticList =
    sector === "water"
      ? MOGADISHU_WATER_PROVIDERS
      : MOGADISHU_ELECTRICITY_PROVIDERS;

  const exact = staticList.find(
    (p) =>
      p.name.toLowerCase() === needle ||
      p.slug.toLowerCase() === needle ||
      (p.acronym && p.acronym.toLowerCase() === needle)
  );
  if (exact) return exact.slug;

  const partial = staticList.find(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      needle.includes(p.slug.toLowerCase()) ||
      (p.acronym && needle.includes(p.acronym.toLowerCase()))
  );
  return partial?.slug ?? null;
}

export function companySectorForSlug(
  slug: string
): "water" | "electricity" | "livestock" | null {
  if (slug === "livestock-market") return "livestock";
  if (MOGADISHU_WATER_PROVIDERS.some((p) => p.slug === slug)) return "water";
  if (MOGADISHU_ELECTRICITY_PROVIDERS.some((p) => p.slug === slug))
    return "electricity";
  return null;
}

export function providerMetaForSlug(slug: string) {
  return (
    MOGADISHU_WATER_PROVIDERS.find((p) => p.slug === slug) ??
    MOGADISHU_ELECTRICITY_PROVIDERS.find((p) => p.slug === slug) ??
    null
  );
}

export function publicHrefForCompanySlug(slug: string): string {
  const sector = companySectorForSlug(slug);
  if (sector === "water") return `/water/${slug}`;
  if (sector === "electricity") return `/electricity/${slug}`;
  if (sector === "livestock") return "/livestock";
  return "/";
}
