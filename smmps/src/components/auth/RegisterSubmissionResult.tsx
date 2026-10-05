"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Home, ShieldCheck, User } from "lucide-react";
import {
  AccountStatusBadge,
  AccountStatusPanel,
} from "@/components/auth/AccountStatusPanel";
import { LoginMarketLayout } from "@/components/auth/auth-market-ui";
import { StablePair } from "@/components/ui/StableBilingual";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { SYSTEM_SHORT } from "@/lib/home-content";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { writeStoredRegistrationStatus } from "@/lib/registration-status";
import { cn } from "@/lib/utils";

const LOADING_PHASE_KEYS = [
  "securingAccount",
  "uploadingDocuments",
  "submittingToMmps",
] as const;

/** Minimum submit loading screen duration (ms) — matches progress animation */
export const REGISTER_SUBMIT_LOADING_MS = 6000;

const LOADING_PHASE_INTERVAL_MS = Math.floor(
  REGISTER_SUBMIT_LOADING_MS / LOADING_PHASE_KEYS.length
);

const LOADING_STEP_LABELS = ["1", "2", "3"] as const;

/** Progress body only — sits inside LoginMarketLayout (same card height as login). */
function RegisterSubmittingBody() {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const [phase, setPhase] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const pct = Math.min(100, (elapsed / REGISTER_SUBMIT_LOADING_MS) * 100);
      setProgressPct(pct);
      setPhase(
        Math.min(
          LOADING_PHASE_KEYS.length - 1,
          Math.floor(elapsed / LOADING_PHASE_INTERVAL_MS)
        )
      );
      if (elapsed >= REGISTER_SUBMIT_LOADING_MS) {
        window.clearInterval(id);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  const phaseKey = LOADING_PHASE_KEYS[phase];

  return (
    <div
      className="flex w-full flex-col items-center text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-dashed border-teal-300/80 animate-register-orbit"
          aria-hidden
        />
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-teal-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SYSTEM_LOGO_SRC}
            alt=""
            width={36}
            height={36}
            decoding="sync"
            fetchPriority="high"
            className="h-8 w-8 object-contain"
          />
        </span>
      </div>

      <p
        key={phase}
        className="mt-3 min-h-[2.5rem] w-full animate-fade-in text-sm font-medium leading-relaxed text-emerald-900/90"
      >
        {copy[phaseKey][lang]}
      </p>
      <p className="mt-1 w-full text-xs leading-relaxed text-gray-500">
        {copy.keepPageOpen[lang]}
      </p>

      <div className="mt-4 w-full" aria-hidden>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            {copy.progress[lang]}
          </span>
          <span className="text-[10px] font-bold tabular-nums text-emerald-700">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-100/90 ring-1 ring-emerald-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-[width] duration-150 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LOADING_STEP_LABELS.map((label, i) => {
            const done = i < phase;
            const active = i === phase;
            return (
              <div
                key={label}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg text-sm font-bold transition-all duration-500",
                  done && "bg-teal-600 text-white",
                  active &&
                    "bg-gradient-to-br from-teal-500 to-emerald-700 text-white ring-2 ring-teal-200/80",
                  !done &&
                    !active &&
                    "bg-teal-50 text-teal-800 ring-1 ring-teal-100"
                )}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer RegisterSubmissionScreen — kept for any external compact usage. */
export function RegisterSubmittingPanel({
  compact = false,
  fitViewport = false,
}: {
  compact?: boolean;
  fitViewport?: boolean;
}) {
  void compact;
  void fitViewport;
  return <RegisterSubmittingBody />;
}

export function RegisterSubmissionScreen({
  loading,
  successMessage,
  email,
}: {
  loading: boolean;
  successMessage: string | null;
  email: string;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const isSuccess = Boolean(successMessage) && !loading;

  if (loading) {
    return (
      <LoginMarketLayout
        portal="unified"
        title={copy.creatingAccount[lang]}
        subtitle={SYSTEM_SHORT}
      >
        <RegisterSubmittingBody />
      </LoginMarketLayout>
    );
  }

  if (isSuccess && successMessage) {
    return (
      <LoginMarketLayout
        portal="unified"
        title={copy.waitingApproval[lang]}
        subtitle={copy.pendingBlurb[lang] || SYSTEM_SHORT}
      >
        <RegisterSuccessPanel
          message={successMessage}
          email={email}
          standalone={false}
          showActions
          embeddedInLoginCard
        />
      </LoginMarketLayout>
    );
  }

  return null;
}

export function RegisterSuccessActions({
  standalone = false,
  email = "",
}: {
  standalone?: boolean;
  email?: string;
}) {
  void standalone;
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const loginHref = email.trim()
    ? `/login?email=${encodeURIComponent(email.trim().toLowerCase())}`
    : "/login";

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <Link
        href={loginHref}
        className="block h-10 w-full rounded-[10px] bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-2 text-center text-[12.5px] font-bold leading-10 text-white shadow-md shadow-emerald-900/10 transition hover:from-emerald-600 hover:to-teal-600"
      >
        <span className="whitespace-nowrap">
          <User
            className="mr-1.5 inline h-4 w-4 align-middle text-lime-200"
            strokeWidth={2.5}
          />
          <span className="align-middle">{copy.signInTrackProgress[lang]}</span>
        </span>
      </Link>
      <Link
        href="/"
        className="block h-10 w-full rounded-[10px] bg-gradient-to-r from-teal-600 to-cyan-600 px-2 text-center text-[12.5px] font-bold leading-10 text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700"
      >
        <span className="whitespace-nowrap">
          <Home
            className="mr-1.5 inline h-4 w-4 align-middle text-sky-200"
            strokeWidth={2.5}
          />
          <span className="align-middle">{copy.goToHome[lang]}</span>
        </span>
      </Link>
    </div>
  );
}

export function RegisterSuccessPanel({
  message,
  email,
  standalone = false,
  showActions = true,
  embeddedInLoginCard = false,
}: {
  message: string;
  email: string;
  standalone?: boolean;
  showActions?: boolean;
  /** When true, content only — LoginMarketLayout already provides the card chrome. */
  embeddedInLoginCard?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  useEffect(() => {
    if (email.trim()) {
      writeStoredRegistrationStatus(email.trim(), "PENDING");
    }
  }, [email]);

  if (standalone) {
    return (
      <AccountStatusPanel
        status="PENDING"
        email={email}
        message={message}
        showActions={showActions}
        compact
      />
    );
  }

  if (embeddedInLoginCard) {
    return (
      <div className="flex w-full flex-col">
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-3 text-left">
          {email.trim() ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {copy.registeredAs[lang]}
              </p>
              <p className="mt-1 break-all text-[13px] font-bold leading-snug text-slate-900">
                {email.trim()}
              </p>
            </>
          ) : null}
          <div className={email.trim() ? "mt-2.5" : undefined}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {copy.statusLabel[lang]}
            </p>
            <p className="mt-1 text-[13px] font-bold leading-snug text-slate-900">
              {copy.waitingApproval[lang]}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              {copy.pendingBlurb[lang]}
            </p>
          </div>
          <p className="mt-2.5 inline-flex items-start gap-2 text-[12px] leading-relaxed text-slate-600">
            <Clock
              className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pending-clock-icon text-amber-500"
              strokeWidth={2.25}
            />
            <span>{copy.reviewDays[lang]}</span>
          </p>
        </div>
        {message ? <p className="sr-only">{message}</p> : null}
        {showActions ? (
          <div className="mt-3.5">
            <RegisterSuccessActions email={email} />
          </div>
        ) : null}
      </div>
    );
  }

  const body = (
    <div className="relative flex flex-col items-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 ring-2 ring-amber-200/90 sm:h-[4.5rem] sm:w-[4.5rem]">
        <Clock className="h-8 w-8 text-amber-600 sm:h-10 sm:w-10" strokeWidth={2.25} />
      </span>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800">
        {copy.accountSection[lang]}
      </p>
      <h2 className="mt-2 bg-gradient-to-r from-teal-800 via-emerald-700 to-teal-600 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-[1.65rem]">
        {copy.waitingApproval[lang]}
      </h2>
      <div className="mt-2">
        <AccountStatusBadge status="PENDING" />
      </div>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-700">{message}</p>

      {email.trim() ? (
        <p className="mt-2.5 w-full max-w-md rounded-lg border border-teal-200/80 bg-white/90 px-3 py-2 text-sm text-gray-700">
          {copy.registeredAs[lang]}{" "}
          <span className="font-bold text-teal-800">{email.trim()}</span>
        </p>
      ) : null}

      <div className="mt-4 w-full max-w-md rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-left">
        <div className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" strokeWidth={2.25} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
              {copy.whatHappensNext[lang]}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-950">
              {copy.whatHappensNextPending[lang]}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
              <StablePair pair={copy.reviewDays} lang={lang} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const actions = showActions ? (
    <div className="relative z-20 mt-8 shrink-0 bg-white pt-6">
      <RegisterSuccessActions email={email} />
    </div>
  ) : null;

  return (
    <div className="animate-fade-in-up pb-2 pt-0 sm:pb-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-teal-50 via-white to-amber-50/80 p-6 shadow-sm sm:p-8">
        <div className="relative">{body}</div>
      </div>
      {actions}
    </div>
  );
}
