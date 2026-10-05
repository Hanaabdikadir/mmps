"use client";

import {
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_IMAGE_FOCUS,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    key: "geel" as const,
    en: "Camels",
    so: "Geelka",
    ring: "ring-orange-300/90",
  },
  {
    key: "loda" as const,
    en: "Cattle",
    so: "Lo'da",
    ring: "ring-emerald-300/90",
  },
  {
    key: "arri" as const,
    en: "Sheep & Goats",
    so: "Ari & Ido",
    ring: "ring-teal-300/90",
  },
] as const;

const TITLE = { en: "Livestock Types", so: "Noocyada Xoolaha" } as const;
const SUBTITLE = {
  en: "Official type names for Camels, Cattle, and Sheep & Goats.",
  so: "Magacyada rasmiga ah ee noocyada Geelka, Lo'da, iyo Ari & Ido.",
} as const;

type Props = {
  /** Optional CMS override — shown as-is when set */
  titleOverride?: string;
  subtitleOverride?: string;
};

export function LivestockTypesHero({
  titleOverride,
  subtitleOverride,
}: Props) {
  const { lang } = useLang();
  const customTitle = titleOverride?.trim();
  const customSubtitle = subtitleOverride?.trim();

  return (
    <section className="relative h-[520px] overflow-hidden p-[15px] hero-pattern">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-950/25 via-transparent to-lime-400/10" />

      <div className="relative mx-auto flex h-full max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="min-w-0 text-left">
          <p className="animate-fade-in-up text-[18px] font-bold uppercase tracking-[0.14em] text-lime-300 sm:text-[20px]">
            <StableBilingual
              en="Market Categories"
              so="Qaybaha Suuqa"
              lang={lang}
            />
          </p>

          <h1
            className="animate-fade-in-up mt-3 text-[40px] font-extrabold leading-tight tracking-tight text-white sm:text-[48px] lg:text-[56px]"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            {customTitle ? (
              customTitle
            ) : (
              <StableBilingual en={TITLE.en} so={TITLE.so} lang={lang} />
            )}
          </h1>

          {customSubtitle ? (
            <p
              className="animate-fade-in-up mt-4 max-w-3xl text-[18px] leading-relaxed text-emerald-50/95 sm:text-[20px]"
              style={{ animationDelay: "160ms", animationFillMode: "both" }}
            >
              {customSubtitle}
            </p>
          ) : (
            <div
              className="animate-fade-in-up mt-4 max-w-3xl"
              style={{ animationDelay: "160ms", animationFillMode: "both" }}
            >
              <StableBilingual
                en={SUBTITLE.en}
                so={SUBTITLE.so}
                lang={lang}
                multiline
                as="p"
                className="text-[18px] leading-relaxed text-emerald-50/95 sm:text-[20px]"
              />
            </div>
          )}

          <ul
            className="animate-fade-in-up mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3"
            style={{ animationDelay: "240ms", animationFillMode: "both" }}
          >
            {CATEGORIES.map((cat) => {
              const animal = LIVESTOCK_ANIMAL_IMAGES[cat.key];
              return (
                <li
                  key={cat.key}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 backdrop-blur-[2px]",
                    "transition-colors duration-200 hover:bg-white/16"
                  )}
                >
                  <span
                    className={cn(
                      "relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2",
                      cat.ring
                    )}
                  >
                    <LivestockCategoryPhoto
                      src={animal.url}
                      alt={lang === "en" ? cat.en : cat.so}
                      focus={LIVESTOCK_IMAGE_FOCUS[cat.key]}
                    />
                  </span>
                  <span className="pr-1 text-[12px] font-bold tracking-wide text-white sm:text-[13px]">
                    <StableBilingual en={cat.en} so={cat.so} lang={lang} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
