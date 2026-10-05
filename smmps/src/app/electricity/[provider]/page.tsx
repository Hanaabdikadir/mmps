import { notFound } from "next/navigation";
import { ElectricityProviderHero } from "@/components/electricity/ElectricityProviderHero";
import { ElectricityProviderContact } from "@/components/electricity/ElectricityProviderContact";
import { ElectricityProviderPriceCalculator } from "@/components/electricity/ElectricityProviderPriceCalculator";
import { ElectricityProviderRatesHistory } from "@/components/electricity/ElectricityProviderRatesHistory";
import {
  ELECTRICITY_PAGE_CARD_THEME,
  ELECTRICITY_PROVIDER_CARD_THEMES,
  ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY,
  mergeElectricityTierRateMap,
  usageTiersForYear,
  yearlyRateHistoryFromTiers,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";
import {
  applyProfileOverrideToMeta,
  getCompanyProfileOverride,
} from "@/lib/company-profile-store";
import {
  isPubliclyListedSlug,
  providerMetaForSlug,
} from "@/lib/company-scope-server";
import {
  aggregateYearlyAveragesFromPrices,
  mergeYearlyRateMaps,
  normalizeYearlyRateHistory,
} from "@/lib/electricity-analytics";
import { getElectricityPrices } from "@/lib/electricity-service";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { TARIFF_YEAR_END, tariffFromYearForPlan } from "@/lib/tariff-years";
import { ProviderBackButton } from "@/components/ui/ProviderBackButton";
import { getPlanWindowForCompanySlug } from "@/lib/subscriptions";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

async function resolveElectricityMeta(slug: string): Promise<ElectricityProviderMeta | null> {
  const meta = await providerMetaForSlug(slug);
  if (meta && "cardLabel" in meta) return meta as unknown as ElectricityProviderMeta;
  return null;
}

function currentYearRate(yearly: Partial<Record<number, number>>): number {
  const year = new Date().getFullYear();
  const normalized = normalizeYearlyRateHistory(yearly);
  const direct = normalized[year];
  if (direct && direct > 0) return direct;
  const values = Object.values(normalized).filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  return values.length ? values[values.length - 1]! : 0;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: slug } = await params;
  if (!(await isPubliclyListedSlug(slug))) return { title: "Electricity" };
  const meta = await resolveElectricityMeta(slug);
  if (!meta) return { title: "Electricity" };
  return {
    title: `${meta.somali} — Electricity`,
    description: `${meta.name} — prices, contact info, and price records for Mogadishu electricity.`,
  };
}

export default async function ElectricityProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: slug } = await params;
  if (!(await isPubliclyListedSlug(slug))) notFound();
  const meta = await resolveElectricityMeta(slug);
  if (!meta) notFound();

  const profile = await getCompanyProfileOverride(slug);
  const metaWithProfile = applyProfileOverrideToMeta(meta, profile);
  const planWindow = await getPlanWindowForCompanySlug(slug);
  const fromYear = tariffFromYearForPlan(planWindow.price, planWindow.durationDays);
  const currentOnly = fromYear >= TARIFF_YEAR_END;
  const { records: allRecords } = await getElectricityPrices(UTILITY_SERVICE_TYPE, {
    approvedOnly: true,
    take: 1000,
  });
  const needle = [
    metaWithProfile.name,
    metaWithProfile.acronym,
    metaWithProfile.cardTitle,
    metaWithProfile.somali,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  const records = allRecords.filter((r) => {
    const name = r.providerName.toLowerCase();
    return needle.some(
      (n) => name === n || name.includes(n) || n.includes(name)
    );
  });

  const tierRateHistory = mergeElectricityTierRateMap(
    profile?.tierRateHistory ?? metaWithProfile.tierRateHistory ?? null
  );

  /** Headline rates: profile + market rows; fill gaps from low (1–1,000) tier. */
  const yearlyRateHistory = mergeYearlyRateMaps(
    mergeYearlyRateMaps(
      profile?.yearlyRateHistory ?? {},
      aggregateYearlyAveragesFromPrices(records)
    ),
    yearlyRateHistoryFromTiers(tierRateHistory)
  );
  const providerForClient: Omit<ElectricityProviderMeta, "icon"> = {
    ...(({ icon: _icon, ...rest }) => rest)(metaWithProfile),
    yearlyRateHistory,
    tierRateHistory,
  };

  const serializedRecords = records.map((r) => ({
    ...r,
    dateRecorded:
      r.dateRecorded instanceof Date
        ? r.dateRecorded.toISOString()
        : String(r.dateRecorded),
  }));

  const calculatorRecords = serializedRecords.map((r) => ({
    id: r.id,
    serviceType: r.serviceType,
    pricePerKwh: r.pricePerKwh,
    dateRecorded: r.dateRecorded,
  }));

  const fallbackRatePerKwh =
    currentYearRate(yearlyRateHistory) ||
    currentYearRate(
      metaWithProfile.yearlyRateHistory &&
        Object.keys(metaWithProfile.yearlyRateHistory).length > 0
        ? metaWithProfile.yearlyRateHistory
        : ELECTRICITY_STANDARD_YEARLY_RATE_HISTORY
    );

  /** Calculator always uses current-year (2026) usage-tier tariffs from company PRICE HISTORY. */
  const calculatorUsageTiers = usageTiersForYear(
    tierRateHistory,
    TARIFF_YEAR_END
  );
  const calculatorFallbackRate =
    calculatorUsageTiers[0]?.ratePerKwh ?? fallbackRatePerKwh;

  return (
    <div className="livestock-mesh">
      <ElectricityProviderHero
        provider={providerForClient}
        recordCount={records.length}
      />

      <div className="page-shell mx-auto w-full max-w-7xl px-3 py-8 min-[360px]:px-4 sm:px-6 sm:py-10">
        <div className="electricity-provider-card-grid">
          <div id="calculate" className="provider-price-calculator-cell scroll-mt-28 flex h-full min-h-0 w-full flex-col">
            <ProviderBackButton />
            <ElectricityProviderPriceCalculator
              theme={{
                href: metaWithProfile.href,
                label:
                  metaWithProfile.acronym ||
                  metaWithProfile.cardTitle ||
                  metaWithProfile.name,
                sourceLabel: metaWithProfile.supplyType || "Grid Electricity",
                headerBg: ELECTRICITY_PROVIDER_CARD_THEMES.calculator.headerBg,
                cardBodyTint: metaWithProfile.cardBodyTint,
                accentText: metaWithProfile.accentText,
                accent: ELECTRICITY_PAGE_CARD_THEME.accent,
                accentBg: metaWithProfile.accentBg,
                cardBorder: ELECTRICITY_PROVIDER_CARD_THEMES.calculator.border,
              }}
              records={calculatorRecords}
              usageTiers={calculatorUsageTiers}
              fallbackRatePerKwh={calculatorFallbackRate}
            />
          </div>
          <div className="flex h-full min-h-0 w-full">
            <ElectricityProviderRatesHistory
              provider={providerForClient}
              records={serializedRecords as unknown as typeof records}
              currentOnly={currentOnly}
              fromYear={fromYear}
            />
          </div>
          <div className="flex h-full min-h-0 w-full">
            <ElectricityProviderContact provider={providerForClient} />
          </div>
        </div>
      </div>
    </div>
  );
}
