"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  LIVESTOCK_IMAGE_FOCUS,
  LIVESTOCK_PHOTO_URLS,
} from "@/lib/livestock-data";
import { LIVESTOCK_CATEGORIES, LIVESTOCK_TYPE_CHIP_CLASS } from "@/lib/home-content";
import { LivestockSectionTitle } from "@/components/livestock/LivestockSectionTitle";
import { StableBilingual } from "@/components/ui/StableBilingual";
import {
  HOME_MARKET_CARD_BODY_H,
  HOME_MARKET_CARD_H,
  HOME_MARKET_CARD_HEADER_H,
} from "@/lib/home-card-layout";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

export type PublicNavCategory = {
  slug: string;
  nameEn: string;
  nameSo: string;
  imageUrl?: string | null;
  types: { nameEn: string; nameSo: string }[];
};

const THEMES = {
  geel: {
    sicirkaEn: "CAMEL PRICES",
    sicirkaSo: "SICIRKA GEELKA",
    noocyaddaEn: "CAMEL TYPES",
    noocyaddaSo: "NOOCYADDA GEELKA",
    qiimahaEn: "VIEW CAMEL PRICES",
    qiimahaSo: "QIIMAHA GEELKA",
    photo: LIVESTOCK_PHOTO_URLS.geel,
    focus: LIVESTOCK_IMAGE_FOCUS.geel,
    button: "bg-[#ea580c] hover:bg-[#c2410c]",
    tint: "from-stone-950/70 via-amber-950/20",
    priceColor: "text-orange-800",
    topBar: "bg-[#ea580c]",
    bg: "bg-orange-50/50",
  },
  loda: {
    sicirkaEn: "CATTLE PRICES",
    sicirkaSo: "SICIRKA LO'DA",
    noocyaddaEn: "CATTLE TYPES",
    noocyaddaSo: "NOOCYADDA LO'DA",
    qiimahaEn: "VIEW CATTLE PRICES",
    qiimahaSo: "QIIMAHA LO'DA",
    photo: LIVESTOCK_PHOTO_URLS.loda,
    focus: LIVESTOCK_IMAGE_FOCUS.loda,
    button: "bg-[#16a34a] hover:bg-[#15803d]",
    tint: "from-stone-950/70 via-emerald-950/20",
    priceColor: "text-green-800",
    topBar: "bg-[#16a34a]",
    bg: "bg-emerald-50/50",
  },
  arri: {
    sicirkaEn: "GOAT & SHEEP PRICES",
    sicirkaSo: "SICIRKA ARRIGA",
    noocyaddaEn: "GOAT & SHEEP TYPES",
    noocyaddaSo: "NOOCYADDA ARRIGA",
    qiimahaEn: "VIEW GOAT & SHEEP PRICES",
    qiimahaSo: "QIIMAHA ARRIGA",
    photo: LIVESTOCK_PHOTO_URLS.arri,
    focus: LIVESTOCK_IMAGE_FOCUS.arri,
    button: "bg-[#0d9488] hover:bg-[#0f766e]",
    tint: "from-stone-950/70 via-teal-950/20",
    priceColor: "text-teal-800",
    topBar: "bg-[#0d9488]",
    bg: "bg-teal-50/50",
  },
} as const;

const EXTRA_THEMES = [
  {
    button: "bg-violet-600 hover:bg-violet-700",
    tint: "from-stone-950/70 via-violet-950/20",
    priceColor: "text-violet-800",
    topBar: "bg-violet-600",
    bg: "bg-violet-50/50",
  },
  {
    button: "bg-sky-600 hover:bg-sky-700",
    tint: "from-stone-950/70 via-sky-950/20",
    priceColor: "text-sky-800",
    topBar: "bg-sky-600",
    bg: "bg-sky-50/50",
  },
  {
    button: "bg-rose-600 hover:bg-rose-700",
    tint: "from-stone-950/70 via-rose-950/20",
    priceColor: "text-rose-800",
    topBar: "bg-rose-600",
    bg: "bg-rose-50/50",
  },
] as const;

function fallbackCategories(): PublicNavCategory[] {
  return LIVESTOCK_CATEGORIES.map((cat) => ({
    slug: cat.id,
    nameEn: cat.english,
    nameSo: cat.somali,
    imageUrl: cat.image,
    types: cat.types.map((name) => ({ nameEn: name, nameSo: name })),
  }));
}

function themeFor(slug: string, index: number) {
  if (slug === "geel" || slug === "loda" || slug === "arri") {
    return THEMES[slug];
  }
  const extra = EXTRA_THEMES[index % EXTRA_THEMES.length];
  return {
    sicirkaEn: "LIVESTOCK PRICES",
    sicirkaSo: "SICIRKA XOOLAHA",
    noocyaddaEn: "TYPES",
    noocyaddaSo: "NOOCYADDA",
    qiimahaEn: "VIEW PRICES",
    qiimahaSo: "QIIMAHA",
    photo: LIVESTOCK_PHOTO_URLS.marketHero,
    focus: "50% 45%",
    ...extra,
  };
}

export function LivestockPriceNav({
  categories: initialCategories,
}: {
  categories?: PublicNavCategory[];
}) {
  const { lang, t } = useLang();
  const pathname = usePathname();
  const showBack = pathname === "/livestock";
  const [live, setLive] = useState<PublicNavCategory[] | null>(
    initialCategories ? initialCategories : null
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/livestock/public-catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data.categories) ? data.categories : [];
        setLive(
          rows.map((row: PublicNavCategory) => ({
            slug: row.slug,
            nameEn: row.nameEn,
            nameSo: row.nameSo,
            imageUrl: row.imageUrl,
            types: Array.isArray(row.types) ? row.types : [],
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(
    () => (live == null ? fallbackCategories() : live),
    [live]
  );

  return (
    <section id="prices" className="scroll-mt-28">
      {showBack ? (
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back", "Dib u noqo")}
        </Link>
      ) : null}
      <LivestockSectionTitle
        title={t("LIVESTOCK PRICES", "SICIRKA XOOLAHA")}
        accent="from-emerald-600 to-amber-500"
      />

      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-5 md:gap-6",
          cards.length >= 4
            ? "md:grid-cols-2 xl:grid-cols-4"
            : "md:grid-cols-3"
        )}
      >
        {cards.map((cat, i) => {
          const theme = themeFor(cat.slug, i);
          const photo = cat.imageUrl?.trim() || theme.photo;
          const typeNames = (() => {
            const seen = new Set<string>();
            const chips: { key: string; raw: string; label: string; colorKey: string }[] = [];
            cat.types.forEach((type, typeIndex) => {
              const raw =
                (lang === "so" ? type.nameSo : type.nameEn) ||
                type.nameSo ||
                type.nameEn;
              if (!raw) return;
              const label = raw.trim();
              const uniq = `${type.nameSo}|${type.nameEn}|${typeIndex}`.toLowerCase();
              if (seen.has(uniq)) return;
              seen.add(uniq);
              chips.push({
                key: `${cat.slug}-${uniq}-${typeIndex}`,
                raw,
                label,
                colorKey: type.nameSo || type.nameEn,
              });
            });
            return chips;
          })();
          const sicirkaEn = `${cat.nameEn.toUpperCase()} PRICES`;
          const sicirkaSo = `SICIRKA ${cat.nameSo.toUpperCase()}`;
          const typesEn = `${cat.nameEn.toUpperCase()} TYPES`;
          const typesSo = `NOOCYADDA ${cat.nameSo.toUpperCase()}`;
          const viewEn = `VIEW ${cat.nameEn.toUpperCase()} PRICES`;
          const viewSo = `QIIMAHA ${cat.nameSo.toUpperCase()}`;
          return (
            <Link
              key={cat.slug}
              href={`/livestock/${cat.slug}`}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1",
                HOME_MARKET_CARD_H,
                theme.bg
              )}
            >
              <div className={cn("h-1 w-full shrink-0", theme.topBar)} />

              <div
                className={cn(
                  "relative w-full shrink-0 overflow-hidden",
                  HOME_MARKET_CARD_HEADER_H
                )}
              >
                <Image
                  src={photo}
                  alt={lang === "so" ? cat.nameSo : cat.nameEn}
                  fill
                  quality={80}
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  style={{ objectPosition: theme.focus }}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={photo.startsWith("/uploads/")}
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t to-transparent",
                    theme.tint
                  )}
                />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white drop-shadow-sm sm:text-xs">
                    <StableBilingual
                      en={sicirkaEn}
                      so={sicirkaSo}
                      lang={lang}
                    />
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex flex-col p-3 sm:p-4",
                  HOME_MARKET_CARD_BODY_H
                )}
              >
                <p
                  className={cn(
                    "animate-fade-in-up text-[11px] font-extrabold uppercase tracking-wide",
                    theme.priceColor
                  )}
                  style={{
                    animationDelay: `${200 + i * 100}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <StableBilingual
                    en={typesEn}
                    so={typesSo}
                    lang={lang}
                  />
                </p>

                <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto py-2 px-0.5 scrollbar-none after:w-1 after:shrink-0 after:content-['']">
                  {typeNames.map((type) => (
                    <span
                      key={type.key}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1",
                        LIVESTOCK_TYPE_CHIP_CLASS[type.colorKey] ||
                          LIVESTOCK_TYPE_CHIP_CLASS[type.raw] ||
                          LIVESTOCK_TYPE_CHIP_CLASS[type.label] ||
                          "text-slate-700 ring-slate-300 bg-slate-50"
                      )}
                    >
                      {type.label}
                    </span>
                  ))}
                </div>

                <div className="mt-auto w-full shrink-0 border-t border-slate-100 pt-2">
                  <span
                    className={cn(
                      "flex w-full items-center justify-center rounded-xl py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm transition group-hover:brightness-105",
                      theme.button
                    )}
                  >
                    <StableBilingual
                      en={viewEn}
                      so={viewSo}
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
