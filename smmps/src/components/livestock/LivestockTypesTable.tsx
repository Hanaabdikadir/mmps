"use client";

import {
  LIVESTOCK_COLUMNS,
  LIVESTOCK_TYPES,
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_CATEGORY_PAGES,
  LIVESTOCK_CATEGORY_SLUGS,
  LIVESTOCK_IMAGE_FOCUS,
  livestockTypeLabel,
  type LivestockColumnKey,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

interface LivestockTypesTableProps {
  category?: LivestockColumnKey;
}

function OverviewTypesSection() {
  const { lang, t } = useLang();
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:grid lg:grid-cols-3 lg:gap-5 lg:p-6">
      {LIVESTOCK_CATEGORY_SLUGS.map((slug) => {
        const col = LIVESTOCK_COLUMNS[slug];
        const page = LIVESTOCK_CATEGORY_PAGES[slug];
        const animal = LIVESTOCK_ANIMAL_IMAGES[slug];
        const focus = LIVESTOCK_IMAGE_FOCUS[slug];
        const types = LIVESTOCK_TYPES.filter((row) => row[slug]).map((row) => ({
          no: row.no,
          name: row[slug] as string,
        }));
        const title = lang === "so" ? col.somali : col.english;

        return (
          <article
            key={slug}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md",
              page.border,
              page.bg
            )}
          >
            {/* Photo — full card width, proper aspect ratio */}
            <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-44">
              <LivestockCategoryPhoto
                src={animal.url}
                alt={title}
                focus={focus}
                priority={slug === "geel"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
                  page.gradient
                )}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="text-xl font-black text-white drop-shadow-md sm:text-2xl">
                  {title}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-white/85">
                  {t(
                    `${types.length} types`,
                    `${types.length} nooc`
                  )}
                </p>
              </div>
            </div>

            {/* Type list */}
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <ol className="space-y-2">
                {types.map(({ no, name }) => (
                  <li
                    key={`${slug}-${no}`}
                    className="flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-gray-100"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white shadow-sm",
                        page.gradient
                      )}
                    >
                      {no}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {livestockTypeLabel(name, lang)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function LivestockTypesTable({ category }: LivestockTypesTableProps) {
  const { lang, t } = useLang();
  const rows = category
    ? LIVESTOCK_TYPES.filter((row) => row[category])
    : LIVESTOCK_TYPES;

  const page = category ? LIVESTOCK_CATEGORY_PAGES[category] : null;

  const headerGradient = page
    ? page.gradient
    : "from-emerald-600 via-amber-500 to-teal-600";

  return (
    <section id="noocyada" className="livestock-section scroll-mt-36">
      <div
        className={cn(
          "overflow-hidden rounded-3xl border bg-white shadow-[var(--shadow-lg)]",
          page?.border ?? "border-emerald-200/80"
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-gradient-to-r px-6 py-8 text-center sm:py-10",
            headerGradient
          )}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-wide text-white sm:text-3xl">
              {category
                ? lang === "so"
                  ? `NOOCYADA ${LIVESTOCK_COLUMNS[category].somali.toUpperCase()}`
                  : `${LIVESTOCK_COLUMNS[category].english.toUpperCase()} TYPES`
                : t("LIVESTOCK TYPES", "NOOCYADA XOOLAHA")}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-white/90 sm:text-base">
              {category
                ? lang === "so"
                  ? LIVESTOCK_COLUMNS[category].somali
                  : LIVESTOCK_COLUMNS[category].english
                : t("Livestock types used in the market", "Noocyada xoolaha ee suuqa")}
            </p>
          </div>
        </div>

        {!category && <OverviewTypesSection />}

        {category && (
          <>
            <div className={cn("border-b p-5 sm:p-6", page?.border ?? "border-emerald-100")}>
              <div className="relative mx-auto aspect-[16/9] max-h-64 w-full max-w-2xl overflow-hidden rounded-2xl shadow-md">
                <LivestockCategoryPhoto
                  src={LIVESTOCK_ANIMAL_IMAGES[category].url}
                  alt={LIVESTOCK_COLUMNS[category].somali}
                  focus={LIVESTOCK_IMAGE_FOCUS[category]}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-2xl font-black text-white">
                    {lang === "so"
                      ? LIVESTOCK_COLUMNS[category].somali
                      : LIVESTOCK_COLUMNS[category].english}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((row) => {
                  const value = row[category];
                  return (
                    <div
                      key={row.no}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3",
                        page?.border ?? "border-emerald-100",
                        page?.bg ?? "bg-emerald-50/30"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white",
                          page?.gradient ?? "from-emerald-600 to-green-700"
                        )}
                      >
                        {row.no}
                      </span>
                      <span className="text-base font-bold text-gray-900">
                        {livestockTypeLabel(value, lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
