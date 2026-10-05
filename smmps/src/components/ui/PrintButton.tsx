"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrintButton({
  className,
  onClick,
  label = "Print",
}: {
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick ?? (() => window.print())}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700",
        className
      )}
    >
      <Printer className="h-4 w-4" strokeWidth={2.5} />
      {label}
    </button>
  );
}
