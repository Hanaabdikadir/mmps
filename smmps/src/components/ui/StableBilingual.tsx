"use client";

import { cn } from "@/lib/utils";
import { useLang, type Lang } from "@/lib/language-context";
import type { LucideIcon } from "lucide-react";

export type BilingualPair = { en: string; so: string };

/**
 * Renders bilingual text with a locked layout box sized to the longer of EN/SO.
 * When the language switches, only the visible words change — icons and
 * surrounding buttons do not shift.
 */
export function StableBilingual({
  en,
  so,
  lang,
  className,
  align = "start",
  multiline = false,
  lockWidth = true,
  as: Tag = "span",
}: {
  en: string;
  so: string;
  lang: Lang;
  className?: string;
  align?: "start" | "center" | "end";
  multiline?: boolean;
  lockWidth?: boolean;
  as?: "span" | "p" | "div";
}) {
  const justify =
    align === "center"
      ? "justify-items-center text-center"
      : align === "end"
        ? "justify-items-end text-right"
        : "justify-items-start text-left";

  const wrap = multiline ? "whitespace-normal" : "whitespace-nowrap";
  const visible = lang === "en" ? en : so;

  if (!lockWidth) {
    return (
      <Tag className={cn(wrap, className)} suppressHydrationWarning>
        {visible}
      </Tag>
    );
  }

  return (
    <Tag className={cn("inline-grid", justify, className)}>
      <span className={cn("invisible col-start-1 row-start-1", wrap)} aria-hidden>
        {en}
      </span>
      <span className={cn("invisible col-start-1 row-start-1", wrap)} aria-hidden>
        {so}
      </span>
      <span className={cn("col-start-1 row-start-1", wrap)} suppressHydrationWarning>
        {visible}
      </span>
    </Tag>
  );
}

/** Convenience when you already have `{ en, so }` from TRANSLATIONS. */
export function StablePair({
  pair,
  lang,
  className,
  align = "start",
  multiline = false,
}: {
  pair: BilingualPair;
  lang: Lang;
  className?: string;
  align?: "start" | "center" | "end";
  multiline?: boolean;
}) {
  return (
    <StableBilingual
      en={pair.en}
      so={pair.so}
      lang={lang}
      className={className}
      align={align}
      multiline={multiline}
    />
  );
}

/** Same as StableBilingual but reads current language from context. */
export function StableT({
  en,
  so,
  className,
  align = "start",
  multiline = false,
}: {
  en: string;
  so: string;
  className?: string;
  align?: "start" | "center" | "end";
  multiline?: boolean;
}) {
  const { lang } = useLang();
  return (
    <StableBilingual
      en={en}
      so={so}
      lang={lang}
      className={className}
      align={align}
      multiline={multiline}
    />
  );
}

/**
 * Icon + bilingual label locked to the wider language.
 * Icon↔text gap stays identical; switching language only swaps the words.
 */
export function StableIconLabel({
  icon: Icon,
  en,
  so,
  lang,
  className,
  iconClassName,
  labelClassName,
  gapClassName = "gap-1.5",
  strokeWidth = 2.25,
  lockWidth = false,
}: {
  icon: LucideIcon;
  en: string;
  so: string;
  lang: Lang;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  gapClassName?: string;
  strokeWidth?: number;
  lockWidth?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", gapClassName, className)}>
      <Icon
        className={cn("h-4 w-4 shrink-0", iconClassName)}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth
      />
      <StableBilingual
        en={en}
        so={so}
        lang={lang}
        lockWidth={lockWidth}
        className={cn("leading-none", labelClassName)}
      />
    </span>
  );
}
