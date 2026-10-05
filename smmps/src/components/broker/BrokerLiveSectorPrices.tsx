"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import {
  LIVESTOCK_CATEGORY_SLUGS,
  LIVESTOCK_COLUMNS,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import {
  canonicalTypeName,
  displaySeasonLabel,
  publicSeasonLabelEn,
  publicSeasonLabelSo,
  type PriceSeasonLabel,
} from "@/lib/livestock-section-prices";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/ui/DataTable";
import { livestockTypePhoto } from "@/lib/livestock-type-visuals";
import { adminLivestockName } from "@/lib/livestock-data";
import { useLang } from "@/lib/language-context";

type LiveRow = {
  id: number;
  price: number;
  currency: string;
  status: string;
  catalogOnly?: boolean;
  fallbackCategory: string | null;
  description: string | null;
  animalTypeEnum: string;
  category: { id: number; name: string; slug?: string } | null;
  animalType: {
    id: number;
    name: string;
    nameSomali?: string | null;
    category?: { slug?: string; name?: string } | null;
  } | null;
  market: { id: number; name: string } | null;
  marketLocation: string;
  broker: { name: string } | null;
};

const SEASON_TABS: { key: "all" | PriceSeasonLabel; label: string }[] = [
  { key: "all", label: "All live" },
  { key: "Birimo", label: "Birimo" },
  { key: "Sugunto", label: "Sugunto" },
];

function typeName(row: LiveRow, lang: "en" | "so") {
  return (
    adminLivestockName(row.animalType?.name, row.animalType?.nameSomali, lang) ||
    row.description ||
    row.animalTypeEnum ||
    "—"
  );
}

function categorySlug(row: LiveRow) {
  return (row.category?.slug || row.animalType?.category?.slug || "").trim().toLowerCase();
}

function photoLookupKey(season: PriceSeasonLabel, name: string) {
  return `${season}:${canonicalTypeName(name).toLowerCase()}`;
}

export function BrokerLiveSectorPrices() {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seasonTab, setSeasonTab] = useState<"all" | PriceSeasonLabel>("all");
  const [nooca, setNooca] = useState<LivestockCategorySlug | "all">("all");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/livestock/price-reports?status=APPROVED", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load live prices");
      const liveRaw = ((json.prices || []) as LiveRow[]).filter(
        (row) =>
          !row.catalogOnly &&
          String(row.status).toUpperCase() === "APPROVED" &&
          Number(row.price) > 0
      );
      const seen = new Set<string>();
      const live: LiveRow[] = [];
      for (const row of liveRaw) {
        const key = `${displaySeasonLabel(row.fallbackCategory)}:${canonicalTypeName(typeName(row, "en")).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        live.push(row);
      }
      setRows(live);

      const slugs = [
        ...new Set(
          live
            .map((row) => categorySlug(row))
            .filter(Boolean)
        ),
      ];
      const nextPhotos: Record<string, string> = {};
      await Promise.all(
        slugs.flatMap((slug) =>
          (["birimo", "sugunto"] as const).flatMap((season) =>
            (["listing", "card"] as const).map(async (scope) => {
              const photoRes = await fetch(
                `/api/livestock/type-photos?slug=${encodeURIComponent(slug)}&season=${season}&scope=${scope}`,
                { cache: "no-store", credentials: "include" }
              );
              const data = await photoRes.json().catch(() => ({}));
              const map =
                data.photos && typeof data.photos === "object"
                  ? (data.photos as Record<string, string>)
                  : {};
              const label = season === "sugunto" ? "Sugunto" : "Birimo";
              for (const [name, url] of Object.entries(map)) {
                if (!url) continue;
                nextPhotos[photoLookupKey(label, name)] = url;
                nextPhotos[`${slug}:${photoLookupKey(label, name)}`] = url;
              }
            })
          )
        )
      );
      setPhotos(nextPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load live prices");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (seasonTab !== "all" && displaySeasonLabel(row.fallbackCategory) !== seasonTab) {
        return false;
      }
      if (nooca !== "all" && categorySlug(row) !== nooca) return false;
      return true;
    });
  }, [rows, seasonTab, nooca]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <AdminPageHeader
        title={t("Price Market", "Qiimaha Suuqa")}
        subtitle={t(
          "Approved market prices — photo, type, and live rate.",
          "Qiimaha suuqa ee admin aqbalay — sawir, nooc, iyo sicir live."
        )}
        icon={Calculator}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex h-9 flex-nowrap items-center gap-1.5 overflow-x-auto">
        {SEASON_TABS.map((tab) => {
          const active = seasonTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSeasonTab(tab.key)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[12px] font-bold transition",
                active
                  ? tab.key === "Sugunto"
                    ? "border-teal-700 bg-teal-700 text-white"
                    : tab.key === "Birimo"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.key === "all"
                ? t("All live", "Dhammaan toos")
                : lang === "so"
                  ? publicSeasonLabelSo(tab.key)
                  : publicSeasonLabelEn(tab.key)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid min-h-[22rem] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="min-w-0">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("Type", "Nooca")}
            </label>
            <select
              className={inputCls}
              value={nooca}
              onChange={(e) =>
                setNooca(e.target.value as LivestockCategorySlug | "all")
              }
              aria-label={t("Select type", "Dooro nooca")}
            >
              <option value="all">
                {t("All types", "Dhammaan noocyada")}
              </option>
              {LIVESTOCK_CATEGORY_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {lang === "so" ? LIVESTOCK_COLUMNS[slug].somali : LIVESTOCK_COLUMNS[slug].english}
                </option>
              ))}
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="px-1 py-16 text-center text-sm font-semibold text-slate-400">
              {t(
                "No approved prices yet. They appear here after an admin accepts them.",
                "Qiimo la aqbalay kuma jiro weli. Marka admin aqbalo, halkan ayay ka soo baxaan."
              )}
            </p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {visible.map((row) => {
                const name = typeName(row, lang);
                const season = displaySeasonLabel(row.fallbackCategory);
                const slug = categorySlug(row);
                const seasonKey = String(season).toLowerCase().includes("sugunto")
                  ? "sugunto"
                  : "birimo";
                const photo =
                  photos[`${slug}:${photoLookupKey(season, name)}`] ||
                  photos[photoLookupKey(season, name)] ||
                  livestockTypePhoto(slug, name, seasonKey);
                return (
                  <article
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 bg-white px-3 py-3 sm:flex-nowrap sm:gap-4"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          className="h-full w-full object-cover bg-[#f7f4ee]"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {name.slice(0, 3)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("Live livestock · approved price", "Xoolaha live-ka ah · qiimaha la aqbalay")}
                      </p>
                    </div>
                    <div className="relative w-full sm:w-[8.5rem]">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                        $
                      </span>
                      <div className="flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm font-black tabular-nums text-slate-900">
                        {Number(row.price).toLocaleString()}
                      </div>
                    </div>
                    <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                      Live
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
