"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WaterSectionTitle } from "@/components/water/WaterSectionTitle";
import { useLang } from "@/lib/language-context";

/** Sector-page providers heading — same EN/SO switching pattern as home cards. */
export function WaterProvidersTitle() {
  const { t } = useLang();
  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Back", "Dib u noqo")}
      </Link>
      <WaterSectionTitle
        number="03"
        title={t("WATER PRICES", "SICIRKA BIYAHA")}
        accent="from-emerald-600 to-amber-500"
      />
    </div>
  );
}
