"use client";

import { LivestockSectionTitle } from "@/components/livestock/LivestockSectionTitle";
import { useLang } from "@/lib/language-context";

export function LivestockProvidersTitle() {
  const { t } = useLang();
  return (
    <LivestockSectionTitle
      number="01"
      title={t("Livestock Companies", "Shirkadaha Xoolaha")}
      subtitle={t(
        "Approved livestock companies on MMPS",
        "Shirkadaha xoolaha ee la oggolaaday ee MMPS"
      )}
      accent="from-orange-500 to-amber-500"
    />
  );
}
