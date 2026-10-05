"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { StablePair, type BilingualPair } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";

export type RegisterSelectionOption = {
  id: string;
  title: BilingualPair;
  subtitle?: BilingualPair;
  icon?: LucideIcon;
  photo?: string;
  /** Tailwind classes for the icon well when selected */
  iconActiveClass: string;
  /** Tailwind classes for the icon well when idle */
  iconIdleClass: string;
  /** Selected card border / ring / background */
  selectedCardClass: string;
  idleCardClass?: string;
  /** Idle top accent bar color */
  idleBarClass?: string;
  /** Idle hover — per-option accent or neutral (never global green) */
  hoverCardClass?: string;
  /** Idle top line turns this color on hover */
  hoverBarClass?: string;
  /** Selected check badge background */
  checkClass?: string;
  /** Selected title color (matches option accent) */
  selectedTitleClass?: string;
};

export function RegisterSelectionCards({
  options,
  value,
  values,
  onChange,
  columns = 2,
  showCheck = true,
}: {
  options: RegisterSelectionOption[];
  value?: string | null;
  values?: string[];
  onChange: (id: string) => void;
  columns?: 2 | 3;
  /** Hide the selected check — first-step cards are a choice, not a completed step. */
  showCheck?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const multi = Array.isArray(values);

  return (
    <div
      className={cn(
        columns === 3
          ? "grid grid-cols-3 items-stretch gap-2 min-[400px]:gap-3"
          : "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
      )}
      role={multi ? "group" : "listbox"}
      aria-label={copy.registrationOptions[lang]}
    >
      {options.map((opt) => {
        const selected = multi ? values.includes(opt.id) : value === opt.id;
        const Icon = opt.icon;
        const showMark = Boolean(opt.photo || Icon);
        return (
          <button
            key={opt.id}
            type="button"
            role={multi ? "checkbox" : "option"}
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "group relative flex h-full flex-col items-start text-left transition-all duration-200",
              columns === 3
                ? "min-h-[7.25rem] min-w-0 gap-2 rounded-2xl border-2 p-3 sm:min-h-[7.75rem] sm:p-4"
                : "min-h-[8.25rem] gap-3 rounded-2xl border-2 p-4 sm:min-h-[8.75rem]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selected
                ? cn("scale-[1.01] shadow-sm", opt.selectedCardClass)
                : cn(
                    "bg-white",
                    opt.idleCardClass ?? "border-slate-200",
                    opt.hoverCardClass ??
                      "hover:border-slate-300 hover:bg-slate-50/60"
                  )
            )}
          >
            <span
              className={cn(
                "absolute inset-x-4 top-0 h-1 rounded-b-full transition-colors",
                selected
                  ? (opt.checkClass ?? "bg-emerald-500")
                  : cn(opt.idleBarClass ?? "bg-slate-300", opt.hoverBarClass)
              )}
              aria-hidden
            />
            {selected && showCheck ? (
              <span
                className={cn(
                  "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm",
                  opt.checkClass ?? "bg-slate-700"
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : null}
            <span
              className={cn(
                "flex w-full items-center",
                showMark ? "gap-3" : "gap-0",
                columns === 3 ? "pr-2" : "pr-6"
              )}
            >
              {opt.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opt.photo}
                  alt=""
                  className={cn(
                    "shrink-0 rounded-xl object-cover ring-1 ring-slate-200",
                    columns === 3 ? "h-10 w-10" : "h-12 w-12"
                  )}
                />
              ) : Icon ? (
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl transition-colors",
                    columns === 3 ? "h-10 w-10" : "h-12 w-12",
                    selected ? opt.iconActiveClass : opt.iconIdleClass
                  )}
                >
                  <Icon className={columns === 3 ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2.5} />
                </span>
              ) : null}
              <StablePair
                pair={opt.title}
                lang={lang}
                className={cn(
                  "min-w-0 font-extrabold uppercase tracking-wide leading-snug",
                  columns === 3 ? "text-xs sm:text-sm" : "text-sm",
                  selected
                    ? (opt.selectedTitleClass ?? "text-slate-950")
                    : "text-slate-900"
                )}
              />
            </span>
            {opt.subtitle ? (
              <StablePair
                pair={opt.subtitle}
                lang={lang}
                multiline
                className="text-xs font-medium leading-relaxed text-slate-600"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
