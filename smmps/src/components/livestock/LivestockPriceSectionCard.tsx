"use client";

import Link from "next/link";
import {
  LIVESTOCK_COLUMNS,
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_IMAGE_FOCUS,
  SECTION_THEMES,
  categoryTypePrices,
  livestockTypeLabel,
  type LivestockPriceSection,
  type LivestockColumnKey,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import {
  livestockTypeHref,
  livestockTypeVisual,
} from "@/lib/livestock-type-visuals";
import { canonicalTypeName } from "@/lib/livestock-section-prices";
import { cn } from "@/lib/utils";
import { CloudRain, ImagePlus, RefreshCw, Snowflake, Sun, type LucideIcon } from "lucide-react";
import { useLang } from "@/lib/language-context";

interface LivestockPriceSectionCardProps {
  section: LivestockPriceSection;
  index: number;
  category?: string;
  /** Clean category-page layout (Birimo / Sugunto) */
  compact?: boolean;
  categoryLabel?: string;
  /** Geelka Birimo (and similar) — show type name + photo grid */
  typePrices?: {
    name: string;
    nameEn?: string;
    price: string;
    altPrice?: string;
    altLabel?: string;
    ageClass?: string | null;
    originPlace?: string | null;
  }[];
  season?: "birimo" | "sugunto";
  /** Public livestock pages — type cards open market listings */
  linkTypes?: boolean;
  /** null = still loading season photos (avoid flashing old/default images) */
  typeImages?: Record<string, string> | null;
  /** Livestock admin: click a type card to upload its public photo */
  onPickTypePhoto?: (typeName: string, file: File) => void;
  /** Livestock admin Birimo/Sugunto: names only, no Super Admin card photos */
  hideTypePhotos?: boolean;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  "barimada-caadiga": Sun,
  sekontada: RefreshCw,
  "barimada-jilaal": Snowflake,
  "sekontada-alt": CloudRain,
};

function orderGenderRows(section: LivestockPriceSection) {
  const isMale = (row: (typeof section.rows)[number]) =>
    row.labelEn === "Male" || row.label === "Labka" || row.label === "Lab";
  const male = section.rows.find(isMale);
  const female = section.rows.find((r) => !isMale(r));
  return [male, female].filter(
    (row): row is (typeof section.rows)[number] => row !== undefined
  );
}

function normalizePrice(price: string) {
  return price.trim().replace(/\s*[–—]\s*/g, " - ");
}

function PriceDisplay({
  price,
  theme,
  large = false,
  centered = false,
}: {
  price: string;
  theme: (typeof SECTION_THEMES)[keyof typeof SECTION_THEMES];
  large?: boolean;
  centered?: boolean;
}) {
  const value = normalizePrice(price);

  return (
    <div
      className={cn(
        "w-full min-w-0 font-black tabular-nums tracking-tight",
        large ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base",
        centered && "flex items-center justify-center text-center",
        theme.accent
      )}
    >
      <span className="inline-block max-w-full whitespace-nowrap">{value}</span>
    </div>
  );
}

/** Clean Birimo / Sugunto card — Lab/Dhedig or Geelka type prices */
function CategoryFocusCard({
  section,
  category,
  categoryLabel,
  typePrices,
  season = "birimo",
  linkTypes = true,
  typeImages,
  onPickTypePhoto,
  hideTypePhotos = false,
}: Required<Pick<LivestockPriceSectionCardProps, "section" | "category">> & {
  categoryLabel?: string;
  typePrices?: {
    name: string;
    nameEn?: string;
    price: string;
    altPrice?: string;
    altLabel?: string;
    ageClass?: string | null;
    originPlace?: string | null;
  }[];
  season?: "birimo" | "sugunto";
  linkTypes?: boolean;
  typeImages?: Record<string, string> | null;
  onPickTypePhoto?: (typeName: string, file: File) => void;
  hideTypePhotos?: boolean;
}) {
  const { lang, t } = useLang();
  const theme = SECTION_THEMES[section.theme];
  const genderRows = orderGenderRows(section);
  const rawGridPrices = Array.isArray(typePrices)
    ? typePrices
    : categoryTypePrices(category, season).map((row) => ({
          name: row.name,
          nameEn: row.nameEn,
          price: row.price,
        }));
  const gridPrices = (() => {
    const seen = new Set<string>();
    return rawGridPrices.filter((row) => {
      const key = `${String(row.name || "").trim().toLowerCase()}|${String(row.nameEn || "").trim().toLowerCase()}`;
      if (!key.replace(/\|/g, "") || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const useTypeGrid = true;
  const photosLoading = !hideTypePhotos && typeImages == null;

  return (
    <section id={section.id} className="livestock-section">
      {useTypeGrid ? (
          gridPrices.length === 0 ? (
            <p className="rounded-2xl bg-white px-5 py-12 text-center text-base font-semibold text-slate-500">
              {t(
                "No livestock types have been entered for this season yet.",
                "Weli lama soo gelin noocyada xoolaha ee xilligan."
              )}
            </p>
          ) : photosLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 sm:gap-4">
              {Array.from({ length: Math.min(Math.max(gridPrices.length, 1), 8) }).map((_, i) => (
                <div
                  key={`photo-skel-${i}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[16/9] w-full animate-pulse bg-slate-200/80" />
                  <div className="space-y-2 px-3 py-3 sm:px-4 sm:py-3.5">
                    <div className="mx-auto h-5 w-28 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 sm:gap-4">
            {gridPrices.map((row, i) => {
              const uploaded =
                typeImages?.[canonicalTypeName(row.name)] ||
                typeImages?.[row.name];
              const photosLoading = typeImages === null;
              const visual = livestockTypeVisual(
                category || "geel",
                row.name,
                season || "birimo",
                uploaded
              );
              const className = cn(
                "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm",
                (linkTypes || onPickTypePhoto) &&
                  "transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                onPickTypePhoto && "cursor-pointer"
              );
              const body = (
                <>
                  {hideTypePhotos ? (
                    <div className="flex flex-col items-center gap-2 px-3 py-4 sm:px-4 sm:py-5">
                    <p className="truncate text-base font-black text-gray-900 sm:text-lg">
                      {livestockTypeLabel(row.name, lang) ||
                        (lang === "so" ? row.name : row.nameEn) ||
                        row.name}
                    </p>
                    </div>
                  ) : (
                    <>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#f7f4ee]">
                    {photosLoading && !uploaded ? (
                      <div className="absolute inset-0 animate-pulse bg-stone-200" />
                    ) : (
                    <LivestockCategoryPhoto
                      src={visual.src}
                      alt={livestockTypeLabel(row.name, lang)}
                      focus={visual.focus}
                      fit="cover"
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                    )}
                    {onPickTypePhoto ? (
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {t("Upload photo", "Soo geli sawir")}
                      </span>
                    ) : null}
                  </div>
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <p className="truncate text-base font-black text-gray-900 sm:text-lg">
                      {livestockTypeLabel(row.name, lang) ||
                        (lang === "so" ? row.name : row.nameEn) ||
                        row.name}
                    </p>
                  </div>
                    </>
                  )}
                </>
              );
              if (onPickTypePhoto) {
                return (
                  <label
                    key={`${season}-${row.name}-${i}`}
                    className={className}
                  >
                    {body}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) onPickTypePhoto(row.name, file);
                      }}
                    />
                  </label>
                );
              }
              return linkTypes ? (
                <Link
                  key={`${season}-${row.name}-${i}`}
                  href={livestockTypeHref(
                    category || "geel",
                    season || "birimo",
                    row.name
                  )}
                  prefetch
                  className={className}
                >
                  {body}
                </Link>
              ) : (
                <div key={`${season}-${row.name}-${i}`} className={className}>
                  {body}
                </div>
              );
            })}
          </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 min-[420px]:grid-cols-2 sm:gap-5 sm:p-6">
            {genderRows.map((row, i) => {
              const price = row[category as LivestockColumnKey];
              const isMale = row.labelEn === "Male" || row.label === "Labka" || row.label === "Lab";
              const displayLabel = isMale ? t("Male", "Lab") : t("Female", "Dhedig");
              return (
                <div
                  key={`${row.label}-${i}`}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border bg-gradient-to-br px-4 py-6 text-center sm:py-8",
                    theme.border,
                    theme.card
                  )}
                >
                  <span
                    className={cn(
                      "mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm",
                      theme.header
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="text-xl font-black text-gray-900 sm:text-2xl">
                    {displayLabel}
                  </p>
                  <div className="mt-4">
                    <PriceDisplay price={price} theme={theme} large centered />
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </section>
  );
}

function CategoryPriceCard({
  section,
  index,
  category,
}: Required<Pick<LivestockPriceSectionCardProps, "section" | "index" | "category">>) {
  const { lang, t } = useLang();
  const theme = SECTION_THEMES[section.theme];
  const catKey = category as LivestockColumnKey;
  const col = LIVESTOCK_COLUMNS[catKey];
  const animal = LIVESTOCK_ANIMAL_IMAGES[catKey];
  const Icon = SECTION_ICONS[section.id] ?? Sun;
  const sectionNo = String(index + 1).padStart(2, "0");
  const genderRows = orderGenderRows(section);
  const title = lang === "so" ? section.titleSomali : (section.titleEnglish || section.titleSomali);
  const colLabel = lang === "so" ? col.somali : col.english;

  return (
    <section id={section.id} className="livestock-section scroll-mt-36">
      <article
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl",
          theme.border
        )}
      >
        <div className={cn("relative shrink-0 overflow-hidden", theme.header)}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex h-[7.75rem] flex-col gap-3 p-5 sm:h-[7.25rem] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                  <Icon className="h-3 w-3" />
                  {t(`Section ${sectionNo}`, `Qaybta ${sectionNo}`)}
                </span>
                <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-semibold text-white/90">
                  {colLabel}
                </span>
              </div>
              <h2 className="line-clamp-2 text-sm font-black leading-tight tracking-wide text-white sm:text-base">
                {title}
              </h2>
            </div>

            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/40 sm:h-20 sm:w-20">
              <LivestockCategoryPhoto
                src={animal.url}
                alt={colLabel}
                focus={LIVESTOCK_IMAGE_FOCUS[catKey]}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </div>

        {section.description ? (
          <div
            className={cn(
              "flex h-10 shrink-0 items-center justify-center border-b px-4 text-center text-xs font-medium leading-tight sm:text-sm",
              theme.badge
            )}
          >
            <p className="line-clamp-1">{section.description}</p>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-4 sm:p-5">
          {genderRows.map((row, i) => {
            const price = row[catKey];
            const isMale = row.labelEn === "Male" || row.label === "Labka" || row.label === "Lab";
            const displayLabel = isMale ? t("Male", "Lab") : t("Female", "Dhedig");
            return (
              <div
                key={`${row.label}-${i}`}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-2 bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md",
                  theme.border,
                  theme.card
                )}
              >
                <div
                  className={cn(
                    "absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-20",
                    theme.header
                  )}
                />

                <div className="relative flex min-h-[4.25rem] shrink-0 items-center border-b border-white/60 px-4 py-3">
                  <div className="flex w-full items-center justify-center gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-md",
                        theme.header
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="text-center sm:text-left">
                      <p className="text-lg font-black text-gray-900">{displayLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="relative flex h-[5.5rem] shrink-0 flex-col items-center justify-center px-3 py-3 text-center sm:h-[5.75rem]">
                  <PriceDisplay price={price} theme={theme} large centered />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("10-Year Reference Price", "Qiimaha Tixraaca · 10 sano")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function OverviewPriceTable({
  section,
  index,
}: Pick<LivestockPriceSectionCardProps, "section" | "index">) {
  const { lang, t } = useLang();
  const theme = SECTION_THEMES[section.theme];
  const cols = Object.values(LIVESTOCK_COLUMNS);
  const Icon = SECTION_ICONS[section.id] ?? Sun;
  const sectionNo = String(index + 1).padStart(2, "0");
  const genderRows = orderGenderRows(section);
  const title = lang === "so" ? section.titleSomali : (section.titleEnglish || section.titleSomali);

  const animalItems = [
    { key: "geel", label: t("Camels", "Geelka") },
    { key: "loda", label: t("Cattle", "Lo'da") },
    { key: "arri", label: t("Sheep & Goats", "Ari & Ido") },
  ] as const;

  return (
    <section id={section.id} className="livestock-section h-full scroll-mt-36">
      <article
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl",
          theme.border
        )}
      >
        <div className={cn("relative shrink-0 overflow-hidden", theme.header)}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex min-h-[6.5rem] flex-col gap-2 p-4 sm:min-h-[6.25rem] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                  <Icon className="h-3 w-3" />
                  {t(`Section ${sectionNo}`, `Qaybta ${sectionNo}`)}
                </span>
                <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-semibold text-white/90">
                  {t("Camels · Cattle · Sheep & Goats", "Geelka · Lo'da · Ari & Ido")}
                </span>
              </div>
              <h2 className="line-clamp-2 text-sm font-black leading-tight tracking-wide text-white sm:text-[15px]">
                {title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center -space-x-2 sm:-space-x-1.5">
              {animalItems.map((item, i) => {
                const animal = LIVESTOCK_ANIMAL_IMAGES[item.key as keyof typeof LIVESTOCK_ANIMAL_IMAGES];
                return (
                  <div
                    key={item.key}
                    className="relative h-12 w-12 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/50 sm:h-14 sm:w-14"
                    style={{ zIndex: 3 - i }}
                    title={item.label}
                  >
                    <LivestockCategoryPhoto
                      src={animal.url}
                      alt={item.label}
                      focus={LIVESTOCK_IMAGE_FOCUS[item.key as keyof typeof LIVESTOCK_IMAGE_FOCUS]}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {section.description ? (
          <div
            className={cn(
              "flex h-10 shrink-0 items-center justify-center border-b px-4 text-center text-xs font-medium leading-tight sm:text-sm",
              theme.badge
            )}
          >
            <p className="line-clamp-1">{section.description}</p>
          </div>
        ) : null}

        <div className="grid flex-1 grid-cols-1 gap-3 p-3 min-[420px]:grid-cols-2 sm:gap-3 sm:p-4">
          {genderRows.map((row, i) => {
            const isMale = row.labelEn === "Male" || row.label === "Labka" || row.label === "Lab";
            const displayLabel = isMale ? t("Male", "Lab") : t("Female", "Dhedig");
            return (
              <div
                key={`${row.label}-${i}`}
                className={cn(
                  "relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-xl border-2 bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md",
                  theme.border,
                  theme.card
                )}
              >
                <div
                  className={cn(
                    "absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-20",
                    theme.header
                  )}
                />

                <div className="relative flex shrink-0 items-center border-b border-white/60 px-3 py-2.5">
                  <div className="flex w-full items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-md",
                        theme.header
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[20px] font-black leading-none text-gray-900">
                        {displayLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-1 flex-col justify-center gap-2 px-2.5 py-2.5 sm:px-3 sm:py-3">
                  {cols.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-2 ring-1 ring-black/5"
                    >
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10">
                        <LivestockCategoryPhoto
                          src={LIVESTOCK_ANIMAL_IMAGES[col.key].url}
                          alt={col.somali}
                          focus={LIVESTOCK_IMAGE_FOCUS[col.key]}
                        />
                      </span>
                      <p className="min-w-0 flex-1 text-[13px] font-extrabold leading-tight text-gray-900 sm:text-[14px]">
                        {col.somali}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-right text-[16px] font-black leading-none tabular-nums sm:text-[18px]",
                          theme.accent
                        )}
                      >
                        {normalizePrice(row[col.key])}
                      </span>
                    </div>
                  ))}
                  <p className="pt-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    Qiimaha Tixraaca · 10 sano
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

export function LivestockPriceSectionCard({
  section,
  index,
  category,
  compact = false,
  categoryLabel,
  typePrices,
  season,
  linkTypes,
  typeImages,
  onPickTypePhoto,
  hideTypePhotos,
}: LivestockPriceSectionCardProps) {
  if (category && compact) {
    return (
      <CategoryFocusCard
        section={section}
        category={category}
        categoryLabel={categoryLabel}
        typePrices={typePrices}
        season={season}
        linkTypes={linkTypes}
        typeImages={typeImages}
        onPickTypePhoto={onPickTypePhoto}
        hideTypePhotos={hideTypePhotos}
      />
    );
  }
  if (category) {
    return <CategoryPriceCard section={section} index={index} category={category} />;
  }
  return <OverviewPriceTable section={section} index={index} />;
}
