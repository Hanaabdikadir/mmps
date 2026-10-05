"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ElectricitySectionTitle } from "@/components/electricity/ElectricitySectionTitle";
import { useLang } from "@/lib/language-context";

/** Sector-page providers heading — same EN/SO strings as home electricity section. */
export function ElectricityProvidersTitle() {
  const { t } = useLang();
  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Back", "Dib u noqo")}
      </Link>
      <ElectricitySectionTitle
        number="02"
        title={t("ELECTRICITY PRICES", "SICIRKA KORONTADA")}
        accent="from-[#FF8000] to-amber-500"
      />
    </div>
  );
}
