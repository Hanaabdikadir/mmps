"use client";

import Link from "next/link";
import { Beef, Building2, Droplets, Zap, type LucideIcon } from "lucide-react";
import { HomeProviderCardLogo } from "@/components/home/HomeProviderCardLogo";
import { StableBilingual } from "@/components/ui/StableBilingual";
import {
  HOME_MARKET_CARD_BODY_H,
  HOME_MARKET_CARD_H,
  HOME_MARKET_CARD_HEADER_H,
} from "@/lib/home-card-layout";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

export interface HomeProviderCardData {
  id: string;
  href: string;
  name: string;
  cardLabel: string;
  cardLabelSo?: string;
  cardTitle: string;
  /** Somali title when different from English cardTitle */
  cardTitleSo?: string;
  pillLabel: string;
  /** Somali pill when different from English pillLabel */
  pillLabelSo?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBg?: string;
  imageFocus?: string;
  cardImageCrop?: "logo" | "banner";
  imageBlendMultiply?: boolean;
  headerBg: string;
  cardBodyTint: string;
  accentText: string;
  accentBg: string;
  cardBorder: string;
  cardDivider: string;
  viewBtnText?: string;
}

interface HomeProviderCardsProps {
  providers: HomeProviderCardData[];
  sectionClassName?: string;
  sectionId?: string;
}

/** Resolve fallback icon on the client — Lucide components cannot cross the RSC boundary. */
function fallbackIcon(sectionClassName?: string): LucideIcon {
  if (sectionClassName?.includes("water")) return Droplets;
  if (sectionClassName?.includes("electricity")) return Zap;
  if (sectionClassName?.includes("livestock")) return Beef;
  return Building2;
}

/**
 * Shared provider cards (water / electricity / livestock).
 * Water and electricity: whole-card Link only (no View/Daawo footer).
 * Livestock: keeps the View CTA footer.
 */
export function HomeProviderCards({
  providers,
  sectionClassName,
  sectionId,
}: HomeProviderCardsProps) {
  const { lang } = useLang();
  const Icon = fallbackIcon(sectionClassName);
  /** Same as water and electricity: the whole card is the link, no extra View footer. */
  const showViewButton = false;
  return (
    <section id={sectionId} className={sectionClassName}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
        {providers.map((provider, i) => {
          const title =
            lang === "so"
              ? provider.cardTitleSo?.trim() || provider.cardTitle
              : provider.cardTitle;
          const subtitle =
            lang === "so"
              ? provider.cardLabelSo?.trim() || provider.cardLabel
              : provider.cardLabel;
          const showSubtitle =
            Boolean(subtitle) &&
            subtitle.trim().toLowerCase() !== title.trim().toLowerCase();

          return (
            <Link
              key={provider.id}
              href={provider.href}
              className={cn(
                "group flex flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-md",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-1 hover:shadow-xl",
                "active:scale-[0.97] active:translate-y-0 active:shadow-md",
                "motion-reduce:transform-none motion-reduce:active:scale-100",
                HOME_MARKET_CARD_H,
                provider.cardBorder
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={cn(
                  "relative w-full shrink-0 overflow-hidden",
                  HOME_MARKET_CARD_HEADER_H
                )}
              >
                <HomeProviderCardLogo
                  image={provider.image}
                  name={provider.name}
                  imageWidth={provider.imageWidth}
                  imageHeight={provider.imageHeight}
                  imageBg={provider.imageBg}
                  imageFocus={provider.imageFocus}
                  cardImageCrop={provider.cardImageCrop}
                  imageBlendMultiply={provider.imageBlendMultiply}
                  headerBg={provider.headerBg}
                  fallback={
                    <Icon className="h-8 w-8 text-white" strokeWidth={2} />
                  }
                  priority={i < 2}
                />
              </div>

              <div
                className={cn("h-[2px] w-full shrink-0", provider.cardDivider)}
                aria-hidden
              />

              <div
                className={cn(
                  "flex flex-col bg-gradient-to-b px-3 py-3 min-[360px]:px-4 min-[360px]:py-3.5 sm:px-5 sm:py-4",
                  HOME_MARKET_CARD_BODY_H,
                  provider.cardBodyTint
                )}
              >
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "line-clamp-2 break-words text-base font-black leading-snug tracking-tight min-[360px]:text-lg sm:text-xl",
                      provider.accentText
                    )}
                  >
                    {title}
                  </h3>
                  {showSubtitle ? (
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-gray-500 min-[360px]:truncate sm:text-[13px]">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                {showViewButton ? (
                  <div className="mt-auto pt-3">
                    <span
                      className={cn(
                        "inline-flex h-[2.75rem] w-full items-center justify-center text-center rounded-xl bg-gradient-to-r px-3 text-sm font-bold shadow-md ring-1 ring-black/5 transition group-hover:brightness-105 group-active:scale-[0.98] sm:h-[3rem]",
                        provider.headerBg,
                        provider.viewBtnText ?? "text-white"
                      )}
                    >
                      <StableBilingual
                        en="View"
                        so="Daawo"
                        lang={lang}
                        align="center"
                      />
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
