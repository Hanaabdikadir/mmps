import {
  ELECTRICITY_PAGE_CARD_THEME,
  ELECTRICITY_PROVIDER_CARD_THEMES,
  yearlyRateHistoryFromTiers,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";
import type { ElectricityPriceRecord } from "@/lib/market-price-types";
import {
  buildFiveYearRateHistory,
  mergeYearlyRateMaps,
} from "@/lib/electricity-analytics";
import {
  ElectricityProviderRatesHistoryPanel,
  type SerializableFiveYearHistory,
} from "@/components/electricity/ElectricityProviderRatesHistoryPanel";
import { signatureVariantFromSlug } from "@/components/electricity/ElectricityProviderSignatures";
import { TARIFF_YEAR_END, TARIFF_YEAR_START } from "@/lib/tariff-years";

interface ElectricityProviderRatesHistoryProps {
  provider: Omit<ElectricityProviderMeta, "icon">;
  records: ElectricityPriceRecord[];
  /** Free plan: show current-year rate only (no multi-year history). */
  currentOnly?: boolean;
  /** Oldest year this plan may show. */
  fromYear?: number;
}

export function ElectricityProviderRatesHistory({
  provider,
  records,
  currentOnly = false,
  fromYear = TARIFF_YEAR_START,
}: ElectricityProviderRatesHistoryProps) {
  const year = TARIFF_YEAR_END;
  const fromTiers = yearlyRateHistoryFromTiers(provider.tierRateHistory ?? {});
  const mergedYearly = mergeYearlyRateMaps(
    provider.yearlyRateHistory ?? {},
    fromTiers
  );
  const yearlyForHistory = currentOnly
    ? {
        [year]: Number(mergedYearly[year] ?? 0) || 0,
      }
    : Object.fromEntries(
        Object.entries(mergedYearly).filter(
          ([y]) => Number(y) >= fromYear && Number(y) <= TARIFF_YEAR_END
        )
      );

  const currentTier = provider.tierRateHistory?.[year];
  const tierForHistory = currentOnly
    ? currentTier
      ? { [year]: currentTier }
      : null
    : Object.fromEntries(
        Object.entries(provider.tierRateHistory ?? {}).filter(
          ([y]) => Number(y) >= fromYear && Number(y) <= TARIFF_YEAR_END
        )
      );

  const visibleRecords = currentOnly
    ? []
    : records.filter((record) => {
        const recordYear = new Date(record.dateRecorded).getFullYear();
        return recordYear >= fromYear && recordYear <= year;
      });
  const history = buildFiveYearRateHistory(visibleRecords, yearlyForHistory);

  const serialized: SerializableFiveYearHistory = {
    rows: history.rows.filter((r) => r.year >= fromYear && r.year <= year),
    currentRate: history.currentRate,
    startRate: currentOnly ? history.currentRate : history.startRate,
    updatedAt: history.updatedAt?.toISOString() ?? null,
    fiveYearChangeUsd: currentOnly ? 0 : history.fiveYearChangeUsd,
    fiveYearChangePct: currentOnly ? 0 : history.fiveYearChangePct,
    avgAnnualIncreasePct: currentOnly ? 0 : history.avgAnnualIncreasePct,
  };

  return (
    <div key={provider.slug} className="h-full w-full">
      <ElectricityProviderRatesHistoryPanel
        theme={{
          label: provider.acronym ?? provider.somali,
          companyName: provider.name,
          sourceLabel: provider.supplyType ?? provider.pillLabel,
          headerBg: ELECTRICITY_PROVIDER_CARD_THEMES.rates.headerBg,
          cardBorder: ELECTRICITY_PROVIDER_CARD_THEMES.rates.border,
          accentText: ELECTRICITY_PAGE_CARD_THEME.accentText,
          accent: ELECTRICITY_PAGE_CARD_THEME.accent,
          chartColor: ELECTRICITY_PAGE_CARD_THEME.chartColor,
          logoSrc: provider.image,
          logoAlt: provider.name,
          ratesNote: null,
          stampLabel: provider.cardLabel ?? provider.acronym ?? provider.name ?? "",
          stampTitle: provider.acronym ?? provider.cardTitle ?? provider.name ?? "",
          stampTagline: provider.tagline ?? "Electricity Supply & Power Grid",
          stampColor:
            provider.slug === "mogadishu-power-supply"
              ? "#b45309"
              : provider.slug === "blue-sky-energy"
                ? "#1d4ed8"
                : "#047857",
          stampBorderColor:
            provider.slug === "mogadishu-power-supply"
              ? "#b45309"
              : provider.slug === "blue-sky-energy"
                ? "#2563eb"
                : "#047857",
          signatureVariant: signatureVariantFromSlug(provider.slug),
        }}
        history={serialized}
        yearlyRateHistory={yearlyForHistory}
        tierRateHistory={tierForHistory}
        usageTiers={provider.usageTiers}
        currentOnly={currentOnly}
        fromYear={fromYear}
      />
    </div>
  );
}
