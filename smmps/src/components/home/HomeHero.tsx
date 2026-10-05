"use client";

import Link from "next/link";
import { Beef, Droplets, MapPin, Zap } from "lucide-react";
import { SystemBrand } from "@/components/SystemBrand";
import { HOME_SECTORS } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { StableBilingual, StablePair } from "@/components/ui/StableBilingual";
import type { PublicMarketSector } from "@/lib/market-availability";

const SECTOR_ICONS = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
} as const;

type ActiveSectors = Record<PublicMarketSector, boolean>;

export function HomeHero({
  activeSectors,
}: {
  activeSectors?: ActiveSectors;
}) {
  const { lang } = useLang();
  const T = TRANSLATIONS.home;
  const sectors = HOME_SECTORS.filter((sector) =>
    activeSectors ? activeSectors[sector.id] !== false : true
  );

  return (
    <section className="relative h-[550px] overflow-hidden home-hero-pattern">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-20 h-[32rem] w-[32rem] rounded-full bg-amber-300/18 blur-[90px]" />
        <div className="absolute -bottom-32 -left-20 h-[30rem] w-[30rem] rounded-full bg-teal-300/16 blur-[100px]" />
        <div className="absolute left-[42%] top-[28%] h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.15' fill='%23ffffff' fill-opacity='0.55'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,20,18,0.62)_0%,rgba(1,20,18,0.28)_48%,transparent_78%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#011916]/70 to-transparent" />
      </div>

      <div className="relative mx-auto flex h-[550px] max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="max-w-2xl">
          <SystemBrand layout="hero" />
          <span className="mt-4 block h-[3px] w-16 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300" />

          <StableBilingual
            en={T.mission.en}
            so={T.mission.so}
            lang={lang}
            multiline
            as="p"
            className="font-hero mt-6 max-w-2xl text-pretty text-left text-[15px] font-semibold leading-7 tracking-[0.01em] text-white sm:text-[1.125rem] sm:leading-8"
          />

          <div className="font-hero mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-left text-sm font-medium tracking-wide text-white/95 backdrop-blur-sm">
            <MapPin className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2.25} />
            <StablePair pair={T.location} lang={lang} />
          </div>

          {sectors.length > 0 ? (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {sectors.map((sector) => {
                  const Icon = SECTOR_ICONS[sector.id];
                  return (
                    <Link
                      key={sector.id}
                      href={sector.href}
                      prefetch
                      className={cn(
                        "font-hero inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] ring-1 ring-white/20 transition duration-200 hover:brightness-110 hover:ring-white/40 sm:w-auto",
                        sector.gradient
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                      <StableBilingual
                        en={sector.english}
                        so={sector.somali}
                        lang={lang}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="section-divider mx-auto max-w-7xl" />
    </section>
  );
}
