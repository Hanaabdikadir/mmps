"use client";

import Image from "next/image";
import { Beef, MapPin } from "lucide-react";
import {
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_CATEGORY_PAGES,
  LIVESTOCK_IMAGE_FOCUS,
  LIVESTOCK_PHOTO_URLS,
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import { HeroLogoBadge } from "@/components/HeroLogoBadge";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";

interface LivestockCategoryHeroProps {
  category: string;
  title: string;
  titleEn?: string;
  titleSo?: string;
  description: string;
  image?: string | null;
  marketLabel?: string;
}

/** Same chrome as water / electricity provider portals */
export function LivestockCategoryHero({
  category,
  title,
  titleEn,
  titleSo,
  image,
  marketLabel,
}: LivestockCategoryHeroProps) {
  const { lang } = useLang();
  const known = isLivestockCategorySlug(category);
  const meta = known ? LIVESTOCK_CATEGORY_PAGES[category] : null;
  const animal = known ? LIVESTOCK_ANIMAL_IMAGES[category] : null;
  const photo =
    image?.trim() || animal?.url || LIVESTOCK_PHOTO_URLS.marketHero;
  const body = meta
    ? lang === "so"
      ? meta.descriptionSo
      : meta.descriptionEn
    : "";
  const headingEn = titleEn?.trim() || meta?.english || title;
  const headingSo = titleSo?.trim() || meta?.somali || title;

  return (
    <section className="relative h-[240px] overflow-hidden sm:h-[280px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={photo}
          alt={`${animal?.somali || title} — ${animal?.english || title}`}
          fill
          priority
          quality={80}
          className="object-cover scale-[1.02]"
          style={{
            objectPosition: known
              ? LIVESTOCK_IMAGE_FOCUS[category]
              : "50% 45%",
          }}
          sizes="100vw"
          unoptimized={photo.startsWith("/uploads/")}
        />
        <div className="absolute inset-0 bg-emerald-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-950/45 to-emerald-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/65 via-transparent to-emerald-950/25" />
      </div>

      <div className="relative mx-auto flex h-[240px] max-w-7xl items-center px-3 min-[360px]:px-4 sm:h-[280px] sm:px-6">
        <div className="max-w-3xl animate-fade-in-up rounded-2xl bg-emerald-950/40 p-4 backdrop-blur-[2px] sm:p-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mb-4 flex items-center gap-4">
            <HeroLogoBadge
              image={photo}
              imageAlt={`${animal?.somali || title} — ${animal?.english || title}`}
              imageBg="bg-white"
              imageObjectFit="cover"
              icon={Beef}
              gradient="from-amber-500 to-orange-500"
              shadowClass="shadow-emerald-900/30"
              priority
              className="h-16 w-16 rounded-2xl p-1"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-300/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                <StableBilingual
                  en={meta?.eyebrowEn || "Livestock"}
                  so={meta?.eyebrowSo || "Xoolaha"}
                  lang={lang}
                />
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl">
                <span className="shimmer-text">
                  <StableBilingual en={headingEn} so={headingSo} lang={lang} />
                </span>
              </h1>
            </div>
          </div>

          <p className="text-base leading-relaxed text-emerald-50/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:text-lg">
            {body}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-emerald-50/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-red-500" strokeWidth={2.5} />
              <StableBilingual
                en={
                  marketLabel?.trim()
                    ? livestockMarketDisplayName(marketLabel, "en") || marketLabel
                    : "Banadir Region · Mogadishu, Somalia"
                }
                so={
                  marketLabel?.trim()
                    ? livestockMarketDisplayName(marketLabel, "so") || marketLabel
                    : "Gobolka Banaadir · Muqdisho, Soomaaliya"
                }
                lang={lang}
              />
            </span>
          </div>
        </div>
      </div>

      <div className="section-divider mx-auto max-w-7xl" />
    </section>
  );
}
