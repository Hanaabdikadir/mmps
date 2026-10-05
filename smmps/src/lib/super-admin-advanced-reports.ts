import { prisma } from "@/lib/prisma";
import { SYSTEM_NAME, SYSTEM_SHORT } from "@/lib/home-content";
import {
  listPublicElectricityProviders,
  listPublicWaterProviders,
} from "@/lib/company-scope-server";
import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";
import { mergeYearlyRateMaps } from "@/lib/water-analytics";
import {
  isValidReportDate,
  reportMonthLastDay,
  REPORT_YEAR_MAX,
  REPORT_YEAR_MIN,
  type AdvancedReportFilters,
  type AdvancedReportResult,
  type AdvancedReportRow,
  type AdvancedReportType,
  type PriceCompareOp,
  type RateSort,
  type RegisteredKind,
} from "@/lib/super-admin-advanced-reports-shared";
import {
  mogadishuDayEnd,
  mogadishuDayStart,
  mogadishuYmd,
  yearsOverlappingMogadishu,
} from "@/lib/mogadishu-time";
import { adminLivestockName } from "@/lib/livestock-data";
import {
  canonicalTypeName,
  displaySeasonLabel,
  seasonFromCategoryLabel,
} from "@/lib/livestock-section-prices";
import { REGISTRATION_LIVESTOCK_MARKETS, livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { categorySlugFromLivestockSection } from "@/lib/livestock-assignments";
import {
  ALL_LIVESTOCK_TYPES,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";
import { ageClassKey, ageClassLabel, originPlaceLabel, sameAgeClass } from "@/lib/livestock-listing-meta";
import { formatRoleLabel } from "@/lib/role-labels";
import {
  backfillMissingCompanyMarkets,
  findDefaultMarketForCompanyType,
} from "@/lib/company-default-market";
import { MARKET_LOCATION } from "@/lib/constants";
import { TARIFF_YEAR_END } from "@/lib/tariff-years";
import { refreshSubscriptionStatuses } from "@/lib/subscriptions";

export type {
  AdvancedReportFilters,
  AdvancedReportResult,
  AdvancedReportType,
  PriceCompareOp,
  RateSort,
  RegisteredKind,
  UtilityKind,
} from "@/lib/super-admin-advanced-reports-shared";

export { ADVANCED_REPORT_OPTIONS } from "@/lib/super-admin-advanced-reports-shared";

function livestockLabel(
  name?: string | null,
  nameSomali?: string | null,
  fallback = "—"
) {
  return adminLivestockName(name, nameSomali) || fallback;
}

function livestockGroupLabel(
  slug?: string | null,
  name?: string | null,
  nameSomali?: string | null
) {
  const hay = `${slug || ""} ${name || ""} ${nameSomali || ""}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return "Geelka";
  if (
    hay.includes("loda") ||
    hay.includes("cattle") ||
    hay.includes("lo'da") ||
    hay.includes("lo'")
  ) {
    return "Lo'";
  }
  if (
    hay.includes("arri") ||
    hay.includes("ari") ||
    hay.includes("goat") ||
    hay.includes("sheep")
  ) {
    return "Arriga";
  }
  return livestockLabel(name, nameSomali);
}

/** Livestock groups a broker actually manages — 2 if they manage 2, 3 if they manage 3. */
function managedLivestockList(broker: {
  livestockFocus?: string | null;
  authorizedCategories?: {
    category: { slug: string; name: string; nameSomali: string | null };
  }[];
  authorizedTypes?: {
    animalType: {
      category?: { slug: string; name: string; nameSomali: string | null } | null;
    };
  }[];
}): string {
  const labels: string[] = [];
  const add = (label?: string | null) => {
    const value = (label || "").trim();
    if (value && value !== "—" && !labels.includes(value)) labels.push(value);
  };

  for (const row of broker.authorizedCategories || []) {
    add(
      livestockGroupLabel(
        row.category.slug,
        row.category.name,
        row.category.nameSomali
      )
    );
  }
  if (!labels.length) {
    for (const row of broker.authorizedTypes || []) {
      const cat = row.animalType.category;
      if (!cat) continue;
      add(livestockGroupLabel(cat.slug, cat.name, cat.nameSomali));
    }
  }
  if (labels.length) return labels.join(", ");

  const parts = parseLivestockTypeChoices(broker.livestockFocus);
  if (parts.includes(ALL_LIVESTOCK_TYPES)) {
    return "Geelka, Lo'da, Arriga";
  }
  for (const part of parts) {
    const slug = categorySlugFromLivestockSection(part);
    add(livestockGroupLabel(slug, part, null));
  }
  return labels.join(", ") || broker.livestockFocus?.trim() || "—";
}

/** Years covered by an age note: "1", "1jir", or "1 ilaa 2". */
function livestockAgeSpan(raw?: string | null): { lo: number; hi: number } | null {
  const single = livestockAgeYears(raw);
  if (single != null) return { lo: single, hi: single };
  const age = String(raw || "").toLowerCase();
  const nums = [...age.matchAll(/\d+(?:\.\d+)?/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const looksLikeYears = /jir|jiir|iir|sano|sanad|year|years|yr|yrs|ilaa|ila|to/.test(age);
  if (!looksLikeYears) return null;
  return { lo: Math.min(...nums), hi: Math.max(...nums) };
}

function livestockAgeYears(raw?: string | null): number | null {
  const key = ageClassKey(raw);
  if (!key.startsWith("y:")) return null;
  const n = Number(key.slice(2));
  return Number.isFinite(n) ? n : null;
}

function marketDisplay(name?: string | null, fallback?: string | null) {
  return (
    livestockMarketDisplayName(name, "en") ||
    livestockMarketDisplayName(fallback, "en") ||
    name ||
    fallback ||
    "—"
  );
}

function livestockMarketSearchKeys(raw: string): string[] {
  const q = raw.trim();
  if (!q) return [];
  const keys = new Set<string>();
  const add = (value: string) => {
    const t = value.replace(/\s+/g, " ").trim();
    if (t.length >= 3) keys.add(t);
    const short = t
      .replace(/\s+livestock\s+market$/i, "")
      .replace(/\s+market$/i, "")
      .trim();
    if (short.length >= 3) keys.add(short);
  };
  add(q);
  const qLower = q.toLowerCase();
  for (const entry of REGISTRATION_LIVESTOCK_MARKETS) {
    const bundle = [entry.name, ...entry.aliases, entry.location];
    const hit = bundle.some((n) => {
      const nLower = n.toLowerCase();
      return (
        nLower === qLower ||
        nLower.includes(qLower) ||
        qLower.includes(nLower.replace(/\s+livestock\s+market$/i, "").trim())
      );
    });
    if (hit) bundle.forEach(add);
  }
  return [...keys];
}

function livestockTypeTitle(name?: string | null) {
  const value = (name || "").trim();
  if (!value || /^all$/i.test(value)) return "Livestock";
  return value;
}

function parseDay(value: string | null | undefined, endOfDay: boolean): Date | null {
  if (!value?.trim()) return null;
  // Reject typo years like 22026 before Prisma sees them
  if (!isValidReportDate(value)) {
    throw new Error(
      `Invalid date "${value.trim()}". Use a real date between ${REPORT_YEAR_MIN} and ${REPORT_YEAR_MAX}.`
    );
  }
  return endOfDay ? mogadishuDayEnd(value) : mogadishuDayStart(value);
}

function money(n: unknown): number {
  const v = Number(n as number | string);
  return Number.isFinite(v) ? v : 0;
}

const LIVESTOCK_PRICE_COLUMNS = [
  { key: "category", label: "Category" },
  { key: "type", label: "Type" },
  { key: "class", label: "First / Second Class" },
  { key: "age", label: "Age" },
  { key: "origin", label: "From" },
  { key: "price", label: "Price (USD)" },
  { key: "status", label: "Status" },
  { key: "market", label: "Market" },
  { key: "broker", label: "Broker" },
  { key: "date", label: "Date" },
];

function mapLivestockPriceRow(r: {
  livestockCategory?: { name: string; nameSomali?: string | null } | null;
  livestockType?: { name: string; nameSomali?: string | null } | null;
  animalType?: string | null;
  category?: string | null;
  ageClass?: string | null;
  originPlace?: string | null;
  price: unknown;
  market?: { name: string } | null;
  marketLocation?: string | null;
  broker?: { name: string } | null;
  status: string;
  dateRecorded: Date;
}): AdvancedReportRow {
  return {
    category: livestockLabel(
      r.livestockCategory?.name,
      r.livestockCategory?.nameSomali,
      String(r.animalType || "—")
    ),
    type: livestockLabel(
      r.livestockType?.name || r.category,
      r.livestockType?.nameSomali
    ),
    class: displaySeasonLabel(r.category),
    age: (r.ageClass || "").trim() || "—",
    origin: originPlaceLabel(r.originPlace, "en") || "—",
    price: money(r.price),
    market: marketDisplay(r.market?.name, r.marketLocation),
    broker: r.broker?.name || "—",
    status: r.status,
    date: mogadishuYmd(r.dateRecorded),
  };
}

function yearsOverlapping(
  fromYmd: string | null | undefined,
  toYmd: string | null | undefined
): number[] {
  return yearsOverlappingMogadishu(
    fromYmd,
    toYmd,
    REPORT_YEAR_MIN,
    REPORT_YEAR_MAX
  );
}

function companyNameMatches(name: string, query: string, extra: string[] = []): boolean {
  const b = query.trim().toLowerCase();
  if (!b) return true;
  const hay = [name, ...extra]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return hay.some((a) => a === b || a.includes(b) || b.includes(a));
}

/** Yearly tariff cards (2022–2026) from company profiles — not live submission dates. */
async function yearlyUtilityHistoryRows(opts: {
  kind: "water" | "electricity";
  companyQ: string;
  years: number[];
  existingKeys: Set<string>;
}): Promise<AdvancedReportRow[]> {
  const providers =
    opts.kind === "water"
      ? await listPublicWaterProviders({ includeExtras: true })
      : await listPublicElectricityProviders({ includeExtras: true });
  const catalog =
    opts.kind === "water"
      ? MOGADISHU_WATER_PROVIDERS
      : MOGADISHU_ELECTRICITY_PROVIDERS;

  const out: AdvancedReportRow[] = [];
  for (const p of providers) {
    const seed = catalog.find((c) => c.slug === p.slug);
    const aliases = [
      p.acronym || "",
      p.cardTitle || "",
      p.slug,
      seed?.name || "",
      seed?.acronym || "",
      seed?.cardTitle || "",
    ];
    if (opts.companyQ && !companyNameMatches(p.name, opts.companyQ, aliases)) {
      continue;
    }
    const history = mergeYearlyRateMaps(
      p.yearlyRateHistory || {},
      seed?.yearlyRateHistory || {}
    );
    for (const year of opts.years) {
      const rate = money(
        history[year] ?? (history as Record<string, number>)[String(year)]
      );
      if (!(rate > 0)) continue;
      const key = `${p.name.trim().toLowerCase()}|${year}`;
      if (opts.existingKeys.has(key)) continue;
      opts.existingKeys.add(key);
      out.push({
        provider: p.name,
        rate,
        type: "YEARLY_RATE",
        location: "—",
        status: "APPROVED",
        date: `${year}-12-31`,
      });
    }
  }
  return out;
}

/**
 * Live published rates from company pages (seed + c.admin profile overrides).
 * This is what company admins edit — not electricity_prices / water_prices rows.
 */
async function catalogCurrentUtilityRates(
  kind: "water" | "electricity",
  companyQ = ""
): Promise<
  Array<{
    provider: string;
    rate: number;
    location: string;
    status: string;
    date: string;
    type: string;
  }>
> {
  const year = TARIFF_YEAR_END;
  const providers =
    kind === "water"
      ? await listPublicWaterProviders({ includeExtras: true })
      : await listPublicElectricityProviders({ includeExtras: true });
  const catalog =
    kind === "water"
      ? MOGADISHU_WATER_PROVIDERS
      : MOGADISHU_ELECTRICITY_PROVIDERS;

  const out: Array<{
    provider: string;
    rate: number;
    location: string;
    status: string;
    date: string;
    type: string;
  }> = [];

  for (const p of providers) {
    const seed = catalog.find((c) => c.slug === p.slug);
    const aliases = [
      p.acronym || "",
      p.cardTitle || "",
      p.slug,
      seed?.name || "",
      seed?.acronym || "",
      seed?.cardTitle || "",
    ];
    if (companyQ && !companyNameMatches(p.name, companyQ, aliases)) continue;

    const history = mergeYearlyRateMaps(
      p.yearlyRateHistory || {},
      seed?.yearlyRateHistory || {}
    );
    let rate = money(
      history[year] ?? (history as Record<string, number>)[String(year)]
    );

    if (!(rate > 0) && kind === "electricity") {
      const fromProvider =
        "tierRateHistory" in p && p.tierRateHistory
          ? p.tierRateHistory
          : undefined;
      const fromSeed =
        seed && "tierRateHistory" in seed ? seed.tierRateHistory : undefined;
      const tiers = fromProvider || fromSeed;
      const band =
        tiers?.[year] ??
        (tiers as Record<string, { low?: number }> | undefined)?.[
          String(year)
        ];
      rate = money(band?.low);
    }

    if (!(rate > 0)) continue;

    const locationRaw =
      ("location" in p && typeof p.location === "string" && p.location) ||
      ("address" in p && typeof p.address === "string" && p.address) ||
      MARKET_LOCATION;

    out.push({
      provider: p.name,
      rate,
      location: String(locationRaw).split(",")[0]?.trim() || MARKET_LOCATION,
      status: "APPROVED",
      date: `${year}-12-31`,
      type: "YEARLY_RATE",
    });
  }

  return out;
}

function titleFor(type: AdvancedReportType, filters: AdvancedReportFilters): string {
  let title = "";
  switch (type) {
    case "livestock_type_market":
    case "hal_camel_market": {
      const market = filters.marketName?.trim();
      const hasMarket =
        market &&
        market !== "—" &&
        market !== "-" &&
        market !== "--" &&
        market !== "——" &&
        market.toLowerCase() !== "all markets";
      const base = `${livestockTypeTitle(filters.livestockTypeName)} prices`;
      title = hasMarket ? `${base} — ${market}` : base;
      break;
    }
    case "utility_highest_rate":
      title = `Highest ${filters.utilityKind === "electricity" ? "kWh" : "m³"} Rate`;
      break;
    case "livestock_price_range":
      title = "Livestock Prices by Range";
      break;
    case "all_companies":
      title = "All Registered Companies";
      break;
    case "company_info_documents":
      title = "Company Info and Documents";
      break;
    case "all_brokers":
      title = "All Livestock Brokers";
      break;
    case "all_livestock":
      title = "All Livestock Price Records";
      break;
    case "companies_by_rate":
      title = filters.rateSort === "high"
        ? "Companies — Highest Rates"
        : "Companies — Cheapest Rates";
      break;
    case "registered_in_year": {
      const from = filters.dateFrom?.trim();
      const to = filters.dateTo?.trim();
      if (from && to) {
        title = `Registrations ${from} – ${to}`;
      } else {
        title = "Registrations";
      }
      break;
    }
    case "all_users":
      title = "All System Users";
      break;
    case "all_categories":
      title = "Livestock Categories & Types";
      break;
    case "broker_market_goats": {
      const market = filters.marketName?.trim();
      const hasMarket =
        market &&
        market !== "—" &&
        market !== "-" &&
        market !== "--" &&
        market !== "——" &&
        market.toLowerCase() !== "all markets";
      const base = `Brokers with ${livestockTypeTitle(filters.livestockTypeName)}`;
      title = hasMarket ? `${base} — ${market}` : base;
      break;
    }
    case "compare_two_markets":
      title = `Compare ${livestockTypeTitle(filters.livestockTypeName)}${filters.livestockSeason === "sugunto" ? " · Sugunto" : filters.livestockSeason === "birimo" ? " · Birimo" : ""} — ${filters.marketName?.trim() || "Market 1"} vs ${filters.marketNameB?.trim() || "Market 2"}`;
      break;
    case "compare_two_companies":
      title = `Compare ${filters.utilityKind === "electricity" ? "electricity" : "water"} — ${filters.companyName?.trim() || "Company 1"} vs ${filters.companyNameB?.trim() || "Company 2"}`;
      break;
    case "livestock_price_trend":
      title = "Livestock price trend";
      break;
    case "price_approvals":
      title = "Price approvals";
      break;
    case "broker_activity":
      title = "Broker activity";
      break;
    case "inactive_registrations":
      title = "Inactive companies & brokers";
      break;
    case "all_markets":
      title = "All Markets";
      break;
    case "all_utility_prices":
      title = "All Water & Electricity Prices";
      break;
    case "all_subscriptions":
      title = "All Subscriptions";
      break;
    default:
      title = "Livestock Report";
      break;
  }
  return title
    .replace(/\s*[—–-]+\s*[—–-]+\s*$/g, "")
    .replace(/\s*[—–-]+\s*$/g, "")
    .trim();
}

async function reportLivestockTypeMarket(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const marketQ = (filters.marketName || "").trim();
  const rawTypeId = filters.livestockTypeId;
  const typeId =
    rawTypeId == null || !Number.isFinite(Number(rawTypeId)) || Number(rawTypeId) === 0
      ? null
      : Number(rawTypeId);

  let typeLabel = "All livestock";
  let typeFilterIds: number[] = [];
  let typeNeedles: string[] = [];

  if (typeId != null) {
    if (!Number.isInteger(typeId) || typeId <= 0) {
      throw new Error("Please select a livestock type.");
    }
    const typeRow = await prisma.livestockAnimalType.findFirst({
      where: { id: typeId },
      select: {
        id: true,
        name: true,
        nameSomali: true,
        slug: true,
        category: { select: { name: true, nameSomali: true } },
      },
    });
    if (!typeRow) {
      throw new Error("Selected livestock type was not found.");
    }
    typeLabel = livestockLabel(typeRow.name, typeRow.nameSomali, `Type #${typeRow.id}`);
    const aliases = [
      ...new Set(
        [
          typeRow.name,
          typeRow.nameSomali,
          typeRow.slug,
          canonicalTypeName(typeRow.name),
          canonicalTypeName(typeRow.nameSomali),
          typeLabel,
        ]
          .map((n) => String(n || "").trim())
          .filter(Boolean)
      ),
    ];
    const twins = await prisma.livestockAnimalType.findMany({
      where: {
        status: "ACTIVE",
        OR: aliases.flatMap((name) => [
          { name: { equals: name, mode: "insensitive" as const } },
          { nameSomali: { equals: name, mode: "insensitive" as const } },
          { slug: { equals: name, mode: "insensitive" as const } },
        ]),
      },
      select: { id: true },
    });
    typeFilterIds = [...new Set([typeRow.id, ...twins.map((t) => t.id)])];
    typeNeedles = [
      ...new Set(
        aliases
          .flatMap((n) => [
            n,
            n.replace(/[^a-zA-Z0-9]+/g, ""),
            n.replace(/\s+/g, "_"),
          ])
          .map((n) => n.trim())
          .filter((n) => n.length >= 3 && n.length <= 24 && !n.includes("("))
      ),
    ];
  }

  const marketKeys = livestockMarketSearchKeys(marketQ);
  const marketRows = marketKeys.length
    ? await prisma.market.findMany({
        where: {
          deletedAt: null,
          marketType: "LIVESTOCK",
          OR: marketKeys.flatMap((key) => [
            { name: { contains: key, mode: "insensitive" as const } },
            { location: { contains: key, mode: "insensitive" as const } },
          ]),
        },
        select: { id: true, name: true },
      })
    : [];
  const marketIds = [...new Set(marketRows.map((m) => m.id))];

  const priceOp = filters.priceOp;
  const rawMin = filters.priceMin;
  const rawMax = filters.priceMax;
  const min =
    rawMin != null && Number.isFinite(Number(rawMin))
      ? Number(rawMin)
      : null;
  const max =
    rawMax != null && Number.isFinite(Number(rawMax))
      ? Number(rawMax)
      : null;

  let priceWhere: Record<string, number> | null = null;
  if (priceOp === "gt" && min != null) {
    priceWhere = { gt: min };
  } else if (priceOp === "lt" && (min != null || max != null)) {
    priceWhere = { lt: min ?? max! };
  } else if (priceOp === "between" && min != null && max != null) {
    priceWhere = { gte: min, lte: max };
  } else if (min != null && max != null) {
    priceWhere = { gte: min, lte: max };
  } else if (min != null) {
    priceWhere = { gte: min };
  } else if (max != null) {
    priceWhere = { lte: max };
  }

  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      AND: [
        ...(priceWhere ? [{ price: priceWhere }] : []),
        ...(typeFilterIds.length
          ? [
              {
                OR: [
                  { livestockTypeId: { in: typeFilterIds } },
                  ...typeNeedles.map((needle) => ({
                    category: {
                      contains: needle,
                      mode: "insensitive" as const,
                    },
                  })),
                ],
              },
            ]
          : []),
        ...(marketQ
          ? [
              {
                OR: [
                  ...(marketIds.length
                    ? [
                        { marketId: { in: marketIds } },
                        { broker: { marketId: { in: marketIds } } },
                        {
                          broker: {
                            assignedMarkets: {
                              some: { marketId: { in: marketIds } },
                            },
                          },
                        },
                      ]
                    : []),
                  ...marketKeys.flatMap((key) => [
                    {
                      market: {
                        name: { contains: key, mode: "insensitive" as const },
                      },
                    },
                    {
                      marketLocation: {
                        contains: key,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      broker: {
                        location: {
                          contains: key,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  ]),
                ],
              },
            ]
          : []),
        ...(from || to
          ? [
              {
                dateRecorded: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              },
            ]
          : []),
      ],
    },
    include: {
      livestockType: true,
      livestockCategory: true,
      market: true,
      broker: true,
      updatedBy: { select: { fullName: true, email: true } },
    },
    orderBy: { dateRecorded: "desc" },
    take: 2000,
  });

  const seasonFilter = filters.livestockSeason;
  const ageFilter = (filters.ageClass || "").trim().toLowerCase();

  const filteredRows = rows.filter((r) => {
    if (seasonFilter && (seasonFilter as string) !== "all") {
      const s = seasonFromCategoryLabel(r.category);
      if (s !== seasonFilter) return false;
    }
    if (ageFilter && ageFilter !== "all") {
      const matched =
        sameAgeClass(r.ageClass, ageFilter) ||
        (r.ageClass || "").toLowerCase().includes(ageFilter);
      if (!matched) return false;
    }
    const ageLo =
      filters.ageMin != null && Number.isFinite(Number(filters.ageMin))
        ? Number(filters.ageMin)
        : null;
    const ageHi =
      filters.ageMax != null && Number.isFinite(Number(filters.ageMax))
        ? Number(filters.ageMax)
        : null;
    if (ageLo != null || ageHi != null) {
      const span = livestockAgeSpan(r.ageClass);
      if (!span) return false;
      const from = ageLo ?? ageHi!;
      const to = ageHi ?? ageLo!;
      const wantLo = Math.min(from, to);
      const wantHi = Math.max(from, to);
      if (span.hi < wantLo || span.lo > wantHi) return false;
    }
    const originQ = (filters.originPlace || "").trim().toLowerCase();
    if (originQ) {
      const place = (originPlaceLabel(r.originPlace, "en") || r.originPlace || "")
        .toLowerCase();
      if (!place.includes(originQ)) return false;
    }
    return true;
  });

  const marketLabel = marketDisplay(
    marketRows[0]?.name || marketQ,
    marketQ
  );
  const emptyHint =
    filteredRows.length === 0
      ? " No livestock prices match the selected filters."
      : "";

  const seasonText =
    seasonFilter === "birimo"
      ? " · Birimo"
      : seasonFilter === "sugunto"
        ? " · Sugunto"
        : "";
  const ageBoundLo =
    filters.ageMin != null && Number.isFinite(Number(filters.ageMin))
      ? Number(filters.ageMin)
      : null;
  const ageBoundHi =
    filters.ageMax != null && Number.isFinite(Number(filters.ageMax))
      ? Number(filters.ageMax)
      : null;
  const ageRangeText =
    priceOp === "between" && ageBoundLo != null && ageBoundHi != null
      ? ` · Age ${ageBoundLo}–${ageBoundHi}`
      : priceOp === "gt" && ageBoundLo != null
        ? ` · Age > ${ageBoundLo}`
        : priceOp === "lt" && (ageBoundLo != null || ageBoundHi != null)
          ? ` · Age < ${ageBoundLo ?? ageBoundHi}`
          : ageBoundLo != null && ageBoundHi != null
            ? ` · Age ${ageBoundLo}–${ageBoundHi}`
            : "";
  const ageText =
    ageFilter && ageFilter !== "all"
      ? ` · Age: ${ageClassLabel(ageFilter, "en") || ageFilter}`
      : ageRangeText;
  const priceRangeText =
    priceOp === "between" && min != null && max != null
      ? ` · $${min}–$${max}`
      : priceOp === "gt" && min != null
        ? ` · > $${min}`
        : priceOp === "lt" && (min != null || max != null)
          ? ` · < $${min ?? max}`
          : min != null && max != null
            ? ` · $${min}–$${max}`
            : "";

  return {
    reportType: "livestock_type_market",
    title: titleFor("livestock_type_market", {
      ...filters,
      marketName: marketLabel,
      livestockTypeName: typeLabel,
    }),
    subtitle: `Type: ${typeLabel} · Market: ${marketLabel}${seasonText}${ageText}${priceRangeText}${from ? ` · From ${filters.dateFrom}` : ""}${to ? ` · To ${filters.dateTo}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: LIVESTOCK_PRICE_COLUMNS,
    rows: filteredRows.map((r) => mapLivestockPriceRow(r)),
    summary: filteredRows.length
      ? `${filteredRows.length} record${filteredRows.length === 1 ? "" : "s"} found.`
      : `No records found.${emptyHint}`,
  };
}

async function reportUtilityHighest(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const kind = filters.utilityKind === "electricity" ? "electricity" : "water";
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const companyQ = (filters.companyName || filters.companySlug || "").trim();
  const mapped: AdvancedReportRow[] = [];

  if (kind === "water") {
    const live = await prisma.waterPrice.findMany({
      where: {
        ...(companyQ
          ? { providerName: { contains: companyQ, mode: "insensitive" } }
          : {}),
        ...(from || to
          ? {
              dateRecorded: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { pricePerUnit: "desc" },
      take: 50,
    });
    for (const r of live) {
      mapped.push({
        provider: r.providerName,
        rate: money(r.pricePerUnit),
        type: r.waterType,
        location: r.location,
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
      });
    }
  } else {
    const live = await prisma.electricityPrice.findMany({
      where: {
        ...(companyQ
          ? { providerName: { contains: companyQ, mode: "insensitive" } }
          : {}),
        ...(from || to
          ? {
              dateRecorded: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { pricePerKwh: "desc" },
      take: 50,
    });
    for (const r of live) {
      mapped.push({
        provider: r.providerName,
        rate: money(r.pricePerKwh),
        type: r.serviceType,
        location: r.location,
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
      });
    }
  }

  // Include published c.admin / seed tariff rates for years in range.
  const years =
    from || to
      ? yearsOverlapping(filters.dateFrom, filters.dateTo)
      : [TARIFF_YEAR_END];
  const existingKeys = new Set(
    mapped.map(
      (r) =>
        `${String(r.provider).trim().toLowerCase()}|${String(r.date).slice(0, 4)}`
    )
  );
  const catalogRows = await yearlyUtilityHistoryRows({
    kind,
    companyQ,
    years: years.length ? years : [TARIFF_YEAR_END],
    existingKeys,
  });
  mapped.push(...catalogRows);

  mapped.sort((a, b) => money(b.rate) - money(a.rate));

  const unit = kind === "water" ? "m³" : "kWh";
  const decimals = kind === "water" ? 2 : 4;
  const top = mapped[0];
  const emptyHint =
    mapped.length === 0
      ? " No rates in this range in the database."
      : "";

  return {
    reportType: "utility_highest_rate",
    title: titleFor("utility_highest_rate", filters),
    subtitle: `${kind === "water" ? "Water" : "Electricity"} ($${unit === "m³" ? "/m³" : "/kWh"})${companyQ ? ` · ${companyQ}` : " · All companies"}${from ? ` · From ${filters.dateFrom}` : ""}${to ? ` · To ${filters.dateTo}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "provider", label: "Company" },
      { key: "rate", label: `Rate ($/${unit})` },
      { key: "type", label: kind === "water" ? "Water Type" : "Service Type" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
    ],
    rows: mapped,
    summary: top
      ? `Highest rate: $${money(top.rate).toFixed(decimals)} / ${unit} (${top.provider})`
      : `No rates found.${emptyHint}`,
  };
}

async function reportLivestockPriceRange(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const op = filters.priceOp || "between";
  const min =
    filters.priceMin != null && Number.isFinite(Number(filters.priceMin))
      ? Number(filters.priceMin)
      : null;
  const max =
    filters.priceMax != null && Number.isFinite(Number(filters.priceMax))
      ? Number(filters.priceMax)
      : null;
  if (op === "between" && (min == null || max == null)) {
    throw new Error("Please enter both min and max price.");
  }
  if ((op === "gt" || op === "lt") && min == null) {
    throw new Error("Please enter a price.");
  }
  const priceWhere =
    op === "gt"
      ? { gt: min! }
      : op === "lt"
        ? { lt: min! }
        : { gte: min!, lte: max! };

  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const dateWhere =
    from || to
      ? {
          dateRecorded: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const typeFilter = await resolveLivestockTypeFilter(filters.livestockTypeId);
  const marketQ = (filters.marketName || "").trim();
  const marketKeys = marketQ ? livestockMarketSearchKeys(marketQ) : [];
  const marketRows = marketKeys.length
    ? await prisma.market.findMany({
        where: {
          deletedAt: null,
          marketType: "LIVESTOCK",
          OR: marketKeys.flatMap((key) => [
            { name: { contains: key, mode: "insensitive" as const } },
            { location: { contains: key, mode: "insensitive" as const } },
          ]),
        },
        select: { id: true },
      })
    : [];
  const marketIds = [...new Set(marketRows.map((m) => m.id))];

  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      price: priceWhere,
      ...dateWhere,
      ...(typeFilter.typeFilterIds.length
        ? {
            OR: [
              { livestockTypeId: { in: typeFilter.typeFilterIds } },
              ...typeFilter.typeNeedles.map((needle) => ({
                category: { contains: needle, mode: "insensitive" as const },
              })),
            ],
          }
        : {}),
      ...(marketQ
        ? {
            OR: [
              ...(marketIds.length ? [{ marketId: { in: marketIds } }] : []),
              { marketLocation: { contains: marketQ, mode: "insensitive" as const } },
              { market: { name: { contains: marketQ, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: {
      livestockType: true,
      livestockCategory: true,
      market: true,
      broker: true,
    },
    orderBy: { price: "asc" },
    take: 2000,
  });

  const rangeLabel =
    op === "gt"
      ? `> $${min}`
      : op === "lt"
        ? `< $${min}`
        : `between $${min} and $${max}`;

  const typePart = typeFilter.typeLabel !== "All livestock" ? ` · Type: ${typeFilter.typeLabel}` : "";
  const marketPart = marketQ ? ` · Market: ${marketQ}` : "";
  const datePart = from || to ? ` · ${filters.dateFrom || "Start"} to ${filters.dateTo || "End"}` : "";

  return {
    reportType: "livestock_price_range",
    title: titleFor("livestock_price_range", filters),
    subtitle: `Price ${rangeLabel}${typePart}${marketPart}${datePart}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: LIVESTOCK_PRICE_COLUMNS,
    rows: rows.map((r) => mapLivestockPriceRow(r)),
    summary: `${rows.length} livestock record(s) with price ${rangeLabel}`,
  };
}

async function reportAllCompanies(): Promise<AdvancedReportResult> {
  await backfillMissingCompanyMarkets();
  const [rows, waterMarket, electricityMarket] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        market: true,
        documents: { where: { deletedAt: null }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    findDefaultMarketForCompanyType("WATER_SUPPLY"),
    findDefaultMarketForCompanyType("ELECTRICITY"),
  ]);
  return {
    reportType: "all_companies",
    title: titleFor("all_companies", { reportType: "all_companies" }),
    subtitle: "Companies currently in the system",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "name", label: "Company" },
      { key: "type", label: "Type" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location" },
      { key: "district", label: "District" },
      { key: "address", label: "Address" },
      { key: "registrationNo", label: "Reg. No" },
      { key: "market", label: "Market" },
      { key: "logo", label: "Logo" },
      { key: "documents", label: "Documents" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Registered" },
    ],
    rows: rows.map((c) => ({
      name: c.name,
      type: c.type,
      email: c.email || "—",
      phone: c.phone || "—",
      location: c.location || "—",
      district: c.district || "—",
      address: c.address || "—",
      registrationNo: c.registrationNumber || "—",
      logo: c.logoFileName?.trim() ? "Yes" : "No",
      documents: c.documents.length,
      market:
        c.market?.name ||
        (c.type === "WATER_SUPPLY" ? waterMarket?.name : null) ||
        (c.type === "ELECTRICITY" ? electricityMarket?.name : null) ||
        "—",
      status: c.status,
      createdAt: mogadishuYmd(c.createdAt),
    })),
    summary: `${rows.length} company(ies)`,
  };
}

const COMPANY_DOC_LABELS: Record<string, string> = {
  business_license: "Business registration",
  tax_certificate: "Tax certificate",
  sector_license: "Sector license",
  official_letter: "Official letter",
  id_passport: "ID / passport",
  personal_photo: "Personal photo",
};

function parseDocMap(raw?: string | null): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function sectorMatchesKind(
  sector: string | null | undefined,
  kind: AdvancedReportFilters["utilityKind"]
): boolean {
  const s = (sector || "").toLowerCase();
  if (kind === "water") return s.includes("water") || s.includes("biyo");
  if (kind === "electricity") {
    return s.includes("electric") || s.includes("koronto");
  }
  return true;
}

async function reportCompanyInfoDocuments(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { notIn: ["LIVESTOCK_BROKER_USER"] },
      AND: [
        {
          OR: [
            { companyName: { not: null } },
            { companyId: { not: null } },
            { role: { in: ["COMPANY_ADMIN"] } },
          ],
        },
        {
          OR: [
            { companyId: null },
            { company: { is: { deletedAt: null, status: "ACTIVE" } } },
          ],
        },
      ],
    },
    select: {
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      companySector: true,
      companyType: true,
      companyDistrict: true,
      companyAddress: true,
      companyEmail: true,
      companyLocation: true,
      companyCountry: true,
      companyEstablishedDate: true,
      companyRegistrationNumber: true,
      companyLogoFileName: true,
      documentFileName: true,
      registrationDocuments: true,
      contactRole: true,
      status: true,
      role: true,
    },
    orderBy: { companyName: "asc" },
    take: 2000,
  });

  const kind = filters.utilityKind;
  const filtered = users.filter((u) => {
    const name = u.companyName?.trim();
    if (!name && u.role !== "COMPANY_ADMIN") {
      return false;
    }
    return sectorMatchesKind(u.companySector || u.companyType, kind);
  });

  const seen = new Set<string>();
  const rows: AdvancedReportRow[] = [];
  for (const u of filtered) {
    const company = u.companyName?.trim() || u.fullName;
    const key = `${company.toLowerCase()}|${u.email.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const docs = parseDocMap(u.registrationDocuments);
    if (u.documentFileName?.trim() && !Object.keys(docs).length) {
      docs.legacy = u.documentFileName.trim();
    }
    const uploaded = Object.keys(docs)
      .map((id) => COMPANY_DOC_LABELS[id] || id.replace(/_/g, " "))
      .filter(Boolean);
    const expected = ["business_license", "id_passport", "personal_photo"];
    const missing = expected
      .filter((id) => !docs[id])
      .map((id) => COMPANY_DOC_LABELS[id] || id);

    rows.push({
      company,
      sector: u.companySector || u.companyType || "—",
      contact: u.fullName,
      role: u.contactRole || formatRoleLabel(u.role),
      email: u.companyEmail || u.email,
      phone: u.phone || "—",
      district: u.companyDistrict || "—",
      location: u.companyLocation || "—",
      country: u.companyCountry || "—",
      established: u.companyEstablishedDate || "—",
      address: u.companyAddress || "—",
      registrationNo: u.companyRegistrationNumber || "—",
      logo: u.companyLogoFileName?.trim() ? "Yes" : "No",
      documents: uploaded.length ? uploaded.join("; ") : "None",
      missing: missing.length ? missing.join("; ") : "None",
      status: u.status,
    });
  }

  const kindLabel =
    kind === "electricity"
      ? "Electricity"
      : kind === "water"
        ? "Water"
        : "All sectors";

  return {
    reportType: "company_info_documents",
    title: titleFor("company_info_documents", filters),
    subtitle: `${kindLabel} — company profile and registration documents`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "company", label: "Company" },
      { key: "sector", label: "Sector" },
      { key: "contact", label: "Contact" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "district", label: "District" },
      { key: "location", label: "Location" },
      { key: "country", label: "Country" },
      { key: "established", label: "Established" },
      { key: "address", label: "Address" },
      { key: "registrationNo", label: "Reg. No" },
      { key: "logo", label: "Logo" },
      { key: "documents", label: "Documents on file" },
      { key: "missing", label: "Missing documents" },
      { key: "status", label: "Status" },
    ],
    rows,
    summary: `${rows.length} compan${rows.length === 1 ? "y" : "ies"} with profile and document status`,
  };
}

async function reportAllBrokers(): Promise<AdvancedReportResult> {
  const rows = await prisma.livestockBroker.findMany({
    where: { deletedAt: null },
    include: {
      market: true,
      assignedMarkets: { include: { market: true } },
      authorizedCategories: { include: { category: true } },
    },
    orderBy: { name: "asc" },
  });
  return {
    reportType: "all_brokers",
    title: titleFor("all_brokers", { reportType: "all_brokers" }),
    subtitle: "All livestock brokers in the database",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Broker" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location" },
      { key: "market", label: "Primary Market" },
      { key: "markets", label: "Assigned Markets" },
      { key: "categories", label: "Categories" },
      { key: "focus", label: "Livestock focus" },
      { key: "photo", label: "Photo" },
      { key: "approval", label: "Approval" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Registered" },
    ],
    rows: rows.map((b) => ({
      code: b.code || "—",
      name: b.name,
      email: b.email || "—",
      phone: b.phone || "—",
      location: b.location || "—",
      market: b.market?.name || "—",
      markets: b.assignedMarkets.map((m) => m.market.name).join(", ") || "—",
      categories: managedLivestockList(b),
      focus: b.livestockFocus?.trim() || "—",
      photo: b.profilePicture?.trim() ? "Yes" : "No",
      approval: b.approvalStatus,
      status: b.status,
      createdAt: mogadishuYmd(b.createdAt),
    })),
    summary: `${rows.length} broker(s)`,
  };
}

async function reportAllLivestock(): Promise<AdvancedReportResult> {
  const rows = await prisma.livestockPrice.findMany({
    where: { deletedAt: null },
    include: {
      livestockType: true,
      livestockCategory: true,
      market: true,
      broker: true,
    },
    orderBy: { dateRecorded: "desc" },
    take: 3000,
  });
  return {
    reportType: "all_livestock",
    title: titleFor("all_livestock", { reportType: "all_livestock" }),
    subtitle: "Livestock price records",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: LIVESTOCK_PRICE_COLUMNS,
    rows: rows.map((r) => mapLivestockPriceRow(r)),
    summary: `${rows.length} livestock price record(s)`,
  };
}

async function reportCompaniesByRate(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const sort: RateSort = filters.rateSort === "high" ? "high" : "cheap";
  const kind = filters.utilityKind === "electricity" ? "electricity" : "water";

  // Prefer live company-page rates (c.admin profile + seed). Fall back to
  // electricity_prices / water_prices only when catalog has no rate for a firm.
  const catalog = await catalogCurrentUtilityRates(kind);
  const byProvider = new Map(
    catalog.map((r) => [r.provider.trim().toLowerCase(), r])
  );

  if (kind === "water") {
    const rows = await prisma.waterPrice.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      orderBy: { dateRecorded: "desc" },
      take: 200,
    });
    for (const r of rows) {
      const key = r.providerName.trim().toLowerCase();
      if (byProvider.has(key)) continue;
      byProvider.set(key, {
        provider: r.providerName,
        rate: money(r.pricePerUnit),
        location: r.location,
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
        type: r.waterType,
      });
    }
  } else {
    const rows = await prisma.electricityPrice.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      orderBy: { dateRecorded: "desc" },
      take: 200,
    });
    for (const r of rows) {
      const key = r.providerName.trim().toLowerCase();
      if (byProvider.has(key)) continue;
      byProvider.set(key, {
        provider: r.providerName,
        rate: money(r.pricePerKwh),
        location: r.location,
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
        type: r.serviceType,
      });
    }
  }

  const unique = [...byProvider.values()].sort((a, b) =>
    sort === "high" ? b.rate - a.rate : a.rate - b.rate
  );
  const unit = kind === "water" ? "m³" : "kWh";

  return {
    reportType: "companies_by_rate",
    title: titleFor("companies_by_rate", filters),
    subtitle: `${kind === "water" ? "Water" : "Electricity"} rates ranked ${sort === "high" ? "highest first" : "cheapest first"}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "rank", label: "#" },
      { key: "provider", label: "Company" },
      { key: "rate", label: `Rate ($/${unit})` },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
    ],
    rows: unique.map((r, i) => ({
      rank: i + 1,
      provider: r.provider,
      rate: r.rate,
      location: r.location,
      status: r.status,
      date: r.date,
    })),
    summary: `${unique.length} ${kind} company rate(s)`,
  };
}

async function reportRegisteredInYear(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  if (!from || !to) {
    throw new Error("Please enter both From date and To date.");
  }
  const fromLabel = filters.dateFrom?.trim() || "";
  const toLabel = filters.dateTo?.trim() || "";
  const kind: RegisteredKind = filters.registeredKind || "both";

  /**
   * End of range = last registration on/before To (not merely the picked To day).
   * Example: To=23 Sep but last registration=22 Sep → report runs through 22 Sep.
   */
  let lastRegistration: Date | null = null;
  if (kind === "companies" || kind === "both") {
    const lastCompany = await prisma.company.findFirst({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastCompany?.createdAt) {
      lastRegistration = lastCompany.createdAt;
    }
  }
  if (kind === "brokers" || kind === "both") {
    const lastBroker = await prisma.livestockBroker.findFirst({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (
      lastBroker?.createdAt &&
      (!lastRegistration || lastBroker.createdAt > lastRegistration)
    ) {
      lastRegistration = lastBroker.createdAt;
    }
  }

  const effectiveTo = lastRegistration
    ? parseDay(mogadishuYmd(lastRegistration), true) ?? to
    : to;
  const effectiveToLabel = lastRegistration
    ? mogadishuYmd(lastRegistration)
    : toLabel;

  const out: AdvancedReportRow[] = [];

  if (kind === "companies" || kind === "both") {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: effectiveTo } },
      orderBy: { createdAt: "asc" },
    });
    for (const c of companies) {
      out.push({
        kind: "Company",
        name: c.name,
        email: c.email || "—",
        phone: c.phone || "—",
        type: c.type,
        location: c.location || c.district || "—",
        status: c.status,
        createdAt: mogadishuYmd(c.createdAt),
      });
    }
  }
  if (kind === "brokers" || kind === "both") {
    const brokers = await prisma.livestockBroker.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: effectiveTo } },
      orderBy: { createdAt: "asc" },
    });
    for (const b of brokers) {
      out.push({
        kind: "Broker",
        name: b.name,
        email: b.email || "—",
        phone: b.phone || "—",
        type: b.code || "BROKER",
        location: b.location || "—",
        status: b.status,
        createdAt: mogadishuYmd(b.createdAt),
      });
    }
  }

  const rangeLabel = lastRegistration
    ? `${fromLabel} – ${effectiveToLabel} (last registration)`
    : `${fromLabel} – ${toLabel}`;

  return {
    reportType: "registered_in_year",
    title: titleFor("registered_in_year", {
      ...filters,
      dateTo: effectiveToLabel || filters.dateTo,
    }),
    subtitle: `${rangeLabel} · ${kind}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "kind", label: "Kind" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "type", label: "Type / Code" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Registered" },
    ],
    rows: out,
    summary: `${out.length} registration(s) ${rangeLabel}`,
  };
}

async function reportAllUsers(): Promise<AdvancedReportResult> {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      company: { select: { name: true } },
      broker: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    take: 3000,
  });
  return {
    reportType: "all_users",
    title: titleFor("all_users", { reportType: "all_users" }),
    subtitle: "All system users currently in the database",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "account", label: "Account" },
      { key: "company", label: "Company" },
      { key: "broker", label: "Broker" },
      { key: "createdAt", label: "Created" },
    ],
    rows: rows.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || "—",
      role: u.role,
      status: u.status,
      account: u.accountStatus,
      company: u.company?.name || u.companyName || "—",
      broker: u.broker?.name || "—",
      createdAt: mogadishuYmd(u.createdAt),
    })),
    summary: `${rows.length} user(s)`,
  };
}

function latestProofLabel(
  proof: { status: string; receiptFile: string } | undefined,
  price: number
): string {
  if (!proof) return price <= 0 ? "Free" : "No receipt";
  const raw = proof.receiptFile.trim().toLowerCase();
  const method = raw.startsWith("method:mastercard") || raw === "mastercard"
    ? "MasterCard"
    : raw.startsWith("method:visa") || raw === "visa"
      ? "Visa"
    : raw.startsWith("method:evc") || raw === "evc"
      ? "EVC Plus"
      : raw.startsWith("method:free") || raw === "free"
        ? "Free"
        : proof.receiptFile.trim()
          ? "Receipt"
          : price <= 0
            ? "Free"
            : "No receipt";
  if (method === "Free") return "Free";
  const status = proof.status.trim();
  return status && status !== "APPROVED" ? `${method} · ${status}` : method;
}

async function reportAllSubscriptions(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  await refreshSubscriptionStatuses().catch(() => null);

  const kind: RegisteredKind = filters.registeredKind || "both";
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  // Include plans that start later in the same month as To. Company plans
  // often start a day or two after the date the admin picks.
  const toMonthEnd = filters.dateTo?.trim()
    ? parseDay(reportMonthLastDay(filters.dateTo.trim().slice(0, 7)), true)
    : to;
  const startBefore = toMonthEnd && to && toMonthEnd > to ? toMonthEnd : to;
  const dateWhere =
    from || startBefore
      ? {
          AND: [
            ...(startBefore ? [{ startDate: { lte: startBefore } }] : []),
            ...(from ? [{ expiryDate: { gte: from } }] : []),
          ],
        }
      : {};

  const rows = await prisma.subscription.findMany({
    where: {
      ...dateWhere,
      ...(kind === "companies"
        ? { companyId: { not: null }, brokerId: null }
        : kind === "brokers"
          ? { brokerId: { not: null }, companyId: null }
          : {}),
    },
    include: {
      plan: {
        select: {
          name: true,
          price: true,
          durationDays: true,
          accountType: true,
        },
      },
      company: { select: { name: true } },
      broker: { select: { name: true } },
      paymentProofs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, receiptFile: true },
      },
    },
    orderBy: { expiryDate: "desc" },
    take: 3000,
  });

  return {
    reportType: "all_subscriptions",
    title: titleFor("all_subscriptions", filters),
    subtitle: `${kind === "companies" ? "Companies" : kind === "brokers" ? "Brokers" : "Companies and brokers"}${from || to ? ` · ${filters.dateFrom || "Start"} to ${filters.dateTo || "End"}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "kind", label: "Kind" },
      { key: "account", label: "Account" },
      { key: "plan", label: "Plan" },
      { key: "price", label: "Price (USD)" },
      { key: "duration", label: "Duration (days)" },
      { key: "status", label: "Status" },
      { key: "startDate", label: "Start" },
      { key: "expiryDate", label: "Expiry" },
      { key: "adsRemaining", label: "Ads left" },
      { key: "paymentProof", label: "Latest proof" },
    ],
    rows: rows.map((s) => ({
      kind:
        kind === "brokers"
          ? "Broker"
          : kind === "companies"
            ? "Company"
            : s.brokerId && !s.companyId
              ? "Broker"
              : s.companyId
                ? "Company"
                : s.plan.accountType || "—",
      account:
        kind === "brokers"
          ? s.broker?.name || "—"
          : kind === "companies"
            ? s.company?.name || "—"
            : s.company?.name || s.broker?.name || "—",
      plan: s.plan.name,
      price: money(s.plan.price),
      duration: s.plan.durationDays,
      status: s.status,
      startDate: mogadishuYmd(s.startDate),
      expiryDate: mogadishuYmd(s.expiryDate),
      adsRemaining: s.adsRemaining == null ? "—" : s.adsRemaining,
      paymentProof: latestProofLabel(
        s.paymentProofs[0],
        money(s.plan.price)
      ),
    })),
    summary: `${rows.length} subscription(s)`,
  };
}

async function reportAllCategories(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const categoryQ = (filters.livestockCategory || "").trim().toLowerCase();
  const rows = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    include: {
      animalTypes: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  const flat: AdvancedReportRow[] = [];
  for (const c of rows) {
    const categoryName = livestockLabel(c.name, c.nameSomali);
    if (categoryQ && !categoryName.toLowerCase().includes(categoryQ) && c.slug.toLowerCase() !== categoryQ) {
      continue;
    }
    if (c.animalTypes.length === 0) {
      flat.push({
        category: categoryName,
        slug: c.slug,
        type: "—",
        typeSlug: "—",
        status: c.status,
      });
      continue;
    }
    for (const t of c.animalTypes) {
      flat.push({
        category: categoryName,
        slug: c.slug,
        type: livestockLabel(t.name, t.nameSomali),
        typeSlug: t.slug,
        status: t.status,
      });
    }
  }
  return {
    reportType: "all_categories",
    title: titleFor("all_categories", { reportType: "all_categories" }),
    subtitle: "Livestock categories and animal types",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "category", label: "Category" },
      { key: "type", label: "Animal Type" },
      { key: "status", label: "Status" },
    ],
    rows: flat,
    summary: `${rows.length} categor(y/ies), ${flat.length} type row(s)`,
  };
}

async function reportBrokerMarketGoats(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const marketQ = (filters.marketName || "").trim();

  const rawTypeId = filters.livestockTypeId;
  const typeId =
    rawTypeId == null || !Number.isFinite(Number(rawTypeId)) || Number(rawTypeId) === 0
      ? null
      : Number(rawTypeId);

  let typeLabel = "All livestock";
  let typeFilterIds: number[] = [];
  let categoryIds: number[] = [];
  let typeNeedles: string[] = [];

  if (typeId != null) {
    if (!Number.isInteger(typeId) || typeId <= 0) {
      throw new Error("Please select a livestock type.");
    }
    const typeRow = await prisma.livestockAnimalType.findFirst({
      where: { id: typeId },
      select: {
        id: true,
        name: true,
        nameSomali: true,
        slug: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, nameSomali: true, slug: true },
        },
      },
    });
    if (!typeRow) {
      throw new Error("Selected livestock type was not found.");
    }
    typeLabel = livestockLabel(
      typeRow.name,
      typeRow.nameSomali,
      `Type #${typeRow.id}`
    );
    const aliases = [
      ...new Set(
        [
          typeRow.name,
          typeRow.nameSomali,
          typeRow.slug,
          typeRow.category.name,
          typeRow.category.nameSomali,
          typeRow.category.slug,
          canonicalTypeName(typeRow.name),
          canonicalTypeName(typeRow.nameSomali),
          typeLabel,
        ]
          .map((n) => String(n || "").trim())
          .filter((n) => n.length >= 3)
      ),
    ];
    const twins = await prisma.livestockAnimalType.findMany({
      where: {
        status: "ACTIVE",
        OR: aliases.flatMap((name) => [
          { name: { equals: name, mode: "insensitive" as const } },
          { nameSomali: { equals: name, mode: "insensitive" as const } },
          { slug: { equals: name, mode: "insensitive" as const } },
        ]),
      },
      select: { id: true, categoryId: true },
    });
    typeFilterIds = [...new Set([typeRow.id, ...twins.map((t) => t.id)])];
    categoryIds = [
      ...new Set([typeRow.categoryId, ...twins.map((t) => t.categoryId)]),
    ];
    typeNeedles = aliases;
  }

  const marketKeys = marketQ ? livestockMarketSearchKeys(marketQ) : [];
  const searchKeys = marketKeys.length ? marketKeys : marketQ ? [marketQ] : [];

  const rows = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      AND: [
        ...(searchKeys.length
          ? [
              {
                OR: searchKeys.flatMap((key) => [
                  { market: { name: { contains: key, mode: "insensitive" as const } } },
                  { location: { contains: key, mode: "insensitive" as const } },
                  {
                    assignedMarkets: {
                      some: {
                        market: {
                          name: { contains: key, mode: "insensitive" as const },
                        },
                      },
                    },
                  },
                ]),
              },
            ]
          : []),
        ...(typeFilterIds.length
          ? [
              {
                OR: [
                  {
                    authorizedTypes: {
                      some: { animalTypeId: { in: typeFilterIds } },
                    },
                  },
                  {
                    authorizedCategories: {
                      some: { categoryId: { in: categoryIds } },
                    },
                  },
                  ...typeNeedles.map((needle) => ({
                    livestockFocus: {
                      contains: needle,
                      mode: "insensitive" as const,
                    },
                  })),
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      market: true,
      assignedMarkets: { include: { market: true } },
      authorizedCategories: { include: { category: true } },
      authorizedTypes: {
        include: { animalType: { include: { category: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const marketLabel = marketQ ? marketDisplay(marketQ, marketQ) : "All markets";

  return {
    reportType: "broker_market_goats",
    title: titleFor("broker_market_goats", {
      ...filters,
      marketName: marketLabel,
      livestockTypeName: typeLabel,
    }),
    subtitle: `Market: ${marketLabel} · Livestock: ${typeLabel}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Broker" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "market", label: "Market" },
      { key: "livestock", label: "Livestock" },
      { key: "status", label: "Status" },
    ],
    rows: rows.map((b) => ({
      code: b.code || "—",
      name: b.name,
      email: b.email || "—",
      phone: b.phone || "—",
      market:
        b.assignedMarkets.map((m) => m.market.name).join(", ") ||
        b.market?.name ||
        b.location ||
        "—",
      livestock: managedLivestockList(b),
      status: b.status,
    })),
    summary: `${rows.length} matching broker(s)`,
  };
}

type ComparePriceCell = {
  type: string;
  age: string;
  className: string;
  price: number;
  date: string;
};

async function resolveLivestockTypeFilter(rawTypeId: number | null | undefined): Promise<{
  typeLabel: string;
  typeFilterIds: number[];
  typeNeedles: string[];
}> {
  const typeId =
    rawTypeId == null || !Number.isFinite(Number(rawTypeId)) || Number(rawTypeId) === 0
      ? null
      : Number(rawTypeId);
  if (typeId == null) {
    return { typeLabel: "All livestock", typeFilterIds: [], typeNeedles: [] };
  }
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new Error("Please select a livestock type.");
  }
  const typeRow = await prisma.livestockAnimalType.findFirst({
    where: { id: typeId },
    select: {
      id: true,
      name: true,
      nameSomali: true,
      slug: true,
      category: { select: { name: true, nameSomali: true } },
    },
  });
  if (!typeRow) {
    throw new Error("Selected livestock type was not found.");
  }
  const typeLabel = livestockLabel(
    typeRow.name,
    typeRow.nameSomali,
    `Type #${typeRow.id}`
  );
  const aliases = [
    ...new Set(
      [
        typeRow.name,
        typeRow.nameSomali,
        typeRow.slug,
        canonicalTypeName(typeRow.name),
        canonicalTypeName(typeRow.nameSomali),
        typeLabel,
      ]
        .map((n) => String(n || "").trim())
        .filter(Boolean)
    ),
  ];
  const twins = await prisma.livestockAnimalType.findMany({
    where: {
      OR: aliases.flatMap((name) => [
        { name: { equals: name, mode: "insensitive" as const } },
        { nameSomali: { equals: name, mode: "insensitive" as const } },
        { slug: { equals: name, mode: "insensitive" as const } },
      ]),
    },
    select: { id: true },
  });
  const typeFilterIds = [...new Set([typeRow.id, ...twins.map((t) => t.id)])];
  const typeNeedles = [
    ...new Set(
      aliases
        .flatMap((n) => [
          n,
          n.replace(/[^a-zA-Z0-9]+/g, ""),
          n.replace(/\s+/g, "_"),
        ])
        .map((n) => n.trim())
        .filter((n) => n.length >= 3 && n.length <= 24 && !n.includes("("))
    ),
  ];
  return { typeLabel, typeFilterIds, typeNeedles };
}

async function latestPricesForMarket(
  marketQ: string,
  from: Date | null,
  to: Date | null,
  typeFilter?: { typeFilterIds: number[]; typeNeedles: string[] },
  seasonFilter?: "birimo" | "sugunto" | null
): Promise<{ label: string; byKey: Map<string, ComparePriceCell> }> {
  const marketKeys = livestockMarketSearchKeys(marketQ);
  const marketRows = marketKeys.length
    ? await prisma.market.findMany({
        where: {
          deletedAt: null,
          marketType: "LIVESTOCK",
          OR: marketKeys.flatMap((key) => [
            { name: { contains: key, mode: "insensitive" as const } },
            { location: { contains: key, mode: "insensitive" as const } },
          ]),
        },
        select: { id: true, name: true },
      })
    : [];
  const marketIds = [...new Set(marketRows.map((m) => m.id))];
  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      AND: [
        ...(typeFilter?.typeFilterIds.length
          ? [
              {
                OR: [
                  { livestockTypeId: { in: typeFilter.typeFilterIds } },
                  ...typeFilter.typeNeedles.map((needle) => ({
                    category: {
                      contains: needle,
                      mode: "insensitive" as const,
                    },
                  })),
                ],
              },
            ]
          : []),
        {
          OR: [
            ...(marketIds.length
              ? [
                  { marketId: { in: marketIds } },
                  { broker: { marketId: { in: marketIds } } },
                  {
                    broker: {
                      assignedMarkets: {
                        some: { marketId: { in: marketIds } },
                      },
                    },
                  },
                ]
              : []),
            ...marketKeys.flatMap((key) => [
              {
                market: {
                  name: { contains: key, mode: "insensitive" as const },
                },
              },
              {
                marketLocation: {
                  contains: key,
                  mode: "insensitive" as const,
                },
              },
              {
                broker: {
                  location: {
                    contains: key,
                    mode: "insensitive" as const,
                  },
                },
              },
            ]),
          ],
        },
        ...(from || to
          ? [
              {
                dateRecorded: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              },
            ]
          : []),
      ],
    },
    include: { livestockType: true },
    orderBy: { dateRecorded: "desc" },
    take: 2000,
  });

  const byKey = new Map<string, ComparePriceCell>();
  for (const r of rows) {
    const season = seasonFromCategoryLabel(r.category);
    if (seasonFilter && season !== seasonFilter) continue;
    const type = livestockLabel(
      r.livestockType?.name || r.category || r.animalType,
      r.livestockType?.nameSomali
    );
    const age = (r.ageClass || "").trim() || "—";
    const className = season === "sugunto" ? "Sugunto" : "Birimo";
    const key = `${type}|${age}|${className}`.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.set(key, {
      type,
      age,
      className,
      price: money(r.price),
      date: mogadishuYmd(r.dateRecorded),
    });
  }

  return {
    label: marketDisplay(marketRows[0]?.name || marketQ, marketQ),
    byKey,
  };
}

async function reportCompareTwoMarkets(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const marketA = (filters.marketName || "").trim();
  const marketB = (filters.marketNameB || "").trim();
  if (!marketA || !marketB) {
    throw new Error("Please select two markets to compare.");
  }
  if (marketA.toLowerCase() === marketB.toLowerCase()) {
    throw new Error("Please select two different markets.");
  }
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const typeFilter = await resolveLivestockTypeFilter(filters.livestockTypeId);
  const seasonFilter =
    filters.livestockSeason === "sugunto" || filters.livestockSeason === "birimo"
      ? filters.livestockSeason
      : null;
  const classLabel = seasonFilter === "sugunto" ? "Sugunto" : seasonFilter === "birimo" ? "Birimo" : "Birimo + Sugunto";
  const [left, right] = await Promise.all([
    latestPricesForMarket(marketA, from, to, typeFilter, seasonFilter),
    latestPricesForMarket(marketB, from, to, typeFilter, seasonFilter),
  ]);

  const keys = [...new Set([...left.byKey.keys(), ...right.byKey.keys()])].sort();
  const rows: AdvancedReportRow[] = keys.map((key) => {
    const a = left.byKey.get(key);
    const b = right.byKey.get(key);
    const p1 = a?.price;
    const p2 = b?.price;
    return {
      type: a?.type || b?.type || "—",
      className: a?.className || b?.className || "—",
      age: a?.age || b?.age || "—",
      priceA: p1 == null ? "—" : p1,
      priceB: p2 == null ? "—" : p2,
      difference:
        p1 == null || p2 == null ? "—" : Math.round((p2 - p1) * 100) / 100,
      dateA: a?.date || "—",
      dateB: b?.date || "—",
    };
  });

  const leftName =
    livestockMarketDisplayName(marketA, "so") ||
    livestockMarketDisplayName(left.label, "so") ||
    marketA;
  const rightName =
    livestockMarketDisplayName(marketB, "so") ||
    livestockMarketDisplayName(right.label, "so") ||
    marketB;

  return {
    reportType: "compare_two_markets",
    title: titleFor("compare_two_markets", {
      ...filters,
      marketName: leftName,
      marketNameB: rightName,
      livestockTypeName: typeFilter.typeLabel,
    }),
    subtitle: `Type: ${typeFilter.typeLabel} · ${classLabel} · ${leftName} vs ${rightName}${from ? ` · From ${filters.dateFrom}` : ""}${to ? ` · To ${filters.dateTo}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "type", label: "Type" },
      { key: "className", label: "Birimo / Sugunto" },
      { key: "age", label: "Age" },
      { key: "priceA", label: `${leftName} (USD)` },
      { key: "priceB", label: `${rightName} (USD)` },
      { key: "difference", label: "Difference (Market 2 − Market 1)" },
      { key: "dateA", label: `${leftName} date` },
      { key: "dateB", label: `${rightName} date` },
    ],
    rows,
    summary: `${rows.length} age group(s) compared`,
  };
}

async function latestUtilityRateForCompany(
  kind: "water" | "electricity",
  companyQ: string,
  from: Date | null,
  to: Date | null
): Promise<{
  provider: string;
  rate: number;
  type: string;
  location: string;
  status: string;
  date: string;
} | null> {
  const dateWhere =
    from || to
      ? {
          dateRecorded: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  if (kind === "water") {
    const live = await prisma.waterPrice.findMany({
      where: {
        providerName: { contains: companyQ, mode: "insensitive" },
        ...dateWhere,
      },
      orderBy: { dateRecorded: "desc" },
      take: 1,
    });
    if (live[0]) {
      return {
        provider: live[0].providerName,
        rate: money(live[0].pricePerUnit),
        type: live[0].waterType,
        location: live[0].location,
        status: live[0].status,
        date: mogadishuYmd(live[0].dateRecorded),
      };
    }
  } else {
    const live = await prisma.electricityPrice.findMany({
      where: {
        providerName: { contains: companyQ, mode: "insensitive" },
        ...dateWhere,
      },
      orderBy: { dateRecorded: "desc" },
      take: 1,
    });
    if (live[0]) {
      return {
        provider: live[0].providerName,
        rate: money(live[0].pricePerKwh),
        type: live[0].serviceType,
        location: live[0].location,
        status: live[0].status,
        date: mogadishuYmd(live[0].dateRecorded),
      };
    }
  }

  const catalog = await catalogCurrentUtilityRates(kind, companyQ);
  const hit = catalog[0];
  if (!hit) return null;
  return {
    provider: hit.provider,
    rate: hit.rate,
    type: hit.type,
    location: hit.location,
    status: hit.status,
    date: hit.date,
  };
}

async function reportCompareTwoCompanies(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const a = (filters.companyName || "").trim();
  const b = (filters.companyNameB || "").trim();
  if (!a || !b) {
    throw new Error("Please select two companies to compare.");
  }
  if (a.toLowerCase() === b.toLowerCase()) {
    throw new Error("Please select two different companies.");
  }
  const kind = filters.utilityKind === "electricity" ? "electricity" : "water";
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const [left, right] = await Promise.all([
    latestUtilityRateForCompany(kind, a, from, to),
    latestUtilityRateForCompany(kind, b, from, to),
  ]);
  const p1 = left?.rate;
  const p2 = right?.rate;
  const unit = kind === "water" ? "m³" : "kWh";
  const rows: AdvancedReportRow[] = [
    {
      type: left?.type || right?.type || (kind === "water" ? "WATER" : "ELECTRICITY"),
      rateA: p1 == null ? "—" : p1,
      rateB: p2 == null ? "—" : p2,
      difference:
        p1 == null || p2 == null ? "—" : Math.round((p2 - p1) * 10000) / 10000,
      dateA: left?.date || "—",
      dateB: right?.date || "—",
      statusA: left?.status || "—",
      statusB: right?.status || "—",
    },
  ];
  const leftName = left?.provider || a;
  const rightName = right?.provider || b;

  return {
    reportType: "compare_two_companies",
    title: titleFor("compare_two_companies", {
      ...filters,
      companyName: leftName,
      companyNameB: rightName,
    }),
    subtitle: `${kind === "water" ? "Water" : "Electricity"} · ${leftName} vs ${rightName}${from ? ` · From ${filters.dateFrom}` : ""}${to ? ` · To ${filters.dateTo}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "type", label: kind === "water" ? "Water type" : "Service type" },
      { key: "rateA", label: `${leftName} ($/${unit})` },
      { key: "rateB", label: `${rightName} ($/${unit})` },
      { key: "difference", label: "Difference (Company 2 − Company 1)" },
      { key: "dateA", label: `${leftName} date` },
      { key: "dateB", label: `${rightName} date` },
      { key: "statusA", label: `${leftName} status` },
      { key: "statusB", label: `${rightName} status` },
    ],
    rows,
    summary:
      p1 == null && p2 == null
        ? "No rates found for these companies in this range."
        : "Latest rate compared for each company",
  };
}

async function reportLivestockPriceTrend(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  if (!from || !to) {
    throw new Error("Please enter both From date and To date.");
  }
  const typeFilter = await resolveLivestockTypeFilter(filters.livestockTypeId);
  const marketQ = (filters.marketName || "").trim();
  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      dateRecorded: { gte: from, lte: to },
      ...(typeFilter.typeFilterIds.length
        ? {
            OR: [
              { livestockTypeId: { in: typeFilter.typeFilterIds } },
              ...typeFilter.typeNeedles.map((needle) => ({
                category: { contains: needle, mode: "insensitive" as const },
              })),
            ],
          }
        : {}),
      ...(marketQ
        ? {
            OR: [
              { marketLocation: { contains: marketQ, mode: "insensitive" } },
              { market: { name: { contains: marketQ, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      livestockType: true,
      livestockCategory: true,
      market: true,
    },
    orderBy: { dateRecorded: "asc" },
    take: 8000,
  });

  const buckets = new Map<
    string,
    { sum: number; min: number; max: number; count: number }
  >();
  for (const r of rows) {
    const month = mogadishuYmd(r.dateRecorded).slice(0, 7);
    const price = money(r.price);
    const cur = buckets.get(month) || {
      sum: 0,
      min: price,
      max: price,
      count: 0,
    };
    cur.sum += price;
    cur.min = Math.min(cur.min, price);
    cur.max = Math.max(cur.max, price);
    cur.count += 1;
    buckets.set(month, cur);
  }

  const out: AdvancedReportRow[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      average: Math.round((b.sum / b.count) * 100) / 100,
      min: b.min,
      max: b.max,
      count: b.count,
    }));

  return {
    reportType: "livestock_price_trend",
    title: titleFor("livestock_price_trend", filters),
    subtitle: `${typeFilter.typeLabel}${marketQ ? ` · ${marketQ}` : " · All markets"} · ${filters.dateFrom} – ${filters.dateTo}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "month", label: "Month" },
      { key: "average", label: "Average (USD)" },
      { key: "min", label: "Min (USD)" },
      { key: "max", label: "Max (USD)" },
      { key: "count", label: "Records" },
    ],
    rows: out,
    summary: `${out.length} month(s) · ${rows.length} price record(s)`,
  };
}

async function reportPriceApprovals(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  if (!from || !to) {
    throw new Error("Please enter both From date and To date.");
  }
  const status = filters.approvalStatus || null;
  const sector = (filters.sector || "all").toLowerCase();
  const dateWhere = { dateRecorded: { gte: from, lte: to } };
  const statusWhere = status ? { status } : {};

  const fetchLivestock = sector === "all" || sector === "livestock";
  const fetchWater = sector === "all" || sector === "water";
  const fetchElectricity = sector === "all" || sector === "electricity";

  const [livestock, water, electricity] = await Promise.all([
    fetchLivestock
      ? prisma.livestockPrice.findMany({
          where: { deletedAt: null, ...dateWhere, ...statusWhere },
          include: {
            livestockType: true,
            market: true,
            broker: true,
          },
          orderBy: { dateRecorded: "desc" },
          take: 2000,
        })
      : Promise.resolve([]),
    fetchWater
      ? prisma.waterPrice.findMany({
          where: { ...dateWhere, ...statusWhere },
          orderBy: { dateRecorded: "desc" },
          take: 2000,
        })
      : Promise.resolve([]),
    fetchElectricity
      ? prisma.electricityPrice.findMany({
          where: { ...dateWhere, ...statusWhere },
          orderBy: { dateRecorded: "desc" },
          take: 2000,
        })
      : Promise.resolve([]),
  ]);

  const out: AdvancedReportRow[] = [
    ...livestock.map((r) => ({
      sector: "Livestock",
      name: livestockLabel(r.livestockType?.name || r.category, r.livestockType?.nameSomali),
      detail: r.broker?.name || marketDisplay(r.market?.name, r.marketLocation),
      price: money(r.price),
      status: r.status,
      date: mogadishuYmd(r.dateRecorded),
      reason: r.rejectionReason || "—",
    })),
    ...water.map((r) => ({
      sector: "Water",
      name: r.providerName,
      detail: r.location,
      price: money(r.pricePerUnit),
      status: r.status,
      date: mogadishuYmd(r.dateRecorded),
      reason: r.rejectionReason || "—",
    })),
    ...electricity.map((r) => ({
      sector: "Electricity",
      name: r.providerName,
      detail: r.location,
      price: money(r.pricePerKwh),
      status: r.status,
      date: mogadishuYmd(r.dateRecorded),
      reason: r.rejectionReason || "—",
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const sectorLabel =
    sector === "livestock"
      ? "Livestock"
      : sector === "water"
        ? "Water"
        : sector === "electricity"
          ? "Electricity"
          : "All sectors";

  return {
    reportType: "price_approvals",
    title: titleFor("price_approvals", filters),
    subtitle: `${sectorLabel} · ${status || "All statuses"} · ${filters.dateFrom} – ${filters.dateTo}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "sector", label: "Sector" },
      { key: "name", label: "Name" },
      { key: "detail", label: "Broker / Location" },
      { key: "price", label: "Price (USD)" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
      { key: "reason", label: "Rejection reason" },
    ],
    rows: out,
    summary: `${out.length} submission(s)`,
  };
}

async function reportBrokerActivity(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  if (!from || !to) {
    throw new Error("Please enter both From date and To date.");
  }
  const marketQ = (filters.marketName || "").trim();
  const grouped = await prisma.livestockPrice.groupBy({
    by: ["brokerId", "status"],
    where: {
      deletedAt: null,
      brokerId: { not: null },
      status: { in: ["PENDING", "APPROVED", "REJECTED"] },
      dateRecorded: { gte: from, lte: to },
      ...(marketQ
        ? {
            OR: [
              { marketLocation: { contains: marketQ, mode: "insensitive" } },
              { market: { name: { contains: marketQ, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    _count: { _all: true },
  });
  const brokerIds = [
    ...new Set(grouped.map((g) => g.brokerId).filter((id): id is number => id != null)),
  ];
  const brokers = brokerIds.length
    ? await prisma.livestockBroker.findMany({
        where: { id: { in: brokerIds } },
        include: { market: { select: { name: true } } },
      })
    : [];
  const byId = new Map(brokers.map((b) => [b.id, b]));
  const totals = new Map<
    number,
    { pending: number; approved: number; rejected: number; total: number }
  >();
  for (const g of grouped) {
    if (g.brokerId == null) continue;
    const cur = totals.get(g.brokerId) || {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };
    const n = g._count._all;
    if (g.status === "PENDING") cur.pending += n;
    else if (g.status === "APPROVED") cur.approved += n;
    else if (g.status === "REJECTED") cur.rejected += n;
    cur.total += n;
    totals.set(g.brokerId, cur);
  }

  const rows: AdvancedReportRow[] = [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, c]) => {
      const broker = byId.get(id);
      return {
        broker: broker?.name || `#${id}`,
        market: broker?.market?.name || broker?.location || "—",
        pending: c.pending,
        approved: c.approved,
        rejected: c.rejected,
        total: c.total,
      };
    });

  return {
    reportType: "broker_activity",
    title: titleFor("broker_activity", filters),
    subtitle: `${marketQ || "All markets"} · ${filters.dateFrom} – ${filters.dateTo}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "broker", label: "Broker" },
      { key: "market", label: "Market" },
      { key: "pending", label: "Pending" },
      { key: "approved", label: "Approved" },
      { key: "rejected", label: "Rejected" },
      { key: "total", label: "Total" },
    ],
    rows,
    summary: `${rows.length} broker(s) submitted prices`,
  };
}

async function reportInactiveRegistrations(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const kind: RegisteredKind = filters.registeredKind || "both";
  const out: AdvancedReportRow[] = [];

  if (kind === "companies" || kind === "both") {
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        status: { not: "ACTIVE" },
      },
      orderBy: { updatedAt: "desc" },
    });
    for (const c of companies) {
      out.push({
        kind: "Company",
        name: c.name,
        email: c.email || "—",
        phone: c.phone || "—",
        type: c.type,
        accountStatus: c.status,
        approval: c.status,
        createdAt: mogadishuYmd(c.createdAt),
      });
    }
  }
  if (kind === "brokers" || kind === "both") {
    const brokers = await prisma.livestockBroker.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: { not: "ACTIVE" } },
          { approvalStatus: { not: "APPROVED" } },
        ],
      },
      include: { market: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    for (const b of brokers) {
      out.push({
        kind: "Broker",
        name: b.name,
        email: b.email || "—",
        phone: b.phone || "—",
        type: b.market?.name || b.code || "BROKER",
        accountStatus: b.status,
        approval: b.approvalStatus,
        createdAt: mogadishuYmd(b.createdAt),
      });
    }
  }

  return {
    reportType: "inactive_registrations",
    title: titleFor("inactive_registrations", filters),
    subtitle: kind,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "kind", label: "Kind" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "type", label: "Type / Market" },
      { key: "accountStatus", label: "Account" },
      { key: "approval", label: "Approval" },
      { key: "createdAt", label: "Registered" },
    ],
    rows: out,
    summary: `${out.length} inactive registration(s)`,
  };
}

async function reportAllMarkets(): Promise<AdvancedReportResult> {
  const rows = await prisma.market.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { companies: true, brokers: true } },
    },
    orderBy: [{ marketType: "asc" }, { name: "asc" }],
  });
  return {
    reportType: "all_markets",
    title: titleFor("all_markets", { reportType: "all_markets" }),
    subtitle: "Markets currently in the database",
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "name", label: "Market" },
      { key: "type", label: "Type" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "companies", label: "Companies" },
      { key: "brokers", label: "Brokers" },
      { key: "createdAt", label: "Created" },
    ],
    rows: rows.map((m) => ({
      name: m.name,
      type: m.marketType,
      location: m.location || "—",
      status: m.status,
      companies: m._count.companies,
      brokers: m._count.brokers,
      createdAt: mogadishuYmd(m.createdAt),
    })),
    summary: `${rows.length} market(s)`,
  };
}

async function reportAllUtilityPrices(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  const kind = filters.utilityKind;
  const from = parseDay(filters.dateFrom, false);
  const to = parseDay(filters.dateTo, true);
  const dateWhere =
    from || to
      ? {
          dateRecorded: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const out: AdvancedReportRow[] = [];
  if (kind !== "electricity") {
    const water = await prisma.waterPrice.findMany({
      where: dateWhere,
      orderBy: { dateRecorded: "desc" },
      take: 3000,
    });
    for (const r of water) {
      out.push({
        sector: "Water",
        company: r.providerName,
        location: r.location,
        rate: money(r.pricePerUnit),
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
      });
    }
  }
  if (kind !== "water") {
    const elec = await prisma.electricityPrice.findMany({
      where: dateWhere,
      orderBy: { dateRecorded: "desc" },
      take: 3000,
    });
    for (const r of elec) {
      out.push({
        sector: "Electricity",
        company: r.providerName,
        location: r.location,
        rate: money(r.pricePerKwh),
        status: r.status,
        date: mogadishuYmd(r.dateRecorded),
      });
    }
  }
  out.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    reportType: "all_utility_prices",
    title: titleFor("all_utility_prices", filters),
    subtitle: `${kind ? (kind === "water" ? "Water" : "Electricity") : "Water and electricity"} rates in the database${from || to ? ` · ${filters.dateFrom || "Start"} to ${filters.dateTo || "End"}` : ""}`,
    generatedAt: new Date().toISOString(),
    systemName: SYSTEM_NAME,
    systemShort: SYSTEM_SHORT,
    columns: [
      { key: "sector", label: "Sector" },
      { key: "company", label: "Company" },
      { key: "location", label: "Location" },
      { key: "rate", label: "Rate (USD)" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
    ],
    rows: out,
    summary: `${out.length} rate record(s)`,
  };
}

export async function generateAdvancedReport(
  filters: AdvancedReportFilters
): Promise<AdvancedReportResult> {
  switch (filters.reportType) {
    case "livestock_type_market":
    case "hal_camel_market":
      return reportLivestockTypeMarket(filters);
    case "utility_highest_rate":
      return reportUtilityHighest(filters);
    case "livestock_price_range":
      return reportLivestockPriceRange(filters);
    case "all_companies":
      return reportAllCompanies();
    case "company_info_documents":
      return reportCompanyInfoDocuments(filters);
    case "all_brokers":
      return reportAllBrokers();
    case "all_livestock":
      return reportAllLivestock();
    case "companies_by_rate":
      return reportCompaniesByRate(filters);
    case "registered_in_year":
      return reportRegisteredInYear(filters);
    case "all_users":
      return reportAllUsers();
    case "all_subscriptions":
      return reportAllSubscriptions(filters);
    case "all_categories":
      return reportAllCategories(filters);
    case "broker_market_goats":
      return reportBrokerMarketGoats(filters);
    case "compare_two_markets":
      return reportCompareTwoMarkets(filters);
    case "compare_two_companies":
      return reportCompareTwoCompanies(filters);
    case "livestock_price_trend":
      return reportLivestockPriceTrend(filters);
    case "price_approvals":
      return reportPriceApprovals(filters);
    case "broker_activity":
      return reportBrokerActivity(filters);
    case "inactive_registrations":
      return reportInactiveRegistrations(filters);
    case "all_markets":
      return reportAllMarkets();
    case "all_utility_prices":
      return reportAllUtilityPrices(filters);
    default:
      throw new Error("Unknown report type");
  }
}

export function advancedReportToCsv(report: AdvancedReportResult): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = report.columns.map((c) => c.label);
  const lines = [
    headers.map(esc).join(","),
    ...report.rows.map((row) =>
      report.columns.map((c) => esc(row[c.key])).join(",")
    ),
  ];
  return lines.join("\n");
}
