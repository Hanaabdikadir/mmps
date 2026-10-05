"use client";

import { useEffect, useRef, useState } from "react";
import { Beef, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type OwnerSelectOption = {
  id: string;
  title: string;
  subtitle?: string;
};

export function OwnerSelectCard({
  label,
  valueId,
  options,
  onChange,
  locked,
}: {
  label?: string;
  valueId: string;
  options: OwnerSelectOption[];
  onChange?: (id: string) => void;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === valueId) || options[0];
  const canOpen = !locked && options.length > 1 && Boolean(onChange);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={wrapRef} className="relative">
      {label ? (
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => canOpen && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm",
          canOpen
            ? "border-slate-200 hover:border-emerald-300"
            : "cursor-default border-slate-200"
        )}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
          <Beef className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-slate-900">
            {selected.title}
          </span>
          {selected.subtitle ? (
            <span className="block truncate text-[12px] font-medium text-slate-500">
              {selected.subtitle}
            </span>
          ) : null}
        </span>
        {canOpen ? (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition",
              open && "rotate-180"
            )}
          />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
        )}
      </button>
      {open && canOpen ? (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange?.(opt.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                opt.id === selected.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-900 hover:bg-slate-50"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">
                  {opt.title}
                </span>
                {opt.subtitle ? (
                  <span
                    className={cn(
                      "block truncate text-[11px]",
                      opt.id === selected.id ? "text-white/80" : "text-slate-500"
                    )}
                  >
                    {opt.subtitle}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
