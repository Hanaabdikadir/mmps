"use client";

import type { WaterProviderMeta } from "@/lib/water-data";
import { WATER_PROVIDER_CARD_THEMES } from "@/lib/water-data";
import {
  ProviderTariffTiersCard,
  buildYearlyRateChangeRows,
  formatTariffChangeCell,
  YEARLY_RATE_CHANGE_COLUMNS,
} from "@/components/providers/ProviderTariffTiersCard";
import { TRANSLATIONS } from "@/lib/language-context";

/**
 * Water providers publish a single USD/m³ rate per year.
 * Table shows yearly rate + change for 2022–2026 from DB profile & market prices.
 */
export function WaterProviderTariffTiers({
  provider,
}: {
  provider: Pick<
    WaterProviderMeta,
    "acronym" | "somali" | "name" | "yearlyRateHistory"
  >;
}) {
  const rows = buildYearlyRateChangeRows(provider.yearlyRateHistory);

  return (
    <ProviderTariffTiersCard
      headerBg={WATER_PROVIDER_CARD_THEMES.tariff.headerBg}
      cardBorder={WATER_PROVIDER_CARD_THEMES.tariff.border}
      providerLabel={provider.acronym ?? provider.somali ?? provider.name}
      sector="water"
      unitSuffix="/m³"
      columns={YEARLY_RATE_CHANGE_COLUMNS.water}
      rows={rows}
      titleEn={TRANSLATIONS.water.tariffRatesByYear.en}
      titleSo={TRANSLATIONS.water.tariffRatesByYear.so}
      subtitleEn={`Official water tariff · ${provider.acronym ?? provider.somali}`}
      subtitleSo={`Tarifka biyaha ee rasmiga ah · ${provider.acronym ?? provider.somali}`}
      formatCell={(key, value) => {
        if (key !== "change") return null;
        return formatTariffChangeCell(value);
      }}
    />
  );
}

