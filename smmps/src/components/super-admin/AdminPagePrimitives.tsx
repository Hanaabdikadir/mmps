import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page title block used at the top of every console page */
export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        {Icon ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const KPI_TONES = {
  emerald: {
    icon: "bg-emerald-600 text-white",
    ring: "hover:border-emerald-200",
  },
  blue: { icon: "bg-blue-600 text-white", ring: "hover:border-blue-200" },
  sky: { icon: "bg-sky-600 text-white", ring: "hover:border-sky-200" },
  amber: { icon: "bg-amber-500 text-white", ring: "hover:border-amber-200" },
  violet: {
    icon: "bg-violet-600 text-white",
    ring: "hover:border-violet-200",
  },
  rose: { icon: "bg-rose-600 text-white", ring: "hover:border-rose-200" },
  teal: { icon: "bg-teal-600 text-white", ring: "hover:border-teal-200" },
  indigo: {
    icon: "bg-indigo-600 text-white",
    ring: "hover:border-indigo-200",
  },
  orange: {
    icon: "bg-orange-600 text-white",
    ring: "hover:border-orange-200",
  },
  cyan: { icon: "bg-cyan-600 text-white", ring: "hover:border-cyan-200" },
  fuchsia: {
    icon: "bg-fuchsia-600 text-white",
    ring: "hover:border-fuchsia-200",
  },
  slate: { icon: "bg-slate-600 text-white", ring: "hover:border-slate-300" },
} as const;

export type KpiTone = keyof typeof KPI_TONES;

/** Overview-style wall tile: label, value, short line of text */
export function WallFact({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon?: LucideIcon;
  tone?: KpiTone;
}) {
  const t = KPI_TONES[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              t.icon
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        ) : null}
      </div>
      <p className="truncate text-[17px] font-black text-slate-900">{value}</p>
      <p className="mt-1 text-[12px] font-medium leading-snug text-slate-500">{hint}</p>
    </div>
  );
}

/** Compact enterprise KPI card — shared across User, Companies, Pending pages */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconSrc,
  tone = "emerald",
  delta,
  deltaUp,
  onClick,
  selected,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Optional HD image (e.g. livestock market logo) instead of Lucide icon */
  iconSrc?: string;
  tone?: KpiTone;
  delta?: string;
  deltaUp?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const t = KPI_TONES[tone];
  const className = cn(
    "group flex h-full w-full flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-[var(--shadow)] transition-all duration-300 transform-gpu hover:-translate-y-0.5 ",
    t.ring,
    onClick && "cursor-pointer active:scale-[0.99]",
    selected && "border-emerald-400 ring-2 ring-emerald-500/20"
  );

  const body = (
    <>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-transform group-hover:scale-115",
          iconSrc
            ? "bg-white p-1 ring-1 ring-slate-200"
            : t.icon
        )}
      >
        {iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt=""
            className="h-full w-full object-contain object-center"
          />
        ) : Icon ? (
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        ) : null}
      </div>
      <p className="mt-3 w-full truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 w-full text-3xl font-black tracking-tight text-slate-900 tabular-nums sm:text-[1.85rem]">
        {value}
      </p>
      {(hint || delta) && (
        <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-black",
                deltaUp
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {delta}
            </span>
          )}
          {hint && (
            <span className="font-semibold text-slate-400">{hint}</span>
          )}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

/** White card container with optional header */
export function PanelCard({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow)]",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            {title && (
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </div>
  );
}

const BADGE_TONES = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof BADGE_TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
        BADGE_TONES[tone]
      )}
    >
      {children}
    </span>
  );
}
