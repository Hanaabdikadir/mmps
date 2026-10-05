"use client";

import type { ElectricityProviderMeta } from "@/lib/electricity-data";
import {
  ELECTRICITY_PROVIDER_CARD_THEMES,
  ELECTRICITY_TIER_HISTORY_COLUMNS,
  buildElectricityTierHistoryRowsFromMap,
} from "@/lib/electricity-data";
import {
  ProviderTariffTiersCard,
  formatTariffChangeCell,
} from "@/components/providers/ProviderTariffTiersCard";
import { TRANSLATIONS } from "@/lib/language-context";

/**
 * Electricity usage-tier tariff history (USD/kWh) by year —
 * columns: 1–1,000 / 1,001–5,000 / 5,001+ kWh + YoY CHANGE.
 * Rates come from company profile (DB) when present.
 */
export function ElectricityProviderTariffTiers({
  provider,
}: {
  provider: Pick<
    ElectricityProviderMeta,
    "acronym" | "somali" | "name" | "yearlyRateHistory" | "tierRateHistory"
  >;
}) {
  const columns = ELECTRICITY_TIER_HISTORY_COLUMNS.map((col) => ({
    key: col.key,
    labelEn: col.labelEn,
    labelSo: col.labelSo,
  }));
  const rows = buildElectricityTierHistoryRowsFromMap(provider.tierRateHistory);

  return (
    <ProviderTariffTiersCard
      headerBg={ELECTRICITY_PROVIDER_CARD_THEMES.tariff.headerBg}
      cardBorder={ELECTRICITY_PROVIDER_CARD_THEMES.tariff.border}
      providerLabel={provider.acronym ?? provider.somali ?? provider.name}
      sector="electricity"
      unitSuffix="/kWh"
      columns={columns}
      rows={rows}
      titleEn={TRANSLATIONS.electricity.tariffRatesByTier.en}
      titleSo={TRANSLATIONS.electricity.tariffRatesByTier.so}
      formatCell={(key, value) => {
        if (key !== "change") return null;
        return formatTariffChangeCell(value);
      }}
    />
  );
}
