"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";
import Image from "next/image";
import { Beef, Building2, Droplets, ShieldCheck, Store, Zap } from "lucide-react";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { SystemBrand } from "@/components/SystemBrand";
import {
  HOME_SECTORS,
  SYSTEM_SHORT,
  SYSTEM_SECTORS_TAGLINE,
  SYSTEM_SECTORS_TAGLINE_EN,
} from "@/lib/home-content";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import type { RegisterCompanyInfoValues } from "@/components/auth/RegisterCompanyInfoCard";
import type { RegistrationDocumentId } from "@/lib/registration-requirements";
import { StableBilingual, StablePair } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";

/** Visible card outline for login, register, and waiting screens */
export const authCardBorderClass =
  "border-2 border-emerald-200 bg-white shadow-sm shadow-emerald-900/5";

/** Visible field outline for auth forms */
export const authFieldBorderClass =
  "border border-emerald-200 bg-white";

export const marketInputClass =
  `w-full rounded-xl ${authFieldBorderClass} py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition hover:border-emerald-300 hover:bg-emerald-50/20 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;

/** Sign-in fields — compact so the card fits one screen */
export const loginInputClass =
  `w-full rounded-[10px] ${authFieldBorderClass} py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition hover:border-emerald-300 hover:bg-emerald-50/25 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;

const sectorIcons = {
  livestock: Store,
  water: Droplets,
  electricity: Zap,
} as const;

/** MMPS green hero — brand + Join Register Now CTA (left panel / mobile strip). */
export function RegisterMewlmpsHeroPanel({
  className,
  compact,
}: {
  className?: string;
  /** Tighter padding for the mobile strip above the form */
  compact?: boolean;
  registerStep?: number;
  companySector?: string;
  documents?: Partial<Record<RegistrationDocumentId, File | null>>;
  companyInfo?: RegisterCompanyInfoValues;
}) {
  const { lang } = useLang();
  return (
    <div
      className={cn(
        "relative flex min-h-full flex-1 flex-col overflow-hidden bg-emerald-900 hero-pattern",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div
        className={cn(
          "relative flex min-h-full flex-1 flex-col",
          compact
            ? "justify-center gap-4 px-5 py-5 sm:px-6 sm:py-6"
            : "gap-5 px-6 py-8 sm:px-7 lg:gap-6 lg:px-8 lg:py-10"
        )}
      >
        <SystemBrand layout="auth" />
        <div className="max-w-md">
          <h2
            className={cn(
              "bg-gradient-to-r from-amber-200 via-yellow-100 to-lime-200 bg-clip-text font-black leading-tight tracking-tight text-transparent",
              compact
                ? "text-2xl sm:text-3xl"
                : "text-3xl sm:text-[2rem] lg:text-4xl"
            )}
          >
            <StablePair pair={TRANSLATIONS.auth.joinRegisterNow} lang={lang} />
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {HOME_SECTORS.map((sector) => {
            const Icon = sectorIcons[sector.id];
            return (
              <span
                key={sector.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-3.5 py-2 text-xs font-extrabold text-white shadow-md sm:text-sm",
                  sector.gradient
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]"
                  strokeWidth={2.25}
                />
                <StableBilingual
                  en={sector.english}
                  so={sector.somali}
                  lang={lang}
                />
              </span>
            );
          })}
        </div>
        {!compact ? <div className="flex-1" aria-hidden /> : null}
      </div>
    </div>
  );
}

export type LoginPortal = "company" | "admin" | "super-admin" | "unified";

/** Company Admin + Super Admin — compact row cards, distinct icon colors. */
export function LoginPortalPicker({
  portal,
  onChange,
}: {
  portal: LoginPortal;
  onChange: (portal: LoginPortal) => void;
}) {
  const options: {
    id: LoginPortal;
    title: string;
    subtitle: string;
    icon: ReactElement;
    activeCard: string;
    inactiveCard: string;
    activeIcon: string;
    inactiveIcon: string;
    activeTitle: string;
  }[] = [
    {
      id: "company",
      title: "Company Admin",
      subtitle: "Provider account",
          icon: <Building2 className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.2} />,
      activeCard:
        "border-teal-400 bg-gradient-to-br from-teal-50 to-white shadow-sm ring-teal-500/25",
      inactiveCard:
        "border-gray-200 bg-gray-50/70 ring-transparent hover:border-teal-200 hover:bg-white",
      activeIcon: "bg-teal-600 text-white",
      inactiveIcon: "bg-emerald-100 text-emerald-600",
      activeTitle: "text-teal-900",
    },
    {
      id: "super-admin",
      title: "Super Admin",
      subtitle: "Platform control",
          icon: <ShieldCheck className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.2} />,
      activeCard:
        "border-amber-400 bg-gradient-to-br from-amber-50 to-white shadow-sm ring-amber-500/25",
      inactiveCard:
        "border-gray-200 bg-gray-50/70 ring-transparent hover:border-amber-200 hover:bg-white",
      activeIcon: "bg-amber-500 text-white",
      inactiveIcon: "bg-emerald-100 text-emerald-700",
      activeTitle: "text-amber-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 items-stretch gap-2 min-[360px]:grid-cols-2 min-[360px]:gap-2.5">
      {options.map((opt) => {
        const active = portal === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "box-border flex min-h-[3.25rem] w-full items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left ring-2 transition-all duration-200 min-[360px]:min-h-[3.75rem] min-[360px]:gap-2.5 min-[360px]:px-3 min-[360px]:py-2.5",
              active ? opt.activeCard : opt.inactiveCard
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]",
                active ? opt.activeIcon : opt.inactiveIcon
              )}
            >
              {opt.icon}
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span
                className={cn(
                  "block text-xs font-bold leading-none tracking-tight sm:text-[13px]",
                  active ? opt.activeTitle : "text-gray-700"
                )}
              >
                {opt.title}
              </span>
              <span className="block text-[10px] font-medium leading-none text-gray-500 sm:text-[11px]">
                {opt.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function loginPortalAccent(portal: LoginPortal) {
  switch (portal) {
    case "admin":
      return "from-teal-700 via-emerald-700 to-emerald-800";
    case "super-admin":
      return "from-emerald-800 via-teal-700 to-emerald-700";
    default:
      return "from-emerald-600 via-emerald-600 to-teal-600";
  }
}

/** Cityscape + sector icons (reference art direction). */
export function MarketAuthIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full", className)} aria-hidden>
      <svg viewBox="0 0 400 140" className="h-auto w-full text-emerald-800/25">
        <path
          fill="currentColor"
          d="M0 120h400v20H0zM20 120V70h25v50M55 120V55h30v65M95 120V80h22v40M130 120V45h35v75M175 120V65h28v55M215 120V90h32v30M260 120V60h26v60M300 120V75h24v45M335 120V50h30v70M375 120V85h25v35"
        />
        <path fill="currentColor" opacity="0.4" d="M180 35h8v45h-8zM182 28l12 14h-24z" />
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex items-end justify-center gap-4 sm:gap-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A84E] text-white shadow-lg shadow-emerald-900/20 sm:h-16 sm:w-16">
          <Beef className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} />
        </span>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-white shadow-lg shadow-amber-900/20 sm:h-16 sm:w-16">
          <Zap className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} />
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0ea5e9] text-white shadow-lg shadow-sky-900/20 sm:h-14 sm:w-14">
          <Droplets className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

export function MarketAuthBrandHeader({
  centered,
  className,
}: {
  centered?: boolean;
  className?: string;
}) {
  const { lang } = useLang();
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        centered && "flex-col text-center",
        className
      )}
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-emerald-100">
        <Image
          src={SYSTEM_LOGO_SRC}
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 object-contain"
          unoptimized
        />
      </span>
      <div className={cn(centered && "flex flex-col items-center")}>
        <p className="text-lg font-extrabold leading-tight tracking-wide text-emerald-950">
          {SYSTEM_SHORT}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-emerald-700 sm:text-sm">
          {lang === "so" ? SYSTEM_SECTORS_TAGLINE : SYSTEM_SECTORS_TAGLINE_EN}
        </p>
      </div>
    </div>
  );
}

/** Register — dark left hero + white form; the document scrolls to the bottom. */
export function RegisterMarketLayout({
  children,
  tall,
  registerStep = 0,
  companySector = "",
  documents = {},
  companyInfo,
  formOnly = false,
}: {
  children: React.ReactNode;
  tall?: boolean;
  registerStep?: number;
  companySector?: string;
  documents?: Partial<Record<RegistrationDocumentId, File | null>>;
  companyInfo?: RegisterCompanyInfoValues;
  /** Hide green hero — full-width form card (submit loading / success). */
  formOnly?: boolean;
}) {
  useEffect(() => {
    if (formOnly) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowY = html.style.overflowY;
    const prevBodyOverflowY = body.style.overflowY;
    const prevBodyHeight = body.style.height;
    html.style.overflowY = "scroll";
    body.style.overflowY = "visible";
    body.style.height = "auto";
    return () => {
      html.style.overflowY = prevHtmlOverflowY;
      body.style.overflowY = prevBodyOverflowY;
      body.style.height = prevBodyHeight;
    };
  }, [formOnly]);

  return (
    <div
      data-register-page={formOnly ? undefined : ""}
      className={cn(
        "relative w-full bg-[var(--background)]",
        formOnly
          ? "flex min-h-[calc(100dvh-var(--site-header-h,4rem))] flex-1 flex-col items-center justify-center overflow-hidden"
          : "overflow-visible pb-10"
      )}
    >
      <div
        className={cn(
          "relative mx-auto w-full min-w-0 px-3 py-3 sm:px-5 sm:py-4",
          formOnly ? "max-w-xl" : "max-w-7xl"
        )}
      >
        <div
          className={cn(
            "grid w-full min-w-0 rounded-2xl bg-white",
            authCardBorderClass,
            formOnly
              ? "grid-cols-1 lg:mx-auto lg:max-w-xl"
              : cn(
                  "grid-cols-1 lg:grid-cols-[minmax(280px,40%)_minmax(0,60%)] lg:items-stretch",
                  tall
                    ? "lg:min-h-[calc(100dvh-var(--site-header-h,4rem)-2rem)]"
                    : "lg:min-h-[calc(100dvh-var(--site-header-h,4rem)-1.5rem)]"
                )
          )}
        >
          {!formOnly ? (
            <aside className="relative hidden overflow-hidden lg:block lg:rounded-l-2xl">
              <RegisterMewlmpsHeroPanel
                className="h-full min-h-full"
                registerStep={registerStep}
                companySector={companySector}
                documents={documents}
                companyInfo={companyInfo}
              />
            </aside>
          ) : null}

          <div
            className={cn(
              "flex min-w-0 flex-col bg-white",
              formOnly ? "rounded-2xl" : "lg:rounded-r-2xl"
            )}
          >
            {!formOnly ? (
              <div className="relative shrink-0 overflow-hidden rounded-t-2xl lg:hidden">
                <RegisterMewlmpsHeroPanel
                  compact
                  registerStep={registerStep}
                  companySector={companySector}
                  documents={documents}
                  companyInfo={companyInfo}
                />
              </div>
            ) : null}
            <div
              className={cn(
                "flex min-w-0 flex-col",
                formOnly ? "rounded-2xl" : "rounded-b-2xl lg:rounded-none"
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sign in — centered card, stable height (error slot reserved in form). */
export function LoginMarketLayout({
  children,
  portal = "company",
  title = "Company Admin",
  subtitle = "Maamulaha Shirkadda",
}: {
  children: React.ReactNode;
  portal?: LoginPortal;
  title?: string;
  subtitle?: React.ReactNode;
}) {
  const isSuper = portal === "super-admin";

  useEffect(() => {
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevHtmlHeight = html.style.height;
    const prevOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100dvh";
    body.style.height = "100dvh";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      html.style.height = prevHtmlHeight;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return (
    <div
      className="register-result-shell relative box-border flex h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] w-full flex-1 flex-col items-center justify-center overflow-hidden px-3 py-3 min-[360px]:px-4 sm:px-6"
    >
      <article
        className={cn(
          "relative mx-auto flex w-full max-w-[26rem] shrink-0 flex-col overflow-hidden rounded-2xl",
          authCardBorderClass,
          "animate-fade-in-up"
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-4 py-3 text-center text-white sm:px-5",
            isSuper
              ? "from-emerald-800 via-teal-800 to-emerald-700"
              : "from-emerald-600 via-emerald-700 to-teal-700"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.18), transparent 40%)",
            }}
          />
          <div className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white/55">
            <Image
              src={SYSTEM_LOGO_SRC}
              alt=""
              width={36}
              height={36}
              className="h-8 w-8 object-contain"
              priority
              unoptimized
            />
          </div>

          <p className="relative mt-1 w-full text-center text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100/95">
            {SYSTEM_SHORT}
          </p>
          <h1 className="relative mt-0.5 w-full text-center text-lg font-black tracking-tight leading-tight sm:text-xl">
            {title}
          </h1>
          <div className="relative mt-1 flex w-full items-center justify-center text-[11px] font-medium leading-snug text-emerald-50/95 sm:text-xs">
            {subtitle}
          </div>
        </div>

        <div className="relative flex w-full flex-col bg-white px-3.5 pt-3 pb-3.5 min-[360px]:px-5 sm:px-6 sm:pt-3.5 sm:pb-4">
          {children}
        </div>
      </article>
    </div>
  );
}
