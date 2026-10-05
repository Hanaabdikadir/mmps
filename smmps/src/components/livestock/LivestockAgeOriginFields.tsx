"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export function LivestockAgeOriginFields({
  ageClass,
  originPlace,
  disabled,
  onAgeChange,
  onOriginChange,
  priceSlot,
  className,
}: {
  typeName?: string;
  ageClass?: string | null;
  originPlace?: string | null;
  disabled?: boolean;
  onAgeChange: (value: string) => void;
  onOriginChange: (value: string) => void;
  priceSlot?: ReactNode;
  className?: string;
}) {
  const { t } = useLang();
  return (
    <div
      className={cn(
        "grid grid-cols-3 items-end gap-2",
        className
      )}
    >
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {t("Age", "Da'da")}
        </span>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          className={inputCls}
          disabled={disabled}
          value={ageClass ?? ""}
          maxLength={40}
          placeholder={t("4 years", "4jir")}
          onChange={(e) => onAgeChange(e.target.value)}
          aria-label={t("Livestock age", "Da'da xoolaha")}
        />
      </label>
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {t("From", "Meesha")}
        </span>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          className={inputCls}
          disabled={disabled}
          value={originPlace ?? ""}
          maxLength={80}
          placeholder="Baydhabo"
          onChange={(e) => onOriginChange(e.target.value)}
          aria-label={t("Livestock origin", "Meesha xoolaha laga keenay")}
        />
      </label>
      {priceSlot ? <div className="min-w-0">{priceSlot}</div> : null}
    </div>
  );
}
