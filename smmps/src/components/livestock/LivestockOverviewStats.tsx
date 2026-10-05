"use client";

import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import { useLang } from "@/lib/language-context";

/** Market categories shortcut card */
export function LivestockOverviewStats() {
  const { t } = useLang();

  return (
    <section className="relative z-10 px-3 min-[360px]:px-4 sm:px-6" style={{ marginTop: 28 }}>
      <div className="mx-auto max-w-7xl">
        <Link
          href="/livestock/types"
          className="group relative flex max-w-xl items-center gap-4 overflow-hidden rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50 via-amber-50/80 to-white px-5 py-5 transition duration-200 hover:border-emerald-400/60 hover:bg-white sm:px-6 sm:py-6"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <Layers className="h-6 w-6" strokeWidth={2.25} />
          </span>

          <div className="relative min-w-0 flex-1 text-left">
            <p className="truncate text-[1.45rem] font-extrabold tracking-tight text-slate-900 sm:text-[1.6rem]">
              3
            </p>
            <p className="text-sm font-bold text-orange-900">{t("Market Categories", "Qaybaha Suuqa")}</p>
            <p className="truncate text-[12px] font-medium text-orange-700/85">
              {t("Camels · Cattle · Goats & Sheep", "Geelka · Lo'da · Ari iyo Ido")}
            </p>
          </div>

          <ArrowUpRight
            className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-emerald-700"
            strokeWidth={2.25}
          />
        </Link>
      </div>
    </section>
  );
}
