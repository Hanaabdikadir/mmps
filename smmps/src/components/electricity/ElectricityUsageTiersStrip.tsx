"use client";

import {
  ELECTRICITY_USAGE_TIERS,
  type ElectricityUsageTier,
} from "@/lib/electricity-data";
import { cn, formatCurrency } from "@/lib/utils";

function formatTierRange(tier: ElectricityUsageTier): string {
  if (tier.maxKwh == null) {
    return `${tier.minKwh.toLocaleString("en-US")}+ kWh`;
  }
  return `${tier.minKwh.toLocaleString("en-US")}–${tier.maxKwh.toLocaleString("en-US")} kWh`;
}

/**
 * Compact usage-tier rates for embedding at the top of the Price History box.
 * No outer card chrome — sits inside the shared history border.
 */
export function ElectricityUsageTiersStrip({
  tiers = ELECTRICITY_USAGE_TIERS,
  className,
  embedded = false,
}: {
  tiers?: ElectricityUsageTier[];
  className?: string;
  /** When true, omit outer border (used inside Price History box) */
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        embedded
          ? "shrink-0"
          : "shrink-0 overflow-hidden rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-orange-50 shadow-sm",
        className
      )}
    >
      <div className="grid grid-cols-3 divide-x divide-amber-100/90">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className="flex min-w-0 flex-col items-center px-1 py-[5px] text-center"
          >
            <p className="line-clamp-1 text-[8px] font-bold uppercase leading-none tracking-wide text-slate-500">
              {formatTierRange(tier)}
            </p>
            <p className="mt-0.5 text-[13px] font-black leading-none tabular-nums text-slate-900">
              {formatCurrency(tier.ratePerKwh)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
