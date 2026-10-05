"use client";

import Link from "next/link";
import { Beef, Droplets, Zap } from "lucide-react";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { LivestockSectionTitle } from "@/components/livestock/LivestockSectionTitle";
import { LivestockPriceNav } from "@/components/livestock/LivestockPriceNav";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { HOME_SECTORS } from "@/lib/home-content";
import { HOME_MARKET_CARD_H, HOME_MARKET_CARD_HEADER_H } from "@/lib/home-card-layout";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

const SECTOR_ICONS = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
} as const;

export function HomeSectorsSection({
  activeSectors,
}: {
  activeSectors?: Record<"livestock" | "electricity" | "water", boolean>;
}) {
  const { lang, t } = useLang();
  const sectors = HOME_SECTORS.filter((sector) =>
    activeSectors ? activeSectors[sector.id] !== false : true
  );

  return (
    <section>
      <LivestockSectionTitle
        title={t("Market Sectors", "Qaybaha Suuqa")}
        subtitle={t(
          "Livestock, Electricity, and Water",
          "Xoolaha, Korontada, iyo Biyaha"
        )}
        accent="from-emerald-600 to-amber-500"
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        {sectors.map((sector) => {
          const Icon = SECTOR_ICONS[sector.id];
          const title = lang === "so" ? sector.titleSo : sector.titleEn;
          const description =
            lang === "so" ? sector.descriptionSo : sector.descriptionEn;
          const highlights =
            lang === "so" ? sector.highlightsSo : sector.highlightsEn;
          return (
            <Link
              key={sector.id}
              href={sector.href}
              prefetch
              className={cn(
                "group flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border transition-shadow [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
                HOME_MARKET_CARD_H,
                sector.border,
                sector.bg
              )}
            >
              <div
                className={cn(
                  "relative shrink-0 overflow-hidden",
                  HOME_MARKET_CARD_HEADER_H
                )}
              >
                <LivestockCategoryPhoto
                  src={sector.image}
                  alt={title}
                  focus={sector.imageFocus}
                  fit="cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                <div
                  className={cn(
                    "absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-md ring-1 ring-black/5",
                    sector.iconBg
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", sector.iconColor)}
                    strokeWidth={2.5}
                  />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
                <h3 className="text-lg font-black text-gray-900">
                  {title}
                </h3>
                {description.trim() ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] line-clamp-3">
                    {description}
                  </p>
                ) : null}
                {highlights.length > 0 ? (
                <div className="mt-2 flex flex-nowrap items-center gap-5 overflow-x-auto py-2 px-1 -mx-1 scrollbar-none after:content-[''] after:w-1 after:shrink-0">
                  {highlights.map((h, i) => {
                    const tagColors = [
                      "text-emerald-700 ring-emerald-200/80 bg-emerald-50/90",
                      "text-amber-700 ring-amber-200/80 bg-amber-50/90",
                      "text-teal-700 ring-teal-200/80 bg-teal-50/90",
                      "text-orange-700 ring-orange-200/80 bg-orange-50/90"
                    ];
                    return (
                      <span
                        key={h}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 animate-fade-in-up shadow-sm transition-transform hover:scale-105",
                          tagColors[i % tagColors.length]
                        )}
                        style={{ animationDelay: `${i * 250}ms` }}
                      >
                        {h}
                      </span>
                    );
                  })}
                </div>
                ) : null}
                <div className="mt-auto border-t border-white/60 pt-4">
                  <span
                    className={cn(
                      "flex w-full items-center justify-center rounded-xl bg-gradient-to-r py-2.5 text-sm font-bold text-white shadow-sm transition group-hover:brightness-105 group-active:scale-[0.98]",
                      sector.gradient
                    )}
                  >
                    <StableBilingual
                      en={sector.english}
                      so={sector.somali}
                      lang={lang}
                      align="center"
                    />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeLivestockSection() {
  return <LivestockPriceNav />;
}
