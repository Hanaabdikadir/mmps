"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";

interface ElectricityHeroProps {
  title?: string;
  totalRecords?: number;
  providerCount?: number;
}

export function ElectricityHero({ title }: ElectricityHeroProps) {
  const customTitle = title?.trim();
  const { lang, t } = useLang();

  return (
    <section className="relative flex h-[390px] flex-col overflow-hidden sm:h-[450px] lg:h-[500px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/images/electricity/electricity-hero-bg.jpg"
          alt="Electricity"
          fill
          priority
          quality={95}
          className="object-cover object-[50%_50%] scale-[1.02]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-slate-950/28" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/28 to-slate-950/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/18" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="rounded-2xl bg-slate-950/45 p-4 backdrop-blur-[2px] sm:p-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <h1
            className="animate-fade-in-up max-w-xl text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] min-[360px]:text-[2rem] sm:text-4xl lg:text-[2.75rem] xl:text-5xl"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            {customTitle || (
              lang === "so" ? (
                <>
                  Adeegga <span className="text-amber-400">Korontada</span>
                </>
              ) : (
                <>
                  Electricity <span className="text-amber-400">Services</span>
                </>
              )
            )}
          </h1>

          <p className="mt-4 text-lg font-semibold leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-xl">
            {t("Follow Electricity Prices", "La soco qiimaha korontada")}
          </p>

          <div
            className="animate-fade-in-up mt-4 flex items-center gap-2 text-sm font-medium text-amber-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:mt-5 sm:text-[15px]"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            <MapPin
              className="h-4 w-4 shrink-0 text-amber-400"
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
