"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import {
  categoryTypePrices,
  LIVESTOCK_CATEGORY_PAGES,
  livestockTypeLabel,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import {
  animalTypeFromCategory,
  formatUsd,
  isLegacyGenderCategory,
  type NamedPriceField,
} from "@/lib/livestock-section-prices";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";

function priceMap(fields: NamedPriceField[], season: "birimo" | "sugunto") {
  const map = new Map<string, string>();
  for (const f of fields) {
    if (f.season !== season || isLegacyGenderCategory(f.category)) continue;
    map.set(f.name, formatUsd(f.price));
  }
  return map;
}

export function LivestockCategoryPriceBoard({
  category,
}: {
  category: LivestockCategorySlug;
}) {
  const { lang } = useLang();
  const meta = LIVESTOCK_CATEGORY_PAGES[category];
  const [liveFields, setLiveFields] = useState<NamedPriceField[]>([]);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    const animalType = animalTypeFromCategory(category);
    void fetch(`/api/livestock/section-prices?animalType=${animalType}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.fields)) setLiveFields(data.fields);
        else setLiveFields([]);
      })
      .catch(() => setLiveFields([]))
      .finally(() => setPricesLoaded(true));
  }, [category]);

  const rows = useMemo(() => {
    const birimoLive = priceMap(liveFields, "birimo");
    const suguntoLive = priceMap(liveFields, "sugunto");
    const birimoFallback = categoryTypePrices(category, "birimo");
    const hasLive = birimoLive.size > 0 || suguntoLive.size > 0;
    const names = hasLive
      ? Array.from(new Set([...birimoLive.keys(), ...suguntoLive.keys()]))
      : pricesLoaded
        ? []
        : birimoFallback.map((r) => r.name);
    return names.map((name) => ({
      name,
      birimo:
        birimoLive.get(name) ||
        (hasLive ? "—" : birimoFallback.find((r) => r.name === name)?.price) ||
        "—",
      sugunto:
        suguntoLive.get(name) ||
        (hasLive
          ? "—"
          : categoryTypePrices(category, "sugunto").find((r) => r.name === name)?.price) ||
        "—",
    }));
  }, [category, liveFields, pricesLoaded]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-md">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-teal-700 via-emerald-600 to-green-400 px-5 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50">
          <LineChart className="h-4 w-4 text-teal-700" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-tight text-white">
            <StableBilingual
              en="Current Prices"
              so="Qiimaha Hadda"
              lang={lang}
            />
          </h2>
          <p className="text-[10px] text-white/80">
            USD · {meta.somali}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead className="sticky top-0 bg-[#f7faf9] text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">
                <StableBilingual en="Type" so="Nooca" lang={lang} />
              </th>
              <th className="px-4 py-2.5">
                <StableBilingual en="First Class" so="Birimo" lang={lang} />
              </th>
              <th className="px-4 py-2.5">
                <StableBilingual en="Second Class" so="Sugunto" lang={lang} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.name}-${i}`} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-bold text-slate-900">
                  {livestockTypeLabel(row.name, lang)}
                </td>
                <td className="px-4 py-2.5 font-semibold tabular-nums text-amber-800">
                  {row.birimo}
                </td>
                <td className="px-4 py-2.5 font-semibold tabular-nums text-teal-800">
                  {row.sugunto}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
