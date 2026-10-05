"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2, Calculator, Droplets, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

export interface WaterListingCardData {
  id: string;
  href: string;
  name: string;
  titleEn: string;
  titleSo: string;
  image?: string;
  imageBg?: string;
  pricePerM3: number;
}

interface WaterProviderListingCardsProps {
  providers: WaterListingCardData[];
  sectionClassName?: string;
  sectionId?: string;
}

function parseReading(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function WaterProviderCalcCard({ provider }: { provider: WaterListingCardData }) {
  const { lang, t } = useLang();
  const title = lang === "so" ? provider.titleSo : provider.titleEn;

  const [open, setOpen] = useState(false);
  const [previousInput, setPreviousInput] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [showResult, setShowResult] = useState(false);

  const previousM3 = parseReading(previousInput);
  const currentM3 = parseReading(currentInput);
  const usedM3 = Math.max(0, currentM3 - previousM3);
  const rate = provider.pricePerM3;
  const total = usedM3 > 0 && rate > 0 ? usedM3 * rate : 0;
  const canCalculate =
    previousInput.trim() !== "" &&
    currentInput.trim() !== "" &&
    currentM3 >= previousM3 &&
    usedM3 > 0 &&
    rate > 0;

  function handleOpenCalculate() {
    setOpen(true);
    setShowResult(false);
  }

  function handleClose() {
    setOpen(false);
    setPreviousInput("");
    setCurrentInput("");
    setShowResult(false);
  }

  function handleCalculate() {
    if (!canCalculate) return;
    setShowResult(true);
  }

  function handleClear() {
    setPreviousInput("");
    setCurrentInput("");
    setShowResult(false);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      {/* Top: logo + name + CALCULATE */}
      <div className="flex items-center gap-3 px-3.5 py-3.5 sm:px-4">
        <div
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-emerald-100",
            provider.imageBg ?? "bg-emerald-50"
          )}
        >
          {provider.image ? (
            <Image
              src={provider.image}
              alt={provider.name}
              width={44}
              height={44}
              className="h-full w-full object-contain p-1"
              unoptimized
            />
          ) : (
            <Building2
              className="h-5 w-5 text-emerald-700"
              strokeWidth={2.25}
              aria-hidden
            />
          )}
        </div>

        <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold leading-snug text-slate-800 sm:text-base">
          {title}
        </h3>

        {open ? (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50 sm:px-3.5 sm:text-xs"
            aria-label={t("Close", "Xir")}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("Close", "Xir")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenCalculate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:px-3.5 sm:text-xs"
          >
            <Calculator className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("Calculate", "Xisaabi")}
          </button>
        )}
      </div>

      {/* Water price — always visible */}
      <div className="flex items-center justify-between gap-3 border-t border-emerald-100/80 bg-emerald-50/80 px-3.5 py-3.5 sm:px-4">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
            aria-hidden
          />
          {t("Water price", "Qiimaha biyaha")}
        </p>
        <div className="text-right">
          <p className="text-2xl font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(rate)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {t("per m³", "hal m³")}
          </p>
        </div>
      </div>

      {/* Calculator panel — only after CALCULATE is tapped */}
      {open ? (
        <div className="animate-fade-in-up border-t border-slate-100 bg-white px-3.5 py-3.5 sm:px-4">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t("Previous Reading", "Akhrintii Hore")}
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  autoFocus
                  value={previousInput}
                  onChange={(e) => {
                    setPreviousInput(e.target.value);
                    setShowResult(false);
                  }}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-3 pr-10 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  m³
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t("Current Reading", "Akhrinta Hadda")}
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={currentInput}
                  onChange={(e) => {
                    setCurrentInput(e.target.value);
                    setShowResult(false);
                  }}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-3 pr-10 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  m³
                </span>
              </div>
            </label>
          </div>

          {showResult && canCalculate ? (
            <div className="mt-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Droplets className="h-4 w-4 text-blue-700" strokeWidth={2.25} />
                  <span className="font-semibold">
                    {usedM3.toLocaleString("en-US", { maximumFractionDigits: 3 })} m³{" "}
                    {t("used", "la isticmaalay")}
                  </span>
                </div>
                <p className="text-xl font-extrabold tabular-nums text-blue-900">
                  {formatCurrency(total)}
                </p>
              </div>
              <p className="mt-1 text-right text-[11px] font-medium text-blue-700/80">
                {usedM3.toLocaleString("en-US", { maximumFractionDigits: 3 })} m³ ×{" "}
                {formatCurrency(rate)}/m³
              </p>
            </div>
          ) : currentM3 < previousM3 && currentInput.trim() !== "" ? (
            <p className="mt-3 text-center text-xs font-medium text-rose-600">
              {t(
                "Current reading must be ≥ previous reading.",
                "Akhrinta hadda waa inay ka weyn tahay tii hore."
              )}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Calculator className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("Calculate", "Xisaabi")}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {t("Clear", "Tirtir")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Compact water cards — CALCULATE expands inline meter calculator
 * (Akhrintii Hore / Akhrinta Hadda).
 */
export function WaterProviderListingCards({
  providers,
  sectionClassName,
  sectionId,
}: WaterProviderListingCardsProps) {
  return (
    <section id={sectionId} className={sectionClassName}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <WaterProviderCalcCard key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  );
}
