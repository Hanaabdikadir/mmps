/** Fixed livestock markets shown on broker registration — order preserved. */
export const REGISTRATION_LIVESTOCK_MARKETS = [
  {
    name: "Deniile livestock market",
    aliases: ["Dayniile Livestock Market", "Deniile Livestock Market"],
    location: "Dayniile, Mogadishu",
  },
  {
    name: "Sinka dheer Livestock Market",
    aliases: ["Siinka dheer Livestock Market", "Siinka Dheer Livestock Market"],
    location: "Sinka Dheer, Mogadishu",
  },
  {
    name: "Dayax Livestock Market",
    aliases: ["dayax Livestock Market", "Suuqa dayax Livestock Market"],
    location: "Dayax, Mogadishu",
  },
  {
    name: "Suuqa xoolaha Livestock Market",
    aliases: [],
    location: "Suuqa Xoolaha, Mogadishu",
  },
  {
    name: "Medina Livestock Market",
    aliases: ["madiino Livestock Market", "Madiino Livestock Market"],
    location: "Medina, Mogadishu",
  },
] as const;

export type RegistrationLivestockMarketName =
  (typeof REGISTRATION_LIVESTOCK_MARKETS)[number]["name"];

const REGISTRATION_MARKET_NAME_SET = new Set<string>(
  REGISTRATION_LIVESTOCK_MARKETS.flatMap((m) => [m.name, ...m.aliases])
);

export function isRegistrationLivestockMarketName(
  value: string | null | undefined
): value is RegistrationLivestockMarketName {
  return Boolean(value && REGISTRATION_MARKET_NAME_SET.has(value));
}

export type PublicLivestockMarket = {
  id: number;
  name: string;
  location: string | null;
};

const SHORT_MARKET_LABELS: { keys: string[]; en: string; so: string }[] = [
  { keys: ["dayax"], en: "Dayax Market", so: "Suuqa Dayax" },
  {
    keys: ["sinka dheer", "siinka dheer", "sinkadheer", "siinkadheer", "sinka", "siinka"],
    en: "Sinka dheer Market",
    so: "Suuqa Sinka Dheer",
  },
  { keys: ["deniile", "dayniile"], en: "Dayniile Market", so: "Suuqa Dayniile" },
  { keys: ["xoolaha"], en: "Suuqa Xoolaha Market", so: "Suuqa Xoolaha" },
  { keys: ["medina", "madiino"], en: "Madiino Market", so: "Suuqa Madiino" },
];

function marketMatchText(raw?: string | null): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/^suuqa\s+/i, "")
    .replace(/\s+livestock\s+market$/i, "")
    .replace(/\s+market$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Short chip label for the five registration markets, e.g. Dayax / Sinka dheer. */
export function shortRegistrationMarketLabel(
  raw?: string | null,
  lang: "en" | "so" = "en"
): string | null {
  const n = marketMatchText(raw);
  if (!n) return null;
  for (const row of SHORT_MARKET_LABELS) {
    if (row.keys.some((key) => n.includes(key))) {
      return lang === "so" ? row.so : row.en;
    }
  }
  return null;
}

/** Public listing name: EN short, SO “Suuqa …” spelling. */
export function livestockMarketDisplayName(
  raw?: string | null,
  lang: "en" | "so" = "en"
): string {
  const short = shortRegistrationMarketLabel(raw, lang);
  if (short) return short;
  const professional = professionalLivestockMarketLabel(raw);
  if (!professional) return "";
  if (lang === "so" && !/^suuqa\s/i.test(professional)) {
    return `Suuqa ${professional}`;
  }
  if (lang === "en" && !/\bmarket\b/i.test(professional)) {
    return `${professional} Market`;
  }
  return professional;
}

/** Professional market name for lists: Sinka dheer, Suuqa xoolaha, Dayax. */
export function professionalLivestockMarketLabel(
  raw?: string | null
): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const short = shortRegistrationMarketLabel(trimmed);
  if (short) return short;
  const cleaned = trimmed.replace(/\s+livestock\s+market$/i, "").trim();
  const lower = cleaned.toLowerCase().replace(/\s+/g, " ");
  if (
    !cleaned ||
    lower === "livestock market" ||
    lower === "banadir livestock market" ||
    lower === "mogadishu livestock market"
  ) {
    return null;
  }
  return cleaned;
}

/** Format one or many market names for track / approvals (keeps selection order). */
export function formatRegistrationMarketsLabel(
  raw?: string | null,
  lang: "en" | "so" = "en"
): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const parts = trimmed
    .split(/\s*[,·|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return (
      shortRegistrationMarketLabel(trimmed, lang) ||
      professionalLivestockMarketLabel(trimmed)
    );
  }
  const labels = parts
    .map(
      (p) =>
        shortRegistrationMarketLabel(p, lang) ||
        professionalLivestockMarketLabel(p) ||
        p
    )
    .filter(Boolean);
  const unique = [...new Set(labels)];
  return unique.length ? unique.join(" · ") : null;
}

function namesFor(entry: (typeof REGISTRATION_LIVESTOCK_MARKETS)[number]) {
  return [entry.name, ...entry.aliases];
}

/** Ensure the five registration markets exist and return them in list order. */
export async function getRegistrationLivestockMarkets(): Promise<
  PublicLivestockMarket[]
> {
  const { prisma } = await import("@/lib/prisma");
  const out: PublicLivestockMarket[] = [];

  for (const entry of REGISTRATION_LIVESTOCK_MARKETS) {
    const existing = await prisma.market.findFirst({
      where: {
        deletedAt: null,
        marketType: "LIVESTOCK",
        name: { in: [...namesFor(entry)] },
      },
      select: { id: true, name: true, location: true, status: true },
    });

    if (existing) {
      if (existing.name !== entry.name || existing.location !== entry.location) {
        const updated = await prisma.market.update({
          where: { id: existing.id },
          data: { name: entry.name, location: entry.location },
          select: { id: true, name: true, location: true, status: true },
        });
        if (updated.status === "ACTIVE") {
          out.push({
            id: updated.id,
            name: updated.name,
            location: updated.location,
          });
        }
      } else if (existing.status === "ACTIVE") {
        out.push({
          id: existing.id,
          name: existing.name,
          location: existing.location,
        });
      }
      continue;
    }

    const created = await prisma.market.create({
      data: {
        name: entry.name,
        location: entry.location,
        marketType: "LIVESTOCK",
        status: "ACTIVE",
      },
      select: { id: true, name: true, location: true },
    });
    out.push(created);
  }

  return out;
}

/** All ACTIVE livestock markets: the five core ones first, then Super Admin extras. */
export async function getPublicLivestockMarkets(): Promise<PublicLivestockMarket[]> {
  const core = await getRegistrationLivestockMarkets();
  const { prisma } = await import("@/lib/prisma");
  const extra = await prisma.market.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      marketType: "LIVESTOCK",
      id: { notIn: core.map((m) => m.id) },
    },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });
  return [...core, ...extra];
}

export async function findRegistrationLivestockMarket(
  marketId: number
): Promise<PublicLivestockMarket | null> {
  const { prisma } = await import("@/lib/prisma");
  const market = await prisma.market.findFirst({
    where: {
      id: marketId,
      deletedAt: null,
      status: "ACTIVE",
      marketType: "LIVESTOCK",
    },
    select: { id: true, name: true, location: true },
  });
  return market;
}
