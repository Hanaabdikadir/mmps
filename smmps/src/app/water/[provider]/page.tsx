import { notFound } from "next/navigation";
import { WaterProviderHero } from "@/components/water/WaterProviderHero";
import { WaterProviderContact } from "@/components/water/WaterProviderContact";
import { WaterProviderRatesHistory } from "@/components/water/WaterProviderRatesHistory";
import { WaterProviderPriceCalculator } from "@/components/water/WaterProviderPriceCalculator";
import {
  BAWADCO_YEARLY_RATE_HISTORY,
  WATER_PROVIDER_CARD_THEMES,
  type WaterProviderMeta,
} from "@/lib/water-data";
import {
  isPubliclyListedSlug,
  providerMetaForSlug,
} from "@/lib/company-scope-server";
import { getRegisteredCompanyBySlug } from "@/lib/registered-companies-store";
import {
  applyProfileOverrideToMeta,
  getCompanyProfileOverride,
} from "@/lib/company-profile-store";
import {
  aggregateYearlyAveragesFromPrices,
  mergeYearlyRateMaps,
  normalizeYearlyRateHistory,
} from "@/lib/water-analytics";
import { getWaterPrices } from "@/lib/water-service";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { ProviderBackButton } from "@/components/ui/ProviderBackButton";
import { getPlanWindowForCompanySlug } from "@/lib/subscriptions";
import { tariffFromYearForPlan } from "@/lib/tariff-years";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

async function resolveWaterMeta(slug: string): Promise<WaterProviderMeta | null> {
  const meta = await providerMetaForSlug(slug);
  if (meta && "cardLabel" in meta) return meta as unknown as WaterProviderMeta;
  const registered = await getRegisteredCompanyBySlug(slug);
  if (registered?.sector === "Water") {
    const again = await providerMetaForSlug(slug);
    if (again && "cardLabel" in again) return again as unknown as WaterProviderMeta;
  }
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
  if (!(await isPubliclyListedSlug(slug))) return { title: "Water Supply" };
  const meta = await resolveWaterMeta(slug);
  if (!meta) return { title: "Water Supply" };
  return {
    title: `${meta.somali} — Water Supply`,
    description: `${meta.name} — prices, contact info, and live price records for Mogadishu water supply.`,
  };
}

export default async function WaterProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: slug } = await params;
  if (!(await isPubliclyListedSlug(slug))) notFound();
  const meta = await resolveWaterMeta(slug);
  if (!meta) notFound();

  const profile = await getCompanyProfileOverride(slug);
  const planWindow = await getPlanWindowForCompanySlug(slug);
  const fromYear = tariffFromYearForPlan(planWindow.price, planWindow.durationDays);
  const metaWithProfile = applyProfileOverrideToMeta(meta, profile);
  const { records: allRecords } = await getWaterPrices(UTILITY_SERVICE_TYPE, {
    approvedOnly: true,
    take: 1000,
  });
  const needle = [
    metaWithProfile.name,
    metaWithProfile.acronym,
    metaWithProfile.cardTitle,
    metaWithProfile.somali,
    metaWithProfile.companyName,
    meta.name,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  const records = allRecords.filter((r) => {
    const name = r.providerName.toLowerCase();
    return needle.some(
      (n) => name === n || name.includes(n) || n.includes(name)
    );
  });

  /** Tariff table: company profile (DB) + submitted market prices only — no static defaults. */
  const yearlyRateHistory = mergeYearlyRateMaps(
    profile?.yearlyRateHistory ?? {},
    aggregateYearlyAveragesFromPrices(records)
  );
  const providerForClient: Omit<WaterProviderMeta, "icon"> = {
    ...(({ icon: _icon, ...rest }) => rest)(metaWithProfile),
    yearlyRateHistory,
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
    waterType: r.waterType,
    pricePerUnit: r.pricePerUnit,
    dateRecorded: r.dateRecorded,
  }));

  const fallbackRatePerM3 =
    currentYearRate(yearlyRateHistory) ||
    currentYearRate(
      meta.yearlyRateHistory && Object.keys(meta.yearlyRateHistory).length > 0
        ? meta.yearlyRateHistory
        : BAWADCO_YEARLY_RATE_HISTORY
    );

  return (
    <div className="livestock-mesh">
      <WaterProviderHero provider={providerForClient} recordCount={records.length} />

      <div className="page-shell mx-auto w-full max-w-7xl px-3 py-8 min-[360px]:px-4 sm:px-6 sm:py-10">
        <div className="water-provider-card-grid">
          <div id="calculate" className="provider-price-calculator-cell scroll-mt-28 flex h-full min-h-0 w-full flex-col">
            <ProviderBackButton />
            <WaterProviderPriceCalculator
              theme={{
                href: metaWithProfile.href,
                label: metaWithProfile.acronym || metaWithProfile.cardTitle || metaWithProfile.name,
                sourceLabel: metaWithProfile.waterSource || "Underground Borehole Water",
                headerBg: WATER_PROVIDER_CARD_THEMES.calculator.headerBg,
                cardBodyTint: metaWithProfile.cardBodyTint,
                accentText: metaWithProfile.accentText,
                accent: metaWithProfile.accent,
                accentBg: metaWithProfile.accentBg,
                cardBorder: WATER_PROVIDER_CARD_THEMES.calculator.border,
                title: metaWithProfile.calculatorTitle,
                subtitle: metaWithProfile.calculatorSubtitle,
                emptyHint: metaWithProfile.calculatorEmptyHint,
              }}
              records={calculatorRecords}
              fallbackRatePerM3={fallbackRatePerM3}
            />
          </div>
          <div className="flex h-full min-h-0 w-full">
            <WaterProviderRatesHistory
              provider={providerForClient}
              records={serializedRecords as unknown as typeof records}
              fromYear={fromYear}
            />
          </div>
          <div className="flex h-full min-h-0 w-full">
            <WaterProviderContact provider={providerForClient} />
          </div>
        </div>
      </div>
    </div>
  );
}
