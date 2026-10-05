"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";

interface WaterHeroProps {
  title?: string;
  totalRecords?: number;
  providerCount?: number;
}

export function WaterHero({ title }: WaterHeroProps) {
  const customTitle = title?.trim();
  const { lang, t } = useLang();

  return (
    <section className="relative flex h-[390px] flex-col overflow-hidden sm:h-[450px] lg:h-[500px]">
      {/* Full-bleed water background photo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/images/water/water-agency-hero.jpg"
          alt="Xarunta Wakaaladda Biyaha Muqdisho"
          fill
          priority
          quality={95}
          className="object-cover object-[50%_42%] scale-[1.02]"
          sizes="100vw"
        />
        {/* Light sky tint — keep the water-agency photo clearly visible */}
        <div className="absolute inset-0 bg-sky-950/18" />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950/52 via-sky-950/18 to-sky-950/08" />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-950/40 via-transparent to-sky-950/14" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-300/12 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="rounded-2xl bg-sky-950/40 p-4 backdrop-blur-[2px] sm:p-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <h1
            className="animate-fade-in-up max-w-xl text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] min-[360px]:text-[2rem] sm:text-4xl lg:text-[2.75rem] xl:text-5xl"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            {customTitle || (
              lang === "so" ? (
                <>
                  Adeegga <span className="text-sky-300">Biyaha</span>
                </>
              ) : (
                <>
                  Water Supply <span className="text-sky-300">Services</span>
                </>
              )
            )}
          </h1>

          <p className="mt-4 text-lg font-semibold leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-xl">
            {t("Follow Water Prices", "La soco qiimaha biyaha")}
          </p>

          <div
            className="animate-fade-in-up mt-4 flex items-center gap-2 text-sm font-medium text-sky-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:mt-5 sm:text-[15px]"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            <MapPin
              className="h-4 w-4 shrink-0 text-sky-300"
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
