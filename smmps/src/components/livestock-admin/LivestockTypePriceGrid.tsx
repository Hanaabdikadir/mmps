"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LIVESTOCK_COLUMNS,
  livestockTypeLabel,
  categoryTypePrices,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { useLang } from "@/lib/language-context";

export type TypePriceCard = {
  name: string;
  nameEn: string;
  price: string;
};

export function livestockPriceTone(slug: LivestockCategorySlug) {
  if (slug === "geel") {
    return {
      frame: "border-orange-100 from-orange-50/90 to-white",
      price: "text-orange-800",
      index: "bg-orange-100 text-orange-800",
      tab: "border-orange-300 bg-orange-50 text-orange-800",
    };
  }
  if (slug === "arri") {
    return {
      frame: "border-violet-100 from-violet-50/90 to-white",
      price: "text-violet-800",
      index: "bg-violet-100 text-violet-800",
      tab: "border-violet-300 bg-violet-50 text-violet-800",
    };
  }
  return {
    frame: "border-sky-100 from-sky-50/90 to-white",
    price: "text-sky-800",
    index: "bg-sky-100 text-sky-800",
    tab: "border-sky-300 bg-sky-50 text-sky-800",
  };
}

export function catalogTypeCards(slug: LivestockCategorySlug): TypePriceCard[] {
  return categoryTypePrices(slug, "birimo").map((row) => ({
    name: row.name,
    nameEn: livestockTypeLabel(row.name, "en"),
    price: row.price,
  }));
}

export function LivestockTypePriceGrid({
  slug,
  cards,
  headline,
  onCardClick,
  footer,
}: {
  slug: LivestockCategorySlug;
  cards?: TypePriceCard[];
  headline?: string;
  onCardClick?: (card: TypePriceCard, index: number) => void;
  footer?: (card: TypePriceCard, index: number) => ReactNode;
}) {
  const meta = LIVESTOCK_COLUMNS[slug];
  const list = cards?.length ? cards : catalogTypeCards(slug);
  const tone = livestockPriceTone(slug);
  const { lang } = useLang();
  const categoryTitle = lang === "so" ? meta.somali : meta.english;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Current prices
          </p>
          <h4 className="mt-0.5 text-[15px] font-black text-slate-900">
            {headline || categoryTitle}
            <span className="ml-1.5 font-semibold text-slate-400">· {list.length} types</span>
          </h4>
        </div>
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">USD</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {list.map((row, i) => {
          const inner = (
            <>
              <span
                className={cn(
                  "mb-3 inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[10px] font-black",
                  tone.index
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-[15px] font-black tracking-tight text-slate-900">
                {livestockTypeLabel(row.name, lang) || row.nameEn}
              </p>
              <p className={cn("mt-3 text-[17px] font-black tabular-nums tracking-tight", tone.price)}>
                {row.price}
              </p>
              {footer?.(row, i)}
            </>
          );
          const className = cn(
            "rounded-2xl border bg-gradient-to-br p-3.5 text-left shadow-sm",
            tone.frame,
            onCardClick && "transition hover:shadow-md"
          );
          return onCardClick ? (
            <button
              key={`${row.name}-${i}`}
              type="button"
              className={className}
              onClick={() => onCardClick(row, i)}
            >
              {inner}
            </button>
          ) : (
            <article key={`${row.name}-${i}`} className={className}>
              {inner}
            </article>
          );
        })}
      </div>
    </section>
  );
}
