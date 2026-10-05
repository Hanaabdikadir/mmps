"use client";

import { MapPin } from "lucide-react";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { SYSTEM_NAME, SYSTEM_NAME_LINES, SYSTEM_NAME_LINES_SO, SYSTEM_NAME_SOMALI, SYSTEM_SHORT } from "@/lib/home-content";
import { SystemLogo } from "@/components/SystemLogo";
import { useLang } from "@/lib/language-context";

type BrandLayout = "hero" | "header" | "footer" | "auth" | "sidebar";

const LAYOUT: Record<
  BrandLayout,
  {
    short: string;
    gap: string;
    logo: "sm" | "md" | "lg" | "xl";
    showLocation?: boolean;
    locationClass?: string;
    animateLogo?: boolean;
  }
> = {
  hero: {
    short:
      "font-hero text-[1.65rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-white sm:text-4xl lg:text-[2.6rem]",
    gap: "gap-3 sm:gap-4",
    logo: "xl",
    showLocation: false,
    locationClass: "mt-1.5 text-sm font-semibold text-white sm:text-[15px]",
    animateLogo: true,
  },
  header: {
    short:
      "font-hero text-[11px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-xs",
    gap: "gap-2.5 sm:gap-3",
    logo: "md",
    showLocation: true,
    locationClass: "mt-0.5 text-[11px] font-medium text-emerald-300 sm:text-xs",
  },
  footer: {
    short:
      "font-hero text-sm font-extrabold leading-[1.2] tracking-tight text-white sm:text-base",
    gap: "gap-3",
    logo: "lg",
    showLocation: true,
    locationClass: "mt-1 text-xs font-medium text-emerald-300",
  },
  auth: {
    short:
      "font-hero text-lg font-extrabold leading-[1.15] tracking-tight text-white lg:text-xl",
    gap: "gap-3.5",
    logo: "lg",
    showLocation: true,
    locationClass: "mt-1.5 text-sm font-semibold text-emerald-200/95",
    animateLogo: true,
  },
  sidebar: {
    short:
      "font-hero text-[11px] font-extrabold leading-[1.15] tracking-tight text-white",
    gap: "gap-2.5",
    logo: "sm",
    showLocation: true,
    locationClass: "mt-0.5 text-[10px] font-medium text-emerald-300",
  },
};

interface SystemBrandProps {
  layout?: BrandLayout;
  className?: string;
  /** Hide the logo mark (text only) */
  textOnly?: boolean;
  /** Show location under brand (defaults per layout) */
  showLocation?: boolean;
  /** Text colors — default is for dark/green backgrounds */
  tone?: "onDark" | "onLight";
}

/**
 * Compact brand: logo + full system name + location.
 */
export function SystemBrand({
  layout = "header",
  className,
  textOnly = false,
  showLocation,
  tone = "onDark",
}: SystemBrandProps) {
  const { lang } = useLang();
  const cfg = LAYOUT[layout];
  const location = showLocation ?? cfg.showLocation;
  const titleClass =
    tone === "onLight"
      ? cfg.short.replace(/text-white/g, "text-gray-900")
      : cfg.short;
  const locationClass =
    tone === "onLight"
      ? (cfg.locationClass ?? "")
          .replace(/text-emerald-300/g, "text-emerald-700")
          .replace(/text-emerald-200\/95/g, "text-emerald-800")
      : cfg.locationClass;

  return (
    <div className={cn("flex min-w-0 items-center", cfg.gap, className)}>
      {!textOnly ? (
        <SystemLogo size={cfg.logo} animate={cfg.animateLogo} />
      ) : null}
      <div className="min-w-0">
        <div className={titleClass}>
          {layout === "hero" ? (
            <span className="block">
              <span className="block">
                {lang === "so" ? SYSTEM_NAME_LINES_SO[0] : SYSTEM_NAME_LINES[0]}
              </span>
              <span className="block text-emerald-200">
                {lang === "so" ? SYSTEM_NAME_LINES_SO[1] : SYSTEM_NAME_LINES[1]}
              </span>
            </span>
          ) : (
            <StableBilingual
              en={SYSTEM_NAME}
              so={SYSTEM_NAME_SOMALI}
              lang={lang}
              multiline
              lockWidth={false}
              className="block"
            />
          )}
        </div>
        {location ? (
          <p className={cn("flex items-center gap-1", locationClass)}>
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            <StableBilingual
              en="Mogadishu, Somalia"
              so="Muqdisho, Soomaaliya"
              lang={lang}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Accessible label for links/buttons */
export function systemBrandLabel() {
  return `${SYSTEM_SHORT} — ${SYSTEM_NAME}`;
}
