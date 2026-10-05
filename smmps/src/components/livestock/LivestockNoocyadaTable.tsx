"use client";

import { useEffect, useState } from "react";
import {
  ARRI_GOAT_NOS,
  ARRI_SHEEP_NOS,
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_IMAGE_FOCUS,
  LIVESTOCK_TYPE_LABELS_EN,
  LIVESTOCK_TYPES,
  livestockTypeLabel,
  type LivestockColumnKey,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { StableBilingual } from "@/components/ui/StableBilingual";

type TypeRow = { no: number; en: string; so: string };

function typePair(
  key: LivestockColumnKey,
  no: number,
  somali: string
): TypeRow {
  const map = LIVESTOCK_TYPE_LABELS_EN[key] as Record<number, string>;
  return {
    no,
    en: map[no] || somali,
    so: somali,
  };
}

const SECTOR_META = [
  {
    key: "geel" as const,
    titleEn: "Camels",
    titleSo: "Geelka",
    subtitleEn: "Camel Category",
    subtitleSo: "Noocyada Geelka",
    header: "bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500",
    card: "border-orange-200 bg-white",
    accent: "text-orange-900",
    rowBg: "bg-white",
    rowAlt: "bg-orange-50/80",
    rowHover: "hover:bg-orange-100/90 hover:border-orange-200",
    badge: "bg-orange-500 text-white",
    ring: "ring-orange-300/80",
    bar: "bg-orange-500",
    getValue: (row: (typeof LIVESTOCK_TYPES)[number]) => row.geel,
  },
  {
    key: "loda" as const,
    titleEn: "Cattle",
    titleSo: "Lo'da",
    subtitleEn: "Cattle Category",
    subtitleSo: "Noocyada Lo'da",
    header: "bg-gradient-to-br from-green-600 via-green-600 to-emerald-500",
    card: "border-green-200 bg-white",
    accent: "text-green-900",
    rowBg: "bg-white",
    rowAlt: "bg-green-50/80",
    rowHover: "hover:bg-green-100/90 hover:border-green-200",
    badge: "bg-green-600 text-white",
    ring: "ring-green-400/80",
    bar: "bg-green-600",
    getValue: (row: (typeof LIVESTOCK_TYPES)[number]) => row.loda,
  },
  {
    key: "arri" as const,
    titleEn: "Sheep & Goats",
    titleSo: "Ari & Ido",
    subtitleEn: "Sheep & Goat Category",
    subtitleSo: "Noocyada Ari & Ido",
    header: "bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500",
    card: "border-teal-200 bg-white",
    accent: "text-teal-900",
    rowBg: "bg-white",
    rowAlt: "bg-teal-50/80",
    rowHover: "hover:bg-teal-100/90 hover:border-teal-200",
    badge: "bg-teal-600 text-white",
    ring: "ring-teal-300/80",
    bar: "bg-teal-500",
    getValue: (row: (typeof LIVESTOCK_TYPES)[number]) => row.arri,
  },
] as const;

/** Noocyada Xoolaha — three color-aligned sectors (compact = one screen @ 100%) */
export function LivestockNoocyadaTable({
  compact = false,
  showHeader = true,
}: {
  compact?: boolean;
  showHeader?: boolean;
}) {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [catalog, setCatalog] = useState<
    Record<string, { nameEn: string; nameSo: string; types: { nameEn: string; nameSo: string }[] }>
  >({});
  const [, setCatalogLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/livestock/public-catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const next: typeof catalog = {};
        for (const row of data.categories || []) {
          if (row?.slug) {
            next[row.slug] = {
              ...row,
              types: row.types || [],
            };
          }
        }
        setCatalog(next);
      })
      .catch(() => setCatalog({}))
      .finally(() => setCatalogLoaded(true));
  }, []);

  function typeKeys(en: string, so: string) {
    return new Set(
      [
        en,
        so,
        livestockTypeLabel(en, "en"),
        livestockTypeLabel(so, "en"),
        livestockTypeLabel(en, "so"),
        livestockTypeLabel(so, "so"),
      ]
        .map((s) => s.trim().toLowerCase().replace(/\s*\/\s*/g, "/"))
        .filter(Boolean)
    );
  }

  function sameType(a: TypeRow, en: string, so: string) {
    const keys = typeKeys(a.en, a.so);
    for (const key of typeKeys(en, so)) {
      if (keys.has(key)) return true;
    }
    return false;
  }

  function officialRows(sector: (typeof SECTOR_META)[number]): TypeRow[] {
    return LIVESTOCK_TYPES.map((row) => {
      const somali = sector.getValue(row);
      if (!somali) return null;
      return typePair(sector.key, row.no, somali);
    }).filter((r): r is TypeRow => r !== null);
  }

  function buildRows(sector: (typeof SECTOR_META)[number]): TypeRow[] {
    const live = catalog[sector.key]?.types || [];
    if (live.length) {
      return live.map((type, i) => {
        const en = String(type.nameEn || type.nameSo || "").trim();
        const so = String(type.nameSo || type.nameEn || "").trim();
        return {
          no: i + 1,
          en: en || so,
          so: so || en,
        };
      }).filter((row) => row.en || row.so);
    }
    return officialRows(sector);
  }

  function renderRow(
    sector: (typeof SECTOR_META)[number],
    row: TypeRow,
    i: number
  ) {
    return (
      <li
        key={`${sector.key}-${row.no}`}
        className={cn(
          "group/row relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-transparent",
          "transition-[background-color,border-color,transform] duration-250 ease-out",
          "hover:translate-x-0.5",
          compact ? "px-2.5 py-1.5 sm:px-3 sm:py-2" : "gap-3 px-3 py-2.5",
          i % 2 === 0 ? sector.rowBg : sector.rowAlt,
          sector.rowHover
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 transition-transform duration-300 ease-out group-hover/row:scale-y-100",
            sector.bar
          )}
        />
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg font-black text-white",
            "transition-transform duration-250 ease-out group-hover/row:scale-105",
            compact
              ? "h-7 w-7 text-[11px] sm:h-8 sm:w-8 sm:text-xs"
              : "h-8 w-8 text-sm",
            sector.badge
          )}
        >
          {row.no}
        </span>
        <span
          className={cn(
            "min-w-0 font-extrabold tracking-[0.02em]",
            isEn ? "normal-case" : "uppercase tracking-[0.04em]",
            compact
              ? "text-[12px] leading-snug sm:text-[13px]"
              : "text-[15px] sm:text-[16px]",
            sector.accent
          )}
        >
          <StableBilingual en={row.en} so={row.so} lang={lang} />
        </span>
      </li>
    );
  }

  function renderArriGroupHeader(
    sector: (typeof SECTOR_META)[number],
    group: "sheep" | "goats"
  ) {
    const en = group === "sheep" ? "SHEEP" : "GOATS";
    const so = group === "sheep" ? "IDO" : "ARI";

    return (
      <li
        key={`${sector.key}-${group}-header`}
        className="flex shrink-0 items-center gap-2.5 px-1 pt-1.5 first:pt-0"
      >
        <span
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full ring-2 ring-amber-300/80",
            compact ? "h-6 w-6" : "h-7 w-7"
          )}
        >
          <LivestockCategoryPhoto
            src={LIVESTOCK_ANIMAL_IMAGES.arri.url}
            alt={lang === "en" ? en : so}
            focus={group === "sheep" ? "35% 45%" : "65% 50%"}
          />
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-800">
          <StableBilingual en={en} so={so} lang={lang} />
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-400 via-amber-200 to-transparent" />
      </li>
    );
  }

  return (
    <section
      id="noocyada-xoolaha"
      className={cn(
        "flex min-h-0 flex-col",
        compact ? "h-full gap-3" : "scroll-mt-28 space-y-5"
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden border-2 border-blue-700/30 bg-white animate-fade-in-up",
            compact ? "rounded-xl" : "rounded-2xl"
          )}
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <div
            className={cn(
              "bg-gradient-to-r from-blue-700 via-blue-600 to-amber-500 text-center",
              compact
                ? "px-3 py-2.5 sm:px-4 sm:py-3"
                : "px-4 py-4 sm:px-6 sm:py-5"
            )}
          >
            <h2
              className={cn(
                "font-black uppercase tracking-[0.12em] text-white",
                compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              )}
            >
              <StableBilingual
                en="Livestock Types"
                so="Noocyada Xoolaha"
                lang={lang}
              />
            </h2>
            <div
              className={cn(
                "flex flex-wrap items-center justify-center gap-1.5",
                compact ? "mt-1.5" : "mt-2 gap-2"
              )}
            >
              <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]">
                <StableBilingual en="Camels" so="Geelka" lang={lang} />
              </span>
              <span className="rounded-full bg-blue-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]">
                <StableBilingual en="Cattle" so="Lo'da" lang={lang} />
              </span>
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]">
                <StableBilingual
                  en="Sheep & Goats"
                  so="Ari iyo Ido"
                  lang={lang}
                />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          compact
            ? "h-full items-stretch gap-3 min-[720px]:grid-cols-3"
            : "items-stretch gap-4 min-[720px]:grid-cols-3 sm:gap-5"
        )}
      >
        {SECTOR_META.map((sector) => {
          const animal = LIVESTOCK_ANIMAL_IMAGES[sector.key];
          const rows = buildRows(sector);
          const showArriGroups = sector.key === "arri";

          return (
            <article
              key={sector.key}
              className={cn(
                "group/card relative flex h-full min-h-0 flex-col overflow-hidden border-2",
                "transition-all duration-300 ease-out will-change-transform",
                "hover:-translate-y-1.5 hover:border-opacity-100",
                "rounded-2xl",
                sector.card
              )}
            >
              <div
                className={cn(
                  "relative shrink-0 overflow-hidden",
                  sector.header,
                  compact
                    ? "px-3.5 py-3 sm:px-4 sm:py-3.5"
                    : "px-4 py-3.5 sm:px-5 sm:py-4"
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-300 group-hover/card:opacity-45"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 12% 20%, rgba(255,255,255,0.45), transparent 42%), radial-gradient(circle at 88% 0%, rgba(255,255,255,0.2), transparent 40%)",
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <span
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-full bg-white/15 ring-2 ring-white/70",
                      "transition-transform duration-300 ease-out group-hover/card:scale-110",
                      compact
                        ? "h-10 w-10 sm:h-11 sm:w-11"
                        : "h-12 w-12 sm:h-14 sm:w-14",
                      sector.ring
                    )}
                  >
                    <LivestockCategoryPhoto
                      src={animal.url}
                      alt={lang === "en" ? sector.titleEn : sector.titleSo}
                      focus={LIVESTOCK_IMAGE_FOCUS[sector.key]}
                    />
                  </span>
                  <div className="min-w-0 text-left">
                    <h3
                      className={cn(
                        "font-black leading-none tracking-tight text-white",
                        compact
                          ? "text-[16px] sm:text-[18px]"
                          : "text-[20px] sm:text-[22px]"
                      )}
                    >
                      <StableBilingual
                        en={catalog[sector.key]?.nameEn || sector.titleEn}
                        so={catalog[sector.key]?.nameSo || sector.titleSo}
                        lang={lang}
                      />
                    </h3>
                    <p
                      className={cn(
                        "font-semibold text-white/90",
                        compact
                          ? "mt-1 text-[11px] sm:text-[12px]"
                          : "mt-1 text-[13px]"
                      )}
                    >
                      <StableBilingual
                        en={sector.subtitleEn}
                        so={sector.subtitleSo}
                        lang={lang}
                      />
                    </p>
                  </div>
                </div>
              </div>

              <ul
                className={cn(
                  "flex min-h-0 flex-1 flex-col overflow-y-auto",
                  compact
                    ? "justify-start gap-1 p-2 sm:p-2.5"
                    : "gap-2 p-3 sm:p-3.5"
                )}
              >
                {showArriGroups ? (
                  <>
                    {renderArriGroupHeader(sector, "sheep")}
                    {rows
                      .filter((r) =>
                        (ARRI_SHEEP_NOS as readonly number[]).includes(r.no)
                      )
                      .map((row, i) => renderRow(sector, row, i))}
                    {renderArriGroupHeader(sector, "goats")}
                    {rows
                      .filter((r) =>
                        (ARRI_GOAT_NOS as readonly number[]).includes(r.no)
                      )
                      .map((row, i) => renderRow(sector, row, i + 5))}
                  </>
                ) : (
                  rows.map((row, i) => renderRow(sector, row, i))
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
