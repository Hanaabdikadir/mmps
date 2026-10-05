/** Stable display order across Super Admin (Livestock first). Client-safe. */
export const SUPER_ADMIN_COMPANY_ORDER = [
  "livestock-market",
  "bawadco",
  "wabax",
  "banadir-water",
  "beco",
  "mogadishu-power-supply",
  "blue-sky-energy",
] as const;

export function companySystemOrderIndex(idOrSlug: string): number {
  const key = idOrSlug.replace(/-pending$/, "");
  const idx = (SUPER_ADMIN_COMPANY_ORDER as readonly string[]).indexOf(key);
  return idx < 0 ? 999 : idx;
}

export function compareByCompanySystemOrder(aId: string, bId: string): number {
  return companySystemOrderIndex(aId) - companySystemOrderIndex(bId);
}
