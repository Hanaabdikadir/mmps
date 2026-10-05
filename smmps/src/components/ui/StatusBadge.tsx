"use client";

import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import {
  formatStatusLabel,
  statusBadgeClass,
  statusDotClass,
} from "@/lib/smlpms-constants";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { lang } = useLang();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-semibold tracking-[0.14em]",
        lang === "en" && "uppercase",
        statusBadgeClass(status),
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDotClass(status))} />
      {formatStatusLabel(status, lang)}
    </span>
  );
}
