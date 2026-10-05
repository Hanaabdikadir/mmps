"use client";

import { LivestockSectionTitle } from "@/components/livestock/LivestockSectionTitle";
import { useLang } from "@/lib/language-context";

export function WaterSectionTitle() {
  const { t } = useLang();
  return (
    <LivestockSectionTitle
      number="03"
      title={t("WATER PRICES", "SICIRKA BIYAHA")}
      accent="from-emerald-600 to-amber-500"
    />
  );
}

export function ElectricitySectionTitle() {
  const { t } = useLang();
  return (
    <LivestockSectionTitle
      number="02"
      title={t("ELECTRICITY PRICES", "SICIRKA KORONTADA")}
      accent="from-emerald-600 to-amber-500"
    />
  );
}
