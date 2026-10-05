import type { WaterProviderMeta } from "@/lib/water-data";
import { WATER_PAGE_CARD_THEME, WATER_PROVIDER_CARD_THEMES } from "@/lib/water-data";
import type { WaterPriceRecord } from "@/lib/market-price-types";
import { buildFiveYearRateHistory } from "@/lib/water-analytics";
import {
  WaterProviderRatesHistoryPanel,
  type SerializableFiveYearHistory,
} from "@/components/water/WaterProviderRatesHistoryPanel";
import { waterSignatureVariantFromSlug } from "@/components/water/WaterProviderSignatures";
import { TARIFF_YEAR_END, TARIFF_YEAR_START } from "@/lib/tariff-years";

interface WaterProviderRatesHistoryProps {
  provider: Omit<WaterProviderMeta, "icon">;
  records: WaterPriceRecord[];
  /** Oldest year this plan may show. */
  fromYear?: number;
}

export function WaterProviderRatesHistory({
  provider,
  records,
  fromYear = TARIFF_YEAR_START,
}: WaterProviderRatesHistoryProps) {
  const currentOnly = fromYear >= TARIFF_YEAR_END;
  const yearlyRateHistory = Object.fromEntries(
    Object.entries(provider.yearlyRateHistory ?? {}).filter(
      ([year]) => Number(year) >= fromYear && Number(year) <= TARIFF_YEAR_END
    )
  ) as Partial<Record<number, number>>;
  const visibleRecords = currentOnly
    ? []
    : records.filter((row) => {
        const year = new Date(row.dateRecorded).getFullYear();
        return year >= fromYear && year <= TARIFF_YEAR_END;
      });
  const history = buildFiveYearRateHistory(visibleRecords, yearlyRateHistory);

  const serialized: SerializableFiveYearHistory = {
    rows: history.rows.filter((row) => row.year >= fromYear && row.year <= TARIFF_YEAR_END),
    currentRate: history.currentRate,
    startRate: history.startRate,
    updatedAt: history.updatedAt?.toISOString() ?? null,
    fiveYearChangeUsd: history.fiveYearChangeUsd,
    fiveYearChangePct: history.fiveYearChangePct,
    avgAnnualIncreasePct: history.avgAnnualIncreasePct,
  };

  const stampColor =
    provider.slug === "banadir-water"
      ? "#b45309"
      : provider.slug === "wabax"
        ? "#1d4ed8"
        : "#0e7490";

  return (
    <div className="h-full w-full">
      <WaterProviderRatesHistoryPanel
        theme={{
          label: provider.acronym ?? provider.somali,
          companyName: provider.name,
          sourceLabel: provider.waterSource ?? provider.pillLabel,
          headerBg: WATER_PROVIDER_CARD_THEMES.rates.headerBg,
          accentText: WATER_PAGE_CARD_THEME.accentText,
          accent: WATER_PAGE_CARD_THEME.accent,
          chartColor: WATER_PAGE_CARD_THEME.chartColor,
          cardBorder: WATER_PROVIDER_CARD_THEMES.rates.border,
          logoSrc: provider.image,
          logoAlt: provider.name,
          ratesNote: provider.ratesNote?.trim()
            ? provider.ratesNote
            : `Rates are for ${provider.acronym ?? provider.name} (${provider.waterSource ?? "water supply"}). Values shown in USD per cubic meter (m³).`,
          stampLabel: provider.cardLabel ?? provider.acronym ?? provider.name ?? "",
          stampTitle: provider.acronym ?? provider.cardTitle ?? provider.name ?? "",
          stampTagline: provider.tagline ?? "Water Supply & Distribution",
          stampColor,
          stampBorderColor: stampColor,
          signatureVariant: waterSignatureVariantFromSlug(provider.slug),
        }}
        history={serialized}
        records={records}
        yearlyRateHistory={yearlyRateHistory}
        fromYear={fromYear}
      />
    </div>
  );
}
