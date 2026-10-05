import { NextResponse } from "next/server";
import {
  canManageCompany,
  getCurrentUser,
  isApproved,
  isScopedCompanyAdmin,
  isSuperAdmin,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import {
  getCompanyProfileOverride,
  overrideHas,
  overrideString,
  upsertCompanyProfileOverride,
} from "@/lib/company-profile-store";
import {
  companySectorForSlug,
  providerMetaForSlug,
} from "@/lib/company-scope-server";
import { phoneWriteError } from "@/lib/register-validation";
import {
  cleanElectricityTierRateMap,
  yearlyRateHistoryFromTiers,
  type ElectricityTierRateMap,
} from "@/lib/electricity-data";
import {
  tariffAdminYears,
  tariffFromYearForPlan,
  tariffHistoryYears,
  TARIFF_YEAR_END,
  TARIFF_YEAR_START,
} from "@/lib/tariff-years";
import { revalidateUtilityPublic } from "@/lib/revalidate-public";

function rateYears() {
  return tariffAdminYears();
}

function filterHistoryYears<T>(
  history: Partial<Record<number, T>> | null | undefined,
  years: number[]
): Partial<Record<number, T>> {
  const allowedYears = new Set(years);
  return Object.fromEntries(
    Object.entries(history ?? {}).filter(([year]) =>
      allowedYears.has(Number(year))
    )
  ) as Partial<Record<number, T>>;
}

function filterYearKeyedRecord(
  value: unknown,
  years: number[]
): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const allowedYears = new Set(years);
  return Object.fromEntries(
    Object.entries(value).filter(([year]) => allowedYears.has(Number(year)))
  );
}

function pickYearlyHistory(
  override: { yearlyRateHistory?: Partial<Record<number, number>> } | null,
  _meta: Record<string, unknown> | null
): Record<string, number> {
  // Admin dashboard: only saved company rates — never catalog/demo defaults.
  const years = rateYears();
  const fromOverride = override?.yearlyRateHistory;
  const out: Record<string, number> = {};
  for (const y of years) {
    const ov = Number(fromOverride?.[y] ?? 0);
    out[String(y)] = Number.isFinite(ov) && ov > 0 ? ov : 0;
  }
  return out;
}

function pickTierHistory(
  override: { tierRateHistory?: ElectricityTierRateMap } | null,
  _meta: Record<string, unknown> | null
): Record<string, { low: number; mid: number; high: number }> {
  // Admin dashboard: only rates the company saved — empty for new accounts.
  const cleaned = cleanElectricityTierRateMap(override?.tierRateHistory ?? null);
  const out: Record<string, { low: number; mid: number; high: number }> = {};
  for (const y of rateYears()) {
    const row = cleaned[y];
    if (row && (row.low > 0 || row.mid > 0 || row.high > 0)) {
      out[String(y)] = row;
    }
  }
  return out;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isApproved(user) || (!isScopedCompanyAdmin(user) && !isSuperAdmin(user))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const slug = resolveCompanyAdminSlug(user);
  if (!slug) {
    return NextResponse.json({ error: "No company assigned" }, { status: 400 });
  }

  const meta = (await providerMetaForSlug(slug)) as Record<string, unknown> | null;
  const override = await getCompanyProfileOverride(slug);
  const sector = await companySectorForSlug(slug);
  const m = (key: string) => (meta && key in meta ? meta[key] : "");

  let yearlyRateHistory = pickYearlyHistory(override, meta);
  let tierRateHistory =
    sector === "electricity" ? pickTierHistory(override, meta) : {};

  // Keep headline yearly rates aligned with low tier when electricity tiers exist.
  if (sector === "electricity") {
    for (const [year, rates] of Object.entries(tierRateHistory)) {
      if (rates.low > 0 && !(Number(yearlyRateHistory[year]) > 0)) {
        yearlyRateHistory[year] = rates.low;
      }
    }
  }

  // Free electricity/water: admin may only see/edit current-year rate (not Price History).
  let freeCurrentRateOnly = false;
  let visibleYears = rateYears();
  const canViewAllPlanHistory = isSuperAdmin(user);
  if (
    (sector === "electricity" || sector === "water") &&
    !canViewAllPlanHistory
  ) {
    const { getAccountPlanTier, getPlanTierForCompanySlug } = await import("@/lib/subscriptions");
    const access = user.companyId
      ? await getAccountPlanTier({ companyId: user.companyId })
      : null;
    const tier =
      access?.tier ??
      (slug ? await getPlanTierForCompanySlug(slug) : "free");
    const fromYear = tariffFromYearForPlan(
      access?.price ?? (tier === "free" ? 0 : 1),
      access?.durationDays ?? (tier === "free" ? 30 : 180)
    );
    visibleYears = rateYears().filter((year) => year >= fromYear);
    yearlyRateHistory = Object.fromEntries(
      Object.entries(yearlyRateHistory).filter(([year]) => Number(year) >= fromYear)
    );
    if (sector === "electricity") {
      tierRateHistory = Object.fromEntries(
        Object.entries(tierRateHistory).filter(([year]) => Number(year) >= fromYear)
      ) as typeof tierRateHistory;
    }
    if (tier === "free" || fromYear >= TARIFF_YEAR_END) {
      freeCurrentRateOnly = true;
      const y = String(TARIFF_YEAR_END);
      yearlyRateHistory = {
        [y]: Number(yearlyRateHistory[y] ?? 0) || 0,
      };
      if (sector === "electricity") {
        const row = (
          tierRateHistory as Record<
            string,
            { low: number; mid: number; high: number }
          >
        )[y];
        tierRateHistory = row ? { [y]: row } : {};
      } else {
        tierRateHistory = {};
      }
    }
  }

  const visibleOverride =
    override && !canViewAllPlanHistory && (sector === "electricity" || sector === "water")
      ? {
          ...override,
          yearlyRateHistory: filterHistoryYears(
            override.yearlyRateHistory,
            visibleYears
          ),
          tierRateHistory: filterHistoryYears(
            override.tierRateHistory,
            visibleYears
          ),
        }
      : override;
  const visibleMeta =
    meta && !canViewAllPlanHistory && (sector === "electricity" || sector === "water")
      ? {
          ...meta,
          yearlyRateHistory: filterYearKeyedRecord(
            meta.yearlyRateHistory,
            visibleYears
          ),
          tierRateHistory: filterYearKeyedRecord(
            meta.tierRateHistory,
            visibleYears
          ),
        }
      : meta;

  return NextResponse.json({
    slug,
    sector,
    meta: visibleMeta,
    override: visibleOverride,
    rateYears:
      sector === "electricity" || sector === "water"
        ? visibleYears
        : rateYears(),
    profile: {
      phone: overrideString(override, "phone", m("phone")),
      altPhone: overrideString(
        override,
        "altPhone",
        m("altPhone") || m("alternatePhone")
      ),
      email: overrideString(override, "email", m("email")),
      website: overrideString(override, "website", m("website")),
      address: overrideString(override, "address", m("address")),
      addressLabel: overrideString(
        override,
        "addressLabel",
        m("addressLabel") || "Head Office"
      ),
      location: overrideString(override, "location", m("location") || "Mogadishu"),
      businessHours: overrideString(override, "businessHours", m("businessHours")),
      waterSource: overrideString(override, "waterSource", m("waterSource")),
      supplyType: overrideString(
        override,
        "supplyType",
        m("supplyType") || m("pillLabel")
      ),
      callCenter: overrideString(override, "callCenter", m("callCenter")),
      facebook: overrideString(override, "facebook", m("facebook")),
      tagline: overrideString(override, "tagline", m("tagline")),
      description: overrideString(override, "description", m("description")),
      infoTitle: overrideString(override, "infoTitle", m("infoTitle")),
      infoBrief: overrideString(override, "infoBrief", m("infoBrief")),
      infoPoints: overrideHas(override, "infoPoints")
        ? override?.infoPoints ?? []
        : meta && Array.isArray(meta.infoPoints)
          ? meta.infoPoints
          : [],
      currentPrice: overrideString(override, "currentPrice", ""),
      somali: overrideString(override, "somali", m("somali")),
      providerLabel: overrideString(
        override,
        "providerLabel",
        m("acronym") || m("cardTitle")
      ),
      companyName: overrideString(
        override,
        "companyName",
        m("name") || m("cardLabel")
      ),
      image: overrideString(override, "image", m("image")),
      categoriesTitle: overrideString(override, "categoriesTitle", ""),
      categoriesSubtitle: overrideString(override, "categoriesSubtitle", ""),
      typesTitle: overrideString(override, "typesTitle", ""),
      typesSubtitle: overrideString(override, "typesSubtitle", ""),
      snapshotTitle: overrideString(override, "snapshotTitle", ""),
      snapshotSubtitle: overrideString(override, "snapshotSubtitle", ""),
      trendsTitle: overrideString(override, "trendsTitle", ""),
      trendsSubtitle: overrideString(override, "trendsSubtitle", ""),
      ratesNote: overrideString(override, "ratesNote", ""),
      serviceAreas: overrideString(override, "serviceAreas", m("serviceAreas")),
      calculatorTitle: overrideString(override, "calculatorTitle", ""),
      calculatorSubtitle: overrideString(override, "calculatorSubtitle", ""),
      calculatorEmptyHint: overrideString(override, "calculatorEmptyHint", ""),
      heroEyebrow: overrideString(override, "heroEyebrow", ""),
      yearlyRateHistory,
      tierRateHistory,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isApproved(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const slug = resolveCompanyAdminSlug(user);
  if (!slug || !canManageCompany({ ...user, companySlug: slug }, slug)) {
    return NextResponse.json(
      { error: "You can only edit your own company profile" },
      { status: 403 }
    );
  }

  const sector = await companySectorForSlug(slug);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Parameters<typeof upsertCompanyProfileOverride>[1] = {};

  const strKeys = [
    "phone",
    "phoneHint",
    "altPhone",
    "email",
    "website",
    "address",
    "addressLabel",
    "location",
    "businessHours",
    "waterSource",
    "supplyType",
    "callCenter",
    "facebook",
    "tagline",
    "description",
    "infoTitle",
    "infoBrief",
    "currentPrice",
    "somali",
    "providerLabel",
    "companyName",
    "image",
    "categoriesTitle",
    "categoriesSubtitle",
    "typesTitle",
    "typesSubtitle",
    "snapshotTitle",
    "snapshotSubtitle",
    "trendsTitle",
    "trendsSubtitle",
    "ratesNote",
    "serviceAreas",
    "calculatorTitle",
    "calculatorSubtitle",
    "calculatorEmptyHint",
    "heroEyebrow",
  ] as const;

  for (const key of strKeys) {
    if (typeof body[key] === "string") {
      patch[key] = body[key] as string;
    }
  }

  if (typeof body.phone === "string") {
    const phoneErr = phoneWriteError(body.phone, false);
    if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
  }
  if (typeof body.altPhone === "string") {
    const altErr = phoneWriteError(body.altPhone, false);
    if (altErr) return NextResponse.json({ error: altErr }, { status: 400 });
  }

  if (Array.isArray(body.infoPoints)) {
    patch.infoPoints = body.infoPoints.filter(
      (p): p is string => typeof p === "string"
    );
  }

  const existingOverride = await getCompanyProfileOverride(slug);
  const editableYear = TARIFF_YEAR_END;
  const historyYears = tariffHistoryYears();
  const canRewriteHistory = isSuperAdmin(user);

  // Free plan: current-year rate only. History needs standard+; hero/contact/reports = premium
  // (except utility Page Hero — available on every electricity/water plan).
  let planTier: import("@/lib/pricing-plans").CompanyPlanTier | null = null;
  let historyFromYear = TARIFF_YEAR_START;
  if (!canRewriteHistory) {
    const { getAccountPlanTier, getPlanTierForCompanySlug } = await import("@/lib/subscriptions");
    if (user.companyId) {
      const access = await getAccountPlanTier({ companyId: user.companyId });
      planTier = access.tier ?? "free";
      historyFromYear = tariffFromYearForPlan(access.price, access.durationDays);
    } else if (slug) {
      planTier = await getPlanTierForCompanySlug(slug);
      historyFromYear =
        planTier === "free" ? TARIFF_YEAR_END : TARIFF_YEAR_START;
    }
  }

  const historyAllowed =
    canRewriteHistory || planTier === "standard" || planTier === "premium";
  const profileExtrasAllowed = canRewriteHistory || planTier === "premium";
  /** Utility Page Hero fields — unlocked for all electricity/water plan tiers. */
  const utilityHeroKeys = new Set([
    "heroEyebrow",
    "tagline",
    "description",
  ]);
  const isUtilitySector = sector === "electricity" || sector === "water";

  if (!profileExtrasAllowed) {
    const premiumOnlyKeys = new Set([
      "heroEyebrow",
      "tagline",
      "description",
      "infoTitle",
      "infoBrief",
      "categoriesTitle",
      "categoriesSubtitle",
      "typesTitle",
      "typesSubtitle",
      "snapshotTitle",
      "snapshotSubtitle",
      "trendsTitle",
      "trendsSubtitle",
      "calculatorTitle",
      "calculatorSubtitle",
      "calculatorEmptyHint",
    ]);
    for (const key of premiumOnlyKeys) {
      if (isUtilitySector && utilityHeroKeys.has(key)) continue;
      delete (patch as Record<string, unknown>)[key];
    }
    if (Array.isArray(body.infoPoints) && !profileExtrasAllowed) {
      delete (patch as Record<string, unknown>).infoPoints;
    }
  }

  if (historyAllowed && historyFromYear > TARIFF_YEAR_START) {
    const keep = (year: string) => Number(year) >= historyFromYear;
    if (body.yearlyRateHistory && typeof body.yearlyRateHistory === "object") {
      body.yearlyRateHistory = Object.fromEntries(
        Object.entries(body.yearlyRateHistory as Record<string, unknown>).filter(
          ([year]) => keep(year)
        )
      );
    }
    if (body.tierRateHistory && typeof body.tierRateHistory === "object") {
      body.tierRateHistory = Object.fromEntries(
        Object.entries(body.tierRateHistory as Record<string, unknown>).filter(
          ([year]) => keep(year)
        )
      );
    }
  }

  if (!historyAllowed) {
    // Free: only allow writing the current tariff year (Update Price / current rate).
    if (body.yearlyRateHistory && typeof body.yearlyRateHistory === "object") {
      const incoming = body.yearlyRateHistory as Record<string, unknown>;
      const onlyCurrent: Record<string, unknown> = {};
      const v = Number(incoming[String(editableYear)] ?? incoming[editableYear]);
      if (Number.isFinite(v) && v > 0) onlyCurrent[String(editableYear)] = v;
      body.yearlyRateHistory = onlyCurrent;
    }
    if (
      sector === "electricity" &&
      body.tierRateHistory &&
      typeof body.tierRateHistory === "object"
    ) {
      const incoming = body.tierRateHistory as Record<string, unknown>;
      const row = incoming[String(editableYear)] ?? incoming[editableYear];
      body.tierRateHistory = row ? { [String(editableYear)]: row } : {};
    }
  }

  function yearIsLocked(year: number): boolean {
    if (canRewriteHistory || year === editableYear) return false;
    if (!historyAllowed) return true;
    const existingYearly = Number(existingOverride?.yearlyRateHistory?.[year] ?? 0);
    if (Number.isFinite(existingYearly) && existingYearly > 0) return true;
    const existingTier = existingOverride?.tierRateHistory?.[year];
    return Boolean(
      existingTier &&
        Number(existingTier.low) > 0 &&
        Number(existingTier.mid) > 0 &&
        Number(existingTier.high) > 0
    );
  }

  if (body.yearlyRateHistory && typeof body.yearlyRateHistory === "object") {
    const yearlyRateHistory: Partial<Record<number, number>> = {
      ...(existingOverride?.yearlyRateHistory ?? {}),
    };
    const incoming = body.yearlyRateHistory as Record<string, unknown>;
    for (const year of [editableYear, ...historyYears]) {
      if (yearIsLocked(year)) continue;
      const value = Number(incoming[String(year)] ?? incoming[year]);
      if (Number.isFinite(value) && value > 0) {
        yearlyRateHistory[year] = value;
      }
    }
    patch.yearlyRateHistory = yearlyRateHistory;
  }

  if (
    sector === "electricity" &&
    body.tierRateHistory &&
    typeof body.tierRateHistory === "object"
  ) {
    const existingTiers = existingOverride?.tierRateHistory ?? {};
    const incomingTiers = cleanElectricityTierRateMap(body.tierRateHistory);
    const tierRateHistory: ElectricityTierRateMap = { ...existingTiers };
    const newlyWritten: ElectricityTierRateMap = {};
    for (const year of [editableYear, ...historyYears]) {
      if (yearIsLocked(year)) continue;
      const currentRow = incomingTiers[year];
      if (currentRow) {
        tierRateHistory[year] = currentRow;
        newlyWritten[year] = currentRow;
      }
    }
    patch.tierRateHistory = tierRateHistory;
    const fromLow = yearlyRateHistoryFromTiers(newlyWritten);
    patch.yearlyRateHistory = {
      ...(existingOverride?.yearlyRateHistory ?? {}),
      ...(patch.yearlyRateHistory ?? {}),
      ...fromLow,
    };
  }

  const saved = await upsertCompanyProfileOverride(slug, patch);
  revalidateUtilityPublic();

  return NextResponse.json({ ok: true, override: saved });
}
