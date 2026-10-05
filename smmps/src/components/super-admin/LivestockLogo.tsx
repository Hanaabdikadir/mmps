"use client";

import Image from "next/image";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: { box: "h-9 w-9", px: 72 },
  md: { box: "h-11 w-11", px: 88 },
  lg: { box: "h-14 w-14", px: 112 },
  xl: { box: "h-16 w-16", px: 128 },
} as const;

/**
 * HD livestock market logo (camel, cow, goat) — circular avatar
 * used across Super Admin wherever livestock is represented.
 */
export function LivestockLogo({
  size = "lg",
  className,
  alt = "Livestock",
}: {
  size?: keyof typeof SIZE_MAP;
  className?: string;
  alt?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1.5 shadow-sm",
        s.box,
        className
      )}
    >
      <Image
        src={LIVESTOCK_MARKET_LOGO}
        alt={alt}
        width={s.px}
        height={s.px}
        quality={100}
        unoptimized
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
