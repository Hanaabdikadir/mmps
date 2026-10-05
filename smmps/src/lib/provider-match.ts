/**
 * Shared provider matching for company-scoped prices / reports.
 * Safe for client + server (no server-only imports).
 */

export function compactProviderKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function buildProviderNeedles(input: {
  slug?: string | null;
  name?: string | null;
  acronym?: string | null;
  cardTitle?: string | null;
  cardLabel?: string | null;
  tagline?: string | null;
  providerLabel?: string | null;
}): string[] {
  const needles = [
    input.name,
    input.acronym,
    input.cardTitle,
    input.cardLabel,
    input.tagline,
    input.providerLabel,
    input.slug,
  ]
    .map((n) => (n == null ? "" : String(n).toLowerCase().trim()))
    .filter(Boolean);
  return [...new Set(needles)];
}

/**
 * Match a stored providerName to a company's needles.
 * - Full names: exact / compact / mutual contains (long strings only)
 * - Acronyms (WABAX, BECO, BAWADCO): word or leading-brand match
 * - Hyphenated slugs (banadir-water): exact compact only — never substring
 *   of another company (avoids matching Banadir Water / BAWADCO)
 */
export function matchesProvider(
  providerName: string,
  needles: string[]
): boolean {
  if (!needles.length) return false;
  const n = providerName.toLowerCase().trim();
  if (!n) return false;
  const nCompact = compactProviderKey(n);

  return needles.some((raw) => {
    const x = raw.toLowerCase().trim();
    if (!x) return false;
    if (n === x) return true;

    const xCompact = compactProviderKey(x);
    if (xCompact && nCompact === xCompact) return true;

    const isHyphenSlug = x.includes("-");
    const isSingleToken = !x.includes(" ") && !isHyphenSlug;

    // Acronym / brand code: "wabax" matches "WABAX Water Supply Co."
    if (isSingleToken && xCompact.length >= 3 && xCompact.length <= 12) {
      if (nCompact === xCompact) return true;
      if (n === x || n.startsWith(`${x} `) || n.startsWith(`${x}-`)) {
        return true;
      }
      try {
        const re = new RegExp(
          `(^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
          "i"
        );
        return re.test(n);
      } catch {
        return false;
      }
    }

    // Hyphenated slug: only exact (provider is the slug itself)
    if (isHyphenSlug) {
      return nCompact === xCompact || n === x.replace(/-/g, " ");
    }

    // Full display names
    if (x.length >= 10 && (n.includes(x) || x.includes(n))) return true;
    return false;
  });
}
