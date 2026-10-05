"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Beef,
  Droplets,
  Zap,
  Mail,
  MapPin,
  ArrowUpRight,
  Home,
  User,
  UserPlus,
  CreditCard,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  HOME_SECTORS,
  SYSTEM_SHORT,
  MMPS_SUPPORT_EMAIL,
} from "@/lib/home-content";
import { SystemBrand } from "@/components/SystemBrand";
import { StableBilingual, StablePair } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { fetchMarketAvailabilityCached } from "@/lib/client-fetch-cache";

const sectorIcons = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
} as const;

export function Footer({
  supportEmail = MMPS_SUPPORT_EMAIL,
}: {
  supportEmail?: string;
}) {
  const year = new Date().getFullYear();
  const { lang, t } = useLang();
  const T = TRANSLATIONS;
  const [sectorOpen, setSectorOpen] = useState<Record<string, boolean>>({
    livestock: true,
    water: true,
    electricity: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetchMarketAvailabilityCached()
      .then((d) => {
        if (cancelled) return;
        setSectorOpen(d);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  const openSectors = HOME_SECTORS.filter(
    (sector) => sectorOpen[sector.id] !== false
  );

  const sectorLabels = {
    livestock: {
      label: { en: "Livestock", so: "Xoolaha" },
      title: { en: "Livestock Market", so: "Suuqa Xoolaha" },
    },
    electricity: {
      label: { en: "Electricity", so: "Korontada" },
      title: { en: "Electricity Market", so: "Suuqa Korontada" },
    },
    water: {
      label: { en: "Water", so: "Biyaha" },
      title: { en: "Water Market", so: "Suuqa Biyaha" },
    },
  } as const;

  /** Same labels + icons as Header nav / auth (via TRANSLATIONS). */
  const exploreLinks: {
    href: string;
    label: { en: string; so: string };
    icon: LucideIcon;
    iconColor: string;
  }[] = [
      {
        href: "/",
        label: T.nav.home,
        icon: Home,
        iconColor: "text-green-300",
      },
      {
        href: "/register",
        label: T.auth.register,
        icon: UserPlus,
        iconColor: "text-teal-300",
      },
      {
        href: "/login",
        label: T.auth.signIn,
        icon: User,
        iconColor: "text-amber-300",
      },
      {
        href: "/pricing",
        label: { en: "Pricing Plans", so: "Qidmada" },
        icon: CreditCard,
        iconColor: "text-emerald-300",
      },
    ];

  return (
    <footer className="footer-bg-shell relative mt-auto overflow-hidden text-emerald-50">
      {/* Animated atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="footer-bg-orb-a absolute -left-16 top-6 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="footer-bg-orb-b absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="footer-bg-grid absolute inset-0" />
      </div>

      <div className="page-shell relative mx-auto max-w-7xl px-3 pt-6 pb-4 min-[360px]:px-4 sm:px-6 sm:pt-8 sm:pb-5">
        {/* Brand + sectors strip */}
        <div className="flex flex-col gap-4 pb-4 sm:gap-5 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <Link href="/" className="inline-block">
              <SystemBrand layout="footer" />
            </Link>
            <p className="mt-2 text-xs leading-relaxed text-emerald-100/70 sm:text-sm">
              <StablePair pair={T.footer.blurb} lang={lang} multiline />
            </p>
          </div>

          <div className="ml-[80px] flex flex-nowrap items-center gap-2">
            {openSectors.map((sector) => {
              const Icon = sectorIcons[sector.id];
              const sl = sectorLabels[sector.id as keyof typeof sectorLabels];
              return (
                <Link
                  key={sector.id}
                  href={sector.href}
                  className={cn(
                    "group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-white/5 px-3.5 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/10",
                    sector.id === "livestock" &&
                    "border-green-400/40 text-green-200 hover:border-green-300/60",
                    sector.id === "electricity" &&
                    "border-amber-400/40 text-amber-200 hover:border-amber-300/60",
                    sector.id === "water" &&
                    "border-teal-400/40 text-teal-200 hover:border-teal-300/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white",
                      sector.gradient
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <StablePair pair={sl.label} lang={lang} />
                  <ArrowUpRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition",
                      sector.iconColorOnDark
                    )}
                  />
                </Link>
              );
            })}
            <Link
              href="/pricing"
              className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3.5 py-2 text-sm font-semibold text-amber-200 backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-500/30"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <StablePair
                pair={{ en: "Pricing", so: "Qidmad" }}
                lang={lang}
              />
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Hairline divider */}
        <div
          className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent"
          aria-hidden
        />

        {/* Link columns */}
        <div className="grid gap-5 py-5 sm:grid-cols-2 sm:gap-8 sm:py-6 lg:grid-cols-12 lg:gap-0">
          <div className="lg:col-span-4 lg:pr-8">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
              <StableBilingual
                en="Market price Sectors"
                so="Qaybaha Qiimaha Suuqa"
                lang={lang}
              />
            </h4>
            <div className="mt-1.5 mb-3 h-px w-12 bg-emerald-400/45" aria-hidden />
            <ul className="space-y-2">
              {openSectors.map((sector) => {
                const Icon = sectorIcons[sector.id];
                const sl = sectorLabels[sector.id as keyof typeof sectorLabels];
                return (
                  <li key={sector.id}>
                    <Link
                      href={sector.href}
                      className="group flex items-center gap-3 text-sm font-medium text-emerald-100/80 transition hover:text-white"
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", sector.iconColorOnDark)}
                        strokeWidth={2.25}
                      />
                      <span className="min-w-0">
                        <StablePair
                          pair={sl.label}
                          lang={lang}
                          className="font-semibold text-white"
                        />
                        <span className="text-emerald-200/50"> · </span>
                        <StablePair pair={sl.title} lang={lang} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-emerald-400/15 pt-5 sm:border-t-0 sm:pt-0 lg:col-span-3 lg:border-l lg:border-emerald-400/20 lg:px-8">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
              <StableBilingual en="Explore" so="Sahami" lang={lang} />
            </h4>
            <div className="mt-1.5 mb-3 h-px w-12 bg-emerald-400/45" aria-hidden />
            <ul className="space-y-2">
              {exploreLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 text-sm font-medium text-emerald-100/80 transition hover:text-white"
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", link.iconColor)}
                        strokeWidth={2.25}
                      />
                      <StablePair
                        pair={link.label}
                        lang={lang}
                        className="font-semibold text-white"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-emerald-400/15 pt-5 sm:col-span-2 sm:border-t sm:pt-5 lg:col-span-5 lg:border-l lg:border-t-0 lg:border-emerald-400/20 lg:px-8 lg:pt-0">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
              <StableBilingual en="Contact" so="La Xiriir" lang={lang} />
            </h4>
            <div className="mt-2 mb-4 h-px w-12 bg-emerald-400/45" aria-hidden />
            <a
              href={`mailto:${supportEmail}`}
              className="mt-0 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-400/20 bg-white/[0.06] px-3 py-2.5 transition hover:border-emerald-400/40 hover:bg-white/[0.1]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
                <Mail className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300/70">
                  <StableBilingual en="Email" so="Emailka" lang={lang} />
                </span>
                <span className="block truncate text-sm font-semibold text-white">
                  {supportEmail}
                </span>
              </span>
            </a>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-100/75">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-amber-300"
                strokeWidth={2.25}
              />
              <StableBilingual
                en="Mogadishu, Banadir, Somalia"
                so="Muqdisho, Banaadir, Soomaaliya"
                lang={lang}
              />
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-emerald-400/20 pt-3 text-center">
          <p className="text-xs text-emerald-400/70">
            © {year} {SYSTEM_SHORT}.{" "}
            <StableBilingual
              en="All rights reserved."
              so="Xuquuqda oo dhan waa la dhowray."
              lang={lang}
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
