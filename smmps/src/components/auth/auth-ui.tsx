"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff, ShieldCheck, User, UserCog } from "lucide-react";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { SYSTEM_SHORT, SYSTEM_SECTORS_TAGLINE, SYSTEM_SECTORS_TAGLINE_EN } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

export const AUTH_GREEN = "#1E9E49";

const inputClass =
  "w-full rounded-xl border border-emerald-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

export { inputClass as authInputClass };

const heroCrossPattern = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
};

/** Combined or split two-column auth layout (MMPS brand + form). */
export function AuthSplitLayout({
  brand,
  children,
  mobileBrand,
  combined = true,
  size = "default",
}: {
  brand: React.ReactNode;
  children: React.ReactNode;
  /** Shown above the form on small screens when `combined` */
  mobileBrand?: React.ReactNode;
  combined?: boolean;
  /** Taller combined card for multi-step register */
  size?: "default" | "tall";
}) {
  if (!combined) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <div className="pointer-events-none absolute inset-0 livestock-mesh" />
        <div className="relative flex min-h-[calc(100vh-4rem)] items-stretch justify-center p-4 sm:p-5 lg:items-center lg:p-6">
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:items-stretch">
            <div className="relative hidden min-h-[420px] overflow-hidden rounded-3xl hero-pattern shadow-[var(--shadow-lg)] lg:flex lg:flex-col animate-fade-in-left">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={heroCrossPattern}
              />
              <div className="relative flex h-full flex-col">{brand}</div>
            </div>
            <div className="flex min-h-0 flex-col justify-center">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  const tall = size === "tall";

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto scrollbar-none lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 livestock-mesh" />
      <div className="relative mx-auto flex min-h-full w-full max-w-7xl items-center justify-center px-2 sm:px-4 lg:h-full lg:min-h-0 lg:px-6">
        <div
          className={cn(
            "grid w-full grid-cols-1 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-sm shadow-emerald-900/5",
            tall
              ? "lg:h-[calc(100vh-4rem-0.75rem)] lg:max-h-[920px]"
              : "lg:h-[calc(100vh-4rem-1.25rem)] lg:max-h-[880px]",
            "h-auto lg:grid-cols-[minmax(360px,40%)_minmax(0,60%)] lg:items-stretch",
            "animate-fade-in-up"
          )}
        >
          <aside className="relative hidden min-h-0 flex-col overflow-hidden border-r border-white/10 hero-pattern lg:flex">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={heroCrossPattern}
            />
            <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 left-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative flex h-full min-h-0 flex-col">{brand}</div>
          </aside>

          <div className="flex min-h-0 flex-col bg-white lg:h-full lg:min-h-0 lg:overflow-hidden">
            {mobileBrand ? (
              <div className="relative shrink-0 overflow-hidden hero-pattern px-5 py-4 lg:hidden">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={heroCrossPattern}
                />
                <div className="relative">{mobileBrand}</div>
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col lg:h-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** White form card with scroll body + optional footer. */
export function AuthFormCard({
  eyebrow,
  title,
  subtitle,
  footer,
  children,
  embedded,
  registerPanel,
  centerViewport,
}: {
  eyebrow?: string;
  /** Omit on steps where the stepper already names the stage (e.g. details). */
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Inside {@link AuthSplitLayout} combined shell — no outer card chrome */
  embedded?: boolean;
  /** Register right panel — compact header; scrolls with the page when embedded */
  registerPanel?: boolean;
  /** Loading / success — vertically center body in the register card */
  centerViewport?: boolean;
}) {
  const pageScroll = Boolean(embedded && registerPanel && !centerViewport);
  const hasHeader = Boolean(eyebrow || title || subtitle);

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        !pageScroll && "min-h-0 overflow-hidden",
        embedded && centerViewport && "min-h-[calc(100dvh-4rem-2rem)] justify-center",
        embedded && !pageScroll && !centerViewport
          ? "h-full min-h-0 max-h-full"
          : !embedded
            ? "max-h-[min(780px,calc(100vh-5.5rem))] rounded-3xl border-2 border-emerald-200 bg-white shadow-sm animate-fade-in-up lg:max-w-none"
            : undefined
      )}
    >
      {!embedded ? (
        <div className="h-1 shrink-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600" />
      ) : null}
      {hasHeader ? (
      <header
        className={cn(
          "shrink-0 sm:px-7",
          registerPanel ? "px-6 pb-2 pt-5" : "px-5 pb-3 pt-4 sm:px-6 sm:pt-5",
          centerViewport && "pb-1 pt-4 text-center sm:px-6",
          registerPanel && !title && "pt-4"
        )}
      >
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h1
            className={cn(
              "font-black tracking-tight text-gray-900",
              registerPanel ? "text-2xl" : "mt-1 text-xl sm:text-2xl",
              eyebrow && registerPanel && "mt-1",
              !eyebrow && registerPanel && "mt-0"
            )}
          >
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p
            className={cn(
              "text-sm leading-relaxed text-gray-500",
              title || eyebrow ? "mt-1" : "mt-0"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </header>
      ) : null}
      <div
        className={cn(
          registerPanel
            ? "px-6 pb-12"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none px-5 pb-6 sm:px-6",
          centerViewport && "flex flex-1 flex-col justify-center pb-6 pt-2"
        )}
      >
        {children}
      </div>
      {footer && !registerPanel ? (
        <footer className="shrink-0 bg-gray-50/90 px-5 py-3.5 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}

export function AuthPhonePrefix() {
  return (
    <div
      className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-gray-50/80 px-3 text-sm text-gray-700"
      aria-hidden
    >
      <span className="rounded-md bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
        SO
      </span>
      <span className="font-semibold tabular-nums text-gray-800">+252</span>
    </div>
  );
}

export function AuthShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:min-h-screen lg:flex-row">
      {sidebar}
      <div className="flex flex-1 flex-col bg-white">{children}</div>
    </div>
  );
}

export function AuthBrandMark({ className }: { className?: string }) {
  const { lang } = useLang();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-md ring-2 ring-white/40">
        <Image
          src={SYSTEM_LOGO_SRC}
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 object-contain"
          unoptimized
        />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-tight tracking-wide text-white">
          {SYSTEM_SHORT}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-white/90">
          {lang === "so" ? SYSTEM_SECTORS_TAGLINE : SYSTEM_SECTORS_TAGLINE_EN}
        </p>
      </div>
    </div>
  );
}

export function AuthSidebar({
  title,
  description,
  features,
  illustration,
  footer,
}: {
  title: string;
  description: string;
  features: { icon: LucideIcon; title: string; description: string }[];
  illustration: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <aside className="relative hidden w-full max-w-[440px] shrink-0 flex-col overflow-hidden bg-gradient-to-br from-[#1E9E49] via-[#22ad52] to-[#168a3d] px-8 py-10 text-white lg:flex xl:max-w-[480px] xl:px-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <AuthBrandMark className="relative" />
      <div className="relative mt-10">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/90">
          {description}
        </p>
      </div>
      <ul className="relative mt-8 space-y-5">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/80">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="relative mt-auto flex justify-center pt-8">{illustration}</div>
      {footer ? <div className="relative mt-6 text-center text-sm">{footer}</div> : null}
    </aside>
  );
}

export function AuthMobileBrand() {
  return (
    <div className="border-b border-gray-100 bg-gradient-to-r from-[#1E9E49] to-[#22ad52] px-5 py-6 lg:hidden">
      <AuthBrandMark />
    </div>
  );
}

export function AuthFormPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 xl:px-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function AuthField({
  id,
  label,
  icon: Icon,
  ...inputProps
}: {
  id: string;
  label: string;
  icon: LucideIcon;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input id={id} className={inputClass} {...inputProps} />
      </div>
    </div>
  );
}

export function AuthPasswordField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  minLength,
  error,
  autoComplete = "new-password",
  iconClassName = "text-gray-400",
  toggleClassName = "text-gray-400 hover:text-gray-600",
  inputClassName,
  disablePaste = false,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  error?: string;
  autoComplete?: string;
  iconClassName?: string;
  toggleClassName?: string;
  inputClassName?: string;
  disablePaste?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            iconClassName
          )}
        />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={
            disablePaste
              ? (e) => {
                  e.preventDefault();
                }
              : undefined
          }
          onDrop={
            disablePaste
              ? (e) => {
                  e.preventDefault();
                }
              : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            inputClass,
            inputClassName,
            "pr-10",
            error && "border-red-300 focus:border-red-500 focus:ring-red-200"
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={cn("absolute right-3 top-1/2 -translate-y-1/2", toggleClassName)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  loadingLabel,
  className,
  ...rest
}: {
  children: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-center rounded-lg bg-[#1E9E49] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#178a3f] disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {loading ? loadingLabel ?? "Please wait…" : children}
    </button>
  );
}

export function AuthSocialSignIn() {
  const { t } = useLang();
  return (
    <div>
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {t("or sign in with", "ama gal adoo isticmaalaya")}
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {(["Google", "Microsoft", "Apple"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            disabled
            title="Social sign-in is not available yet"
            className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {provider === "Google" ? (
              <span className="font-bold text-gray-500">G</span>
            ) : provider === "Microsoft" ? (
              <span className="grid grid-cols-2 gap-0.5">
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-500">{"\uF8FF"}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthLoginModeSwitch({
  admin,
  onChange,
}: {
  admin: boolean;
  onChange: (admin: boolean) => void;
}) {
  const { t } = useLang();
  const active =
    "bg-emerald-800 text-white shadow-md shadow-emerald-900/20 ring-1 ring-emerald-700/30";
  return (
    <div className="flex rounded-xl border border-gray-200 bg-gray-50/90 p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all",
          !admin ? active : "text-gray-500 hover:text-gray-800"
        )}
      >
        <User className="h-4 w-4" />
        {t("User", "Isticmaale")}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all",
          admin ? active : "text-gray-500 hover:text-gray-800"
        )}
      >
        <UserCog className="h-4 w-4" strokeWidth={2.25} />
        {t("Admin", "Maamule")}
      </button>
    </div>
  );
}

export function AuthSocialSignUp() {
  const { t } = useLang();
  return (
    <div>
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {t("or register with", "ama isdiiwaanso adoo isticmaalaya")}
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {(["Google", "Microsoft", "Apple"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            disabled
            title="Social registration is not available yet"
            className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {provider === "Google" ? (
              <span className="font-bold text-gray-500">G</span>
            ) : provider === "Microsoft" ? (
              <span className="grid grid-cols-2 gap-0.5">
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
                <span className="h-2 w-2 bg-gray-400" />
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-500">{"\uF8FF"}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthSecurityNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
      <p className="text-xs leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

export function AuthStepper({
  steps,
  current,
  compact,
}: {
  steps: string[];
  current: number;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "mb-4" : "mb-6")}>
      <div className="flex items-start">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const active = index === current;
          const done = index < current;
          return (
            <div key={label} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    active || done
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                      : "border-2 border-gray-200 bg-white text-gray-400"
                  )}
                >
                  {stepNum}
                </span>
                <span
                  className={cn(
                    "max-w-[5rem] truncate text-center text-[10px] font-semibold leading-tight sm:max-w-[5.5rem] sm:text-[11px]",
                    active ? "text-emerald-700" : done ? "text-emerald-600/80" : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 mt-4 h-0.5 flex-1 rounded-full sm:mx-2",
                    index < current ? "bg-emerald-500" : "bg-gray-200"
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AuthInlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-semibold text-[#1E9E49] hover:underline">
      {children}
    </Link>
  );
}

export function RegisterIllustration() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="h-auto w-full max-w-[260px] text-white/90"
      aria-hidden
    >
      <rect x="20" y="90" width="240" height="8" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="40" y="70" width="24" height="28" rx="4" fill="currentColor" opacity="0.35" />
      <rect x="72" y="58" width="28" height="40" rx="4" fill="currentColor" opacity="0.45" />
      <rect x="108" y="48" width="32" height="50" rx="4" fill="currentColor" opacity="0.55" />
      <rect x="148" y="62" width="26" height="36" rx="4" fill="currentColor" opacity="0.4" />
      <circle cx="210" cy="52" r="14" fill="#fbbf24" opacity="0.9" />
      <path
        d="M60 118c8-12 20-18 32-18s24 6 32 18"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <ellipse cx="92" cy="112" rx="18" ry="10" fill="currentColor" opacity="0.3" />
      <path d="M175 95 L195 75 L205 85 L185 105 Z" fill="#38bdf8" opacity="0.85" />
      <path d="M220 100 L235 85 L245 95 L230 110 Z" fill="#f97316" opacity="0.85" />
    </svg>
  );
}

export function LoginIllustration() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="h-auto w-full max-w-[260px] text-white/90"
      aria-hidden
    >
      <rect x="48" y="28" width="120" height="88" rx="10" fill="currentColor" opacity="0.2" />
      <rect x="56" y="36" width="104" height="72" rx="6" fill="white" opacity="0.15" />
      <rect x="64" y="48" width="40" height="6" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="64" y="60" width="88" height="4" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="64" y="70" width="72" height="4" rx="2" fill="currentColor" opacity="0.35" />
      <circle cx="130" cy="92" r="18" fill="#38bdf8" opacity="0.7" />
      <rect x="168" y="44" width="64" height="112" rx="12" fill="currentColor" opacity="0.25" />
      <rect x="176" y="52" width="48" height="96" rx="8" fill="white" opacity="0.12" />
      <rect x="184" y="64" width="32" height="4" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="184" y="76" width="24" height="24" rx="4" fill="#1E9E49" opacity="0.8" />
    </svg>
  );
}
