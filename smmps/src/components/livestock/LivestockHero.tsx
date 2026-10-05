"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { LIVESTOCK_PHOTO_URLS } from "@/lib/livestock-data";
import { useLang } from "@/lib/language-context";

interface LivestockHeroProps {
  title?: string;
  description?: string;
}

/** Hero fits one screen at 100% zoom; market photo as professional background */
export function LivestockHero({ title }: LivestockHeroProps) {
  const customTitle = title?.trim();
  const { lang } = useLang();

  return (
    <section className="relative flex h-[390px] flex-col overflow-hidden sm:h-[450px] lg:h-[500px]">
      {/* Full-bleed market background — kept visible with lighter overlays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={LIVESTOCK_PHOTO_URLS.marketHero}
          alt=""
          fill
          priority
          quality={70}
          className="object-cover object-[50%_50%] scale-[1.02]"
          sizes="100vw"
        />
        {/* Soft tint only — photo stays clearly visible */}
        <div className="absolute inset-0 bg-emerald-950/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/70 via-emerald-950/30 to-emerald-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/55 via-transparent to-emerald-950/25" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="rounded-2xl bg-emerald-950/45 p-4 backdrop-blur-[2px] sm:p-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <h1
            className="animate-fade-in-up max-w-xl text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] min-[360px]:text-[2rem] sm:text-4xl lg:text-[2.75rem] xl:text-5xl"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            {customTitle || (
              lang === "so" ? (
                <>
                  Qiimaha Suuqa <span className="text-amber-300">Xoolaha</span>
                </>
              ) : (
                <>
                  Livestock Market <span className="text-amber-300">Prices</span>
                </>
              )
            )}
          </h1>

          <div
            className="animate-fade-in-up mt-4 flex items-center gap-2 text-sm font-medium text-amber-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:mt-5 sm:text-[15px]"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            <MapPin
              className="h-4 w-4 shrink-0 text-amber-300"
              strokeWidth={2.25}
            />
            <StableBilingual
              en="Banadir Region · Mogadishu, Somalia"
              so="Gobolka Banaadir · Muqdisho, Soomaaliya"
              lang={lang}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
