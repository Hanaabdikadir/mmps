"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LivestockPriceSectionCard } from "@/components/livestock/LivestockPriceSectionCard";
import {
  LIVESTOCK_COLUMNS,
  LIVESTOCK_PRICE_SECTIONS,
  isLivestockCategorySlug,
  type LivestockPriceSection,
} from "@/lib/livestock-data";
import {
  animalTypeFromCategory,
  overlayCatalogTypeBoard,
  type NamedPriceField,
} from "@/lib/livestock-section-prices";
import { useLang } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/lib/use-url-tab";
import { readTypePhotoCache, writeTypePhotoCache } from "@/lib/livestock-type-photo-cache";

type FocusKey = "birimo" | "sugunto";

const FOCUS_SECTIONS: Record<
  FocusKey,
  {
    labelSo: string;
    labelEn: string;
    section: LivestockPriceSection;
    activeTab: string;
    idleTab: string;
  }
> = {
  birimo: {
    labelSo: "Birimo",
    labelEn: "First Class",
    section: {
      ...LIVESTOCK_PRICE_SECTIONS.find((s) => s.id === "barimada-caadiga")!,
      titleSomali: "Birimo",
      titleEnglish: "First Class",
      description: "",
      theme: "yellow",
    },
    activeTab:
      "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/40",
    idleTab:
      "bg-white text-amber-950 ring-1 ring-amber-200/80 hover:bg-amber-50",
  },
  sugunto: {
    labelSo: "Sugunto",
    labelEn: "Second Class",
    section: {
      ...LIVESTOCK_PRICE_SECTIONS.find((s) => s.id === "sekontada")!,
      titleSomali: "Sugunto",
      titleEnglish: "Second Class",
      description: "",
      theme: "cyan",
    },
    activeTab:
      "bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-700/30 ring-1 ring-teal-400/40",
    idleTab:
      "bg-white text-teal-950 ring-1 ring-teal-200/80 hover:bg-teal-50",
  },
};

const TABS: FocusKey[] = ["birimo", "sugunto"];

interface LivestockBirimoSuguntoPanelProps {
  category: string;
  categoryName: string;
  initialCatalogTypes?: { nameSo: string; nameEn: string }[];
  initialCategoryLabelSo?: string;
  initialCategoryLabelEn?: string;
}

export function LivestockBirimoSuguntoPanel({
  category,
  categoryName,
  initialCatalogTypes,
  initialCategoryLabelSo,
  initialCategoryLabelEn,
}: LivestockBirimoSuguntoPanelProps) {
  const [active, setActive] = useUrlTab(
    ["birimo", "sugunto"] as const satisfies readonly FocusKey[],
    "birimo"
  );
  const { lang, t } = useLang();
  const marketId = useSearchParams().get("market") || "";
  const [liveFields, setLiveFields] = useState<NamedPriceField[]>([]);
  const [hiddenNames, setHiddenNames] = useState<string[]>([]);
  const [catalogTypes, setCatalogTypes] = useState<
    { nameSo: string; nameEn: string }[]
  >(initialCatalogTypes || []);
  const [catalogLoaded, setCatalogLoaded] = useState(Boolean(initialCatalogTypes));
  const [categoryLabel, setCategoryLabel] = useState(categoryName);
  const [typeImages, setTypeImages] = useState<Record<string, string> | null>(
    null
  );
  const current = FOCUS_SECTIONS[active];

  useEffect(() => {
    const animalType = animalTypeFromCategory(category);
    const marketQuery = marketId ? `&marketId=${encodeURIComponent(marketId)}` : "";
    void fetch(
      `/api/livestock/section-prices?slug=${encodeURIComponent(category)}&animalType=${animalType}${marketQuery}`,
      {
      cache: "no-store",
    }
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.fields)) setLiveFields(data.fields);
        else setLiveFields([]);
        setHiddenNames(Array.isArray(data.hiddenNames) ? data.hiddenNames : []);
      })
      .catch(() => {
        setLiveFields([]);
        setHiddenNames([]);
      });

    void fetch("/api/livestock/public-catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const match = (data.categories || []).find(
          (row: { slug?: string }) => row.slug === category
        );
        if (match?.nameSo || match?.nameEn) {
          setCategoryLabel(
            lang === "so"
              ? initialCategoryLabelSo || match.nameSo || match.nameEn
              : initialCategoryLabelEn || match.nameEn || match.nameSo
          );
        }
        if (Array.isArray(match?.types)) {
          const seen = new Set<string>();
          setCatalogTypes(
            match.types.flatMap(
              (type: {
                id?: number;
                nameSo?: string;
                nameEn?: string;
              }) => {
              const nameSo = String(type.nameSo || type.nameEn || "").trim();
              const nameEn = String(type.nameEn || type.nameSo || "").trim();
              if (!nameSo && !nameEn) return [];
              const key = String(type.id || `${nameSo}|${nameEn}`).toLowerCase();
              if (seen.has(key)) return [];
              seen.add(key);
              return [{ nameSo: nameSo || nameEn, nameEn: nameEn || nameSo }];
            })
          );
        } else {
          setCatalogTypes([]);
        }
        setCatalogLoaded(true);
      })
      .catch(() => {
        setCatalogTypes([]);
        setCatalogLoaded(true);
      });
  }, [category, lang, marketId]);

  useEffect(() => {
    let cancelled = false;
    const cached = readTypePhotoCache(category, active);
    if (cached) setTypeImages(cached);
    else setTypeImages(null);
    void fetch(
      `/api/livestock/type-photos?slug=${category}&season=${active}&scope=card`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.photos && typeof data.photos === "object") {
          const next = data.photos as Record<string, string>;
          writeTypePhotoCache(category, active, next);
          setTypeImages(next);
        } else {
          setTypeImages({});
        }
      })
      .catch(() => {
        if (!cancelled) setTypeImages((current) => current ?? {});
      });
    return () => {
      cancelled = true;
    };
  }, [category, active]);

  const builtin = isLivestockCategorySlug(category);
  const heading =
    (lang === "so"
      ? categoryLabel || initialCategoryLabelSo
      : categoryLabel || initialCategoryLabelEn) ||
    (builtin
      ? lang === "so"
        ? LIVESTOCK_COLUMNS[category].somali
        : LIVESTOCK_COLUMNS[category].english
      : category);
  const liveOpts = {
    useCatalogWhenEmpty: !catalogLoaded,
    liveOnly: false,
    omitNames: hiddenNames,
    catalogTypes: catalogLoaded ? catalogTypes : undefined,
  } as const;
  const birimoBoard = overlayCatalogTypeBoard(category, liveFields, "birimo", liveOpts);
  const suguntoBoard = overlayCatalogTypeBoard(category, liveFields, "sugunto", liveOpts);
  const typePrices =
    active === "sugunto"
      ? (category === "geel" && birimoBoard.length
          ? birimoBoard.map((row) => {
              const hit = suguntoBoard.find(
                (item) =>
                  item.name.trim().toLowerCase() === row.name.trim().toLowerCase()
              );
              return hit || { ...row, price: "—" };
            })
          : suguntoBoard)
      : birimoBoard;

  return (
    <div className="mx-auto w-full">
      <div className="flex w-full flex-col overflow-hidden rounded-3xl border border-emerald-200/70 bg-white shadow-xl shadow-emerald-950/10">
        <div className="relative flex shrink-0 items-center gap-2.5 overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-3 py-2 sm:px-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 50%, rgba(52,211,153,0.35), transparent 42%), radial-gradient(circle at 88% 20%, rgba(251,191,36,0.18), transparent 36%)",
            }}
          />
          <Link
            href="/livestock"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-800 shadow-md ring-1 ring-white/80 transition hover:-translate-x-0.5 hover:bg-emerald-50"
            aria-label={t("Back", "Dib u noqo")}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <div className="relative min-w-0">
            <h2 className="truncate text-base font-black leading-tight tracking-tight text-white">
              {heading}
            </h2>
          </div>
        </div>
        <div className="flex w-full flex-col bg-gradient-to-b from-emerald-50/80 to-white p-3 sm:p-4 lg:p-5">
      <div
        role="tablist"
        aria-label={t("First Class or Second Class", "Birimo ama Sugunto")}
        className="mb-3 grid grid-cols-2 gap-3"
      >
        {TABS.map((key) => {
          const tab = FOCUS_SECTIONS[key];
          const isActive = active === key;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(key)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-200 sm:min-h-12",
                isActive ? tab.activeTab : tab.idleTab
              )}
            >
              <span className="block text-sm font-extrabold leading-tight sm:text-base">
                {lang === "so" ? tab.labelSo : tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      <div key={active} className="animate-fade-in-up">
        <LivestockPriceSectionCard
          section={current.section}
          index={active === "birimo" ? 0 : 1}
          category={category}
          compact
          categoryLabel={categoryLabel}
          typePrices={typePrices}
          season={active}
          linkTypes
          typeImages={typeImages}
        />
      </div>
        </div>
      </div>
    </div>
  );
}
