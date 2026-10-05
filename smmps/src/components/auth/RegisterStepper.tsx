"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGISTER_WIZARD_STEPS } from "@/lib/register-flow";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { StablePair } from "@/components/ui/StableBilingual";

const STEP_THEMES = [
  {
    // 01 — MMPS emerald
    solid: "bg-emerald-600",
    ring: "ring-emerald-100",
    upcoming: "bg-emerald-50",
    number: "text-emerald-700",
    numberActive: "text-white",
    labelActive: "text-emerald-700",
    labelDone: "text-emerald-600",
    labelUpcoming: "text-emerald-500/90",
    connector: "bg-emerald-400",
  },
  {
    // 02 — teal / cyan
    solid: "bg-teal-600",
    ring: "ring-teal-100",
    upcoming: "bg-cyan-50",
    number: "text-teal-700",
    numberActive: "text-white",
    labelActive: "text-teal-700",
    labelDone: "text-teal-600",
    labelUpcoming: "text-teal-500/90",
    connector: "bg-teal-400",
  },
  {
    // 03 — amber / orange
    solid: "bg-amber-600",
    ring: "ring-amber-100",
    upcoming: "bg-orange-50",
    number: "text-orange-700",
    numberActive: "text-white",
    labelActive: "text-amber-800",
    labelDone: "text-amber-700",
    labelUpcoming: "text-amber-600/90",
    connector: "bg-amber-400",
  },
] as const;

export function registerStepNavButtonClass(
  step: number,
  kind: "back" | "primary"
): string {
  if (kind === "back") {
    if (step >= 2) {
      // Last page — slate back vs emerald submit
      return "border-0 bg-slate-600 text-white shadow-sm hover:bg-slate-700";
    }
    if (step === 1) {
      return "border-0 bg-teal-600 text-white shadow-sm hover:bg-teal-700";
    }
    return "border-0 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
  }
  if (step >= 2) {
    // Last page — strong emerald primary for Register
    return "border-0 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
  }
  if (step === 1) {
    return "border-0 bg-teal-600 text-white shadow-sm hover:bg-teal-700";
  }
  return "border-0 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
}

/** @deprecated Prefer REGISTER_WIZARD_STEPS from register-flow */
export const REGISTER_FLOW_STEPS = REGISTER_WIZARD_STEPS.map((s) => ({
  code: s.code,
  title: s.shortLabel,
  shortLabel: s.shortLabel,
  description: "",
}));

const CIRCLE_CENTER_MT = "mt-[1.0625rem] sm:mt-[1.125rem]";

export function RegisterStepper({ current }: { current: number }) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  const labels = [copy.stepSection, copy.stepType, copy.stepDetails];

  return (
    <div className="mb-5 w-full">
      <div className="flex w-full min-w-0 items-start">
        {REGISTER_WIZARD_STEPS.map((step, index) => {
          const active = index === current;
          const done = index < current;
          const isLast = index === REGISTER_WIZARD_STEPS.length - 1;
          const theme = STEP_THEMES[index] ?? STEP_THEMES[0];

          return (
            <Fragment key={step.code}>
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold tracking-wide",
                    done || active
                      ? cn(theme.numberActive, theme.solid, active && `ring-4 ${theme.ring}`)
                      : cn(theme.upcoming, theme.number)
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.code}
                </span>
                <StablePair
                  pair={labels[index]}
                  lang={lang}
                  align="center"
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wide sm:text-[10px]",
                    active ? theme.labelActive : done ? theme.labelDone : theme.labelUpcoming
                  )}
                />
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    "mx-1.5 h-0.5 min-w-2 flex-1 rounded-full sm:mx-2",
                    CIRCLE_CENTER_MT,
                    index < current ? theme.connector : "bg-gray-200"
                  )}
                  aria-hidden
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
