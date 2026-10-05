"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  Home,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { StablePair } from "@/components/ui/StableBilingual";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type AccountRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_STYLES: Record<
  AccountRequestStatus,
  {
    badge: string;
    badgeDot: string;
    hero: string;
    panel: string;
    eyebrow: string;
    iconWell: string;
    iconColor: string;
    Icon: typeof Clock;
  }
> = {
  PENDING: {
    badge: "border-amber-300 bg-amber-50 text-amber-950",
    badgeDot: "bg-amber-500",
    hero: "from-emerald-600 via-emerald-700 to-teal-700",
    panel: "border-2 border-amber-200 bg-amber-50/50",
    eyebrow: "text-amber-100",
    iconWell: "bg-amber-100 ring-amber-200/90",
    iconColor: "text-amber-600",
    Icon: Clock,
  },
  APPROVED: {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-950",
    badgeDot: "bg-emerald-500",
    hero: "from-emerald-600 via-teal-600 to-emerald-700",
    panel: "border-2 border-emerald-200 bg-emerald-50/50",
    eyebrow: "text-emerald-100",
    iconWell: "bg-emerald-100 ring-emerald-200/90",
    iconColor: "text-emerald-600",
    Icon: CheckCircle2,
  },
  REJECTED: {
    badge: "border-rose-300 bg-rose-50 text-rose-950",
    badgeDot: "bg-rose-500",
    hero: "from-rose-700 via-rose-800 to-teal-900",
    panel: "border-2 border-rose-200 bg-rose-50/50",
    eyebrow: "text-rose-100",
    iconWell: "bg-white ring-rose-200",
    iconColor: "text-rose-600",
    Icon: XCircle,
  },
};

const primaryBtnClass =
  "block h-10 w-full rounded-[10px] bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-2 text-center text-[12.5px] font-bold leading-10 text-white shadow-md shadow-emerald-900/10 transition hover:from-emerald-600 hover:to-teal-600";

const secondaryBtnClass =
  "block h-10 w-full rounded-[10px] bg-gradient-to-r from-teal-600 to-cyan-600 px-2 text-center text-[12.5px] font-bold leading-10 text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700";

function BtnLabel({
  icon: Icon,
  iconClassName,
  label,
}: {
  icon: typeof User;
  iconClassName: string;
  label: string;
}) {
  return (
    <span className="whitespace-nowrap">
      <Icon
        className={cn("mr-1.5 inline h-4 w-4 align-middle", iconClassName)}
        strokeWidth={2.5}
      />
      <span className="align-middle">{label}</span>
    </span>
  );
}

export function AccountStatusBadge({
  status,
  className,
}: {
  status: AccountRequestStatus;
  className?: string;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const style = STATUS_STYLES[status];
  const labelPair =
    status === "PENDING"
      ? copy.waitingApproval
      : status === "APPROVED"
        ? copy.approvedStatus
        : copy.rejectedStatus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide",
        style.badge,
        className
      )}
    >
      <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden>
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-70",
            status === "PENDING" && "animate-ping bg-amber-400",
            status === "APPROVED" && "animate-ping bg-emerald-400",
            status === "REJECTED" && "animate-ping bg-rose-400"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full animate-pulse-live",
            status === "PENDING" &&
              "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.95)]",
            status === "APPROVED" &&
              "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]",
            status === "REJECTED" &&
              "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.95)]"
          )}
        />
      </span>
      <StablePair pair={labelPair} lang={lang} />
    </span>
  );
}

export function AccountStatusActions({
  status,
}: {
  status: AccountRequestStatus;
  email?: string;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  const primary =
    status === "APPROVED" ? (
      <Link href="/login" className={primaryBtnClass}>
        <BtnLabel
          icon={User}
          iconClassName="text-lime-200"
          label={copy.signInManageAccount[lang]}
        />
      </Link>
    ) : status === "REJECTED" ? (
      <Link href="/register" className={primaryBtnClass}>
        <BtnLabel
          icon={RefreshCw}
          iconClassName="text-amber-200"
          label={copy.reapplyRegister[lang]}
        />
      </Link>
    ) : (
      <Link href="/login" className={primaryBtnClass}>
        <BtnLabel
          icon={User}
          iconClassName="text-lime-200"
          label={copy.signInTrackProgress[lang]}
        />
      </Link>
    );

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {primary}
      <Link href="/" className={secondaryBtnClass}>
        <BtnLabel
          icon={Home}
          iconClassName="text-sky-200"
          label={copy.goToHome[lang]}
        />
      </Link>
    </div>
  );
}

export function AccountStatusPanel({
  status,
  email,
  message,
  showActions = true,
  compact = false,
  footerSlot,
}: {
  status: AccountRequestStatus;
  email?: string;
  message?: string;
  showActions?: boolean;
  compact?: boolean;
  footerSlot?: ReactNode;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const style = STATUS_STYLES[status];
  const StatusIcon = style.Icon;

  const headline =
    status === "PENDING"
      ? copy.waitingApproval[lang]
      : status === "APPROVED"
        ? copy.approvedHeadline[lang]
        : copy.rejectedHeadline[lang];

  const statusLabel =
    status === "PENDING"
      ? copy.waitingApproval[lang]
      : status === "APPROVED"
        ? copy.approvedStatus[lang]
        : copy.rejectedStatus[lang];

  const blurb =
    status === "PENDING"
      ? copy.pendingBlurb[lang]
      : status === "APPROVED"
        ? copy.approvedBlurb[lang]
        : copy.rejectedBlurb[lang];

  const nextHint =
    status === "PENDING"
      ? copy.reviewDays[lang]
      : status === "APPROVED"
        ? copy.approvedNext[lang]
        : copy.rejectedNext[lang];

  const showBlurb = Boolean(blurb?.trim());
  const showNextHint = Boolean(nextHint?.trim());

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-white animate-fade-in-up">
      <div
        className={cn(
          "relative z-20 shrink-0 overflow-hidden bg-gradient-to-br text-center text-white",
          compact ? "px-4 pb-3.5 pt-3.5 sm:px-5" : "px-5 pb-4 pt-4 sm:px-6",
          style.hero
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="relative mx-auto flex h-11 w-11 items-center justify-center"
          aria-hidden
        >
          <span
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ring-2",
              style.iconWell,
              status === "PENDING" && "animate-pending-clock-well"
            )}
          >
            <StatusIcon
              className={cn(
                "h-[18px] w-[18px]",
                style.iconColor,
                status === "PENDING" && "animate-pending-clock-icon"
              )}
              strokeWidth={2.25}
            />
          </span>
        </div>
        <p
          className={cn(
            "relative mt-2 text-[9px] font-bold uppercase tracking-[0.18em]",
            style.eyebrow
          )}
        >
          {copy.accountSection[lang]}
        </p>
        <h2 className="relative mt-1 text-base font-black tracking-tight leading-snug sm:text-lg">
          {headline}
        </h2>
        <div className="relative mt-2 flex justify-center">
          <AccountStatusBadge
            status={status}
            className="border-white/35 bg-white/15 text-white"
          />
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto bg-white scrollbar-none",
          compact ? "px-4 py-3.5 sm:px-5" : "px-5 py-4 sm:px-6"
        )}
      >
        <div
          className={cn(
            "relative space-y-2.5 rounded-xl border text-left",
            compact ? "p-3" : "p-3.5 sm:p-4",
            style.panel
          )}
        >
          {email?.trim() ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {copy.registeredAs[lang]}
              </p>
              <p className="mt-1 break-all text-[13px] font-bold leading-snug text-slate-900">
                {email.trim()}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {copy.statusLabel[lang]}
            </p>
            <p className="mt-1 text-[13px] font-bold leading-snug text-slate-900">
              {statusLabel}
            </p>
            {showBlurb ? (
              <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                {blurb}
              </p>
            ) : null}
          </div>

          {showNextHint ? (
            <>
              <p className="inline-flex items-start gap-2 text-[12px] leading-relaxed text-slate-600">
                <Clock
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500",
                    status === "PENDING" && "animate-pending-clock-icon"
                  )}
                  strokeWidth={2.25}
                />
                <span>{nextHint}</span>
              </p>
            </>
          ) : null}
        </div>
        {message ? <p className="sr-only">{message}</p> : null}
      </div>

      {showActions ? (
        <div
          className={cn(
            "relative z-20 shrink-0 bg-white",
            compact ? "px-4 pb-3.5 pt-3 sm:px-5" : "px-5 pb-4 pt-3 sm:px-6"
          )}
        >
          <AccountStatusActions status={status} email={email} compact={compact} />
          {footerSlot}
        </div>
      ) : footerSlot ? (
        <div
          className={cn(
            "relative z-20 shrink-0 bg-white",
            compact ? "px-4 pb-3.5 pt-3 sm:px-5" : "px-5 pb-4 pt-3 sm:px-6"
          )}
        >
          {footerSlot}
        </div>
      ) : null}
    </div>
  );
}
