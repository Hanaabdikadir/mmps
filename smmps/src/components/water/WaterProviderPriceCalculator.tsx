"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Calculator,
  DollarSign,
  Droplets,
  Gauge,
  History,
  TrendingUp,
} from "lucide-react";
import { WATER_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { localizeProviderLabel } from "@/lib/home-content";
import { StableBilingual } from "@/components/ui/StableBilingual";

export interface WaterProviderCalculatorTheme {
  href: string;
  label: string;
  sourceLabel: string;
  headerBg: string;
  cardBodyTint: string;
  accentText: string;
  accent: string;
  accentBg: string;
  cardBorder?: string;
  title?: string;
  subtitle?: string;
  emptyHint?: string;
}

export interface WaterPriceCalculatorRecord {
  id: number;
  waterType: string;
  pricePerUnit: number;
  dateRecorded: string;
}

interface WaterProviderPriceCalculatorProps {
  theme: WaterProviderCalculatorTheme;
  records: WaterPriceCalculatorRecord[];
  /** Catalog/profile current rate when DB price rows are empty */
  fallbackRatePerM3?: number;
}

function latestRateMap(records: WaterPriceCalculatorRecord[]) {
  const map = new Map<string, WaterPriceCalculatorRecord>();
  for (const { value } of WATER_TYPES) {
    const match = records
      .filter((r) => r.waterType === value)
      .sort(
        (a, b) =>
          new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime()
      )[0];
    if (match) map.set(value, match);
  }
  return map;
}

function parseM3(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatM3(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 3 })} m³`;
}

function StatCard({
  icon: Icon,
  iconClass,
  bgClass,
  label,
  children,
}: {
  icon: typeof Gauge;
  iconClass: string;
  bgClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-gray-100 p-2", bgClass)}>
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            iconClass
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
          {label}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function BillSummaryCard({
  icon: Icon,
  iconClass,
  bgClass,
  borderClass,
  label,
  children,
}: {
  icon: typeof Gauge;
  iconClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center rounded-lg border px-1.5 py-2 text-center", bgClass, borderClass)}>
      <span
        className={cn(
          "mb-1 flex h-6 w-6 items-center justify-center rounded-md shadow-sm",
          iconClass
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={2.25} />
      </span>
      <p className="mb-1 line-clamp-2 min-h-[1.6em] px-0.5 text-[7px] font-bold uppercase leading-tight tracking-wide text-gray-500 sm:text-[8px]">
        {label}
      </p>
      <div className="w-full text-center [&_p]:text-center">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full min-h-[38px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 pr-12 text-base font-bold tabular-nums text-gray-900 outline-none transition focus:ring-2";

function calculatorLeftKey(href: string) {
  return `water-calc-left-${href}`;
}

function clearCalculatorState(
  setPreviousInput: (v: string) => void,
  setCurrentInput: (v: string) => void,
  setShowResult: (v: boolean) => void,
  setHighlightResult: (v: boolean) => void
) {
  setPreviousInput("");
  setCurrentInput("");
  setShowResult(false);
  setHighlightResult(false);
}

export function WaterProviderPriceCalculator({
  theme,
  records,
  fallbackRatePerM3 = 0,
}: WaterProviderPriceCalculatorProps) {
  const { lang, t } = useLang();
  const pathname = usePathname();
  const billRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const rateMap = latestRateMap(records);

  const [previousInput, setPreviousInput] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [highlightResult, setHighlightResult] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(calculatorLeftKey(theme.href))) {
        clearCalculatorState(
          setPreviousInput,
          setCurrentInput,
          setShowResult,
          setHighlightResult
        );
        sessionStorage.removeItem(calculatorLeftKey(theme.href));
      }
    } catch {
      /* ignore */
    }
  }, [theme.href, pathname]);

  useEffect(() => {
    const markLeft = () => {
      try {
        sessionStorage.setItem(calculatorLeftKey(theme.href), "1");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", markLeft);
    return () => {
      markLeft();
      window.removeEventListener("pagehide", markLeft);
    };
  }, [theme.href]);

  const previousM3 = parseM3(previousInput);
  const currentM3 = parseM3(currentInput);
  const consumedM3 = Math.max(0, currentM3 - previousM3);

  const rateRecord = useMemo(() => {
    const all = [...rateMap.values()];
    if (all.length === 0) return null;
    const avg = all.reduce((s, r) => s + r.pricePerUnit, 0) / all.length;
    return { ...all[0], pricePerUnit: avg };
  }, [rateMap]);

  const ratePerM3 =
    rateRecord?.pricePerUnit && rateRecord.pricePerUnit > 0
      ? rateRecord.pricePerUnit
      : fallbackRatePerM3 > 0
        ? fallbackRatePerM3
        : 0;
  const totalUsd = consumedM3 > 0 && ratePerM3 > 0 ? consumedM3 * ratePerM3 : 0;

  function handleCalculate() {
    setShowResult(true);
    setHighlightResult(true);
    window.setTimeout(() => setHighlightResult(false), 1800);
  }

  function handleClear() {
    clearCalculatorState(
      setPreviousInput,
      setCurrentInput,
      setShowResult,
      setHighlightResult
    );
  }

  const hasRates = rateMap.size > 0 || fallbackRatePerM3 > 0;
  const canCalculate = currentM3 >= previousM3 && ratePerM3 > 0 && consumedM3 > 0;

  return (
    <div className="provider-price-calculator">
      <div className="flex h-full w-full flex-col">
      <div
        ref={billRef}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm print:shadow-none",
          theme.cardBorder ?? "border-sky-200/70"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 border-b border-white/10 px-5 py-2 print:bg-white print:text-gray-900",
            theme.headerBg
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50 print:border print:border-gray-200">
            <Calculator className="h-4 w-4 text-violet-600 print:text-violet-700" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="text-sm font-black leading-tight text-white print:text-gray-900">
              {theme.title?.trim() ? (
                theme.title
              ) : (
                <StableBilingual en="Price Calculator" so="Xisaabiyaha Qiimaha" lang={lang} />
              )}
            </h2>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          {!hasRates ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
              {t("No prices recorded yet for this provider.", "Ma jiraan qiimayaal la diwaan gashan bixiyahan.")}
            </p>
          ) : (
            <>
              <div className="grid shrink-0 grid-cols-2 gap-2">
                <StatCard
                  icon={Gauge}
                  iconClass="bg-blue-100 text-blue-700"
                  bgClass="bg-blue-50/40"
                  label={t("Previous Reading", "Akhrintii Hore")}
                >
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={previousInput}
                      onChange={(e) => {
                        setPreviousInput(e.target.value);
                        setShowResult(false);
                      }}
                      className={cn(
                        inputClass,
                        "focus:border-emerald-400 focus:ring-emerald-100"
                      )}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      m³
                    </span>
                  </div>
                </StatCard>

                <StatCard
                  icon={Gauge}
                  iconClass="bg-violet-100 text-violet-700"
                  bgClass="bg-violet-50/40"
                  label={t("Current Reading", "Akhrinta Hadda")}
                >
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={currentInput}
                      onChange={(e) => {
                        setCurrentInput(e.target.value);
                        setShowResult(false);
                      }}
                      className={cn(
                        inputClass,
                        "focus:border-teal-400 focus:ring-teal-100"
                      )}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      m³
                    </span>
                  </div>
                </StatCard>
              </div>

            <div
              ref={resultRef}
              id="bill-result"
              className={cn(
                "flex min-h-0 flex-1 flex-col rounded-lg border p-2 transition-all duration-500",
                showResult && canCalculate
                  ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white"
                  : cn(theme.cardBodyTint, "border-gray-100"),
                highlightResult &&
                  "shadow-md ring-2 ring-emerald-400 ring-offset-1"
              )}
            >
              <p className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {t("Total Bill (USD)", "Wadarta Biilka (USD)")}
              </p>

              {showResult && canCalculate ? (
                <div className="mt-1.5 flex min-h-0 flex-1 flex-col justify-between gap-2">
                  <div className="grid grid-cols-2 gap-[3px] sm:grid-cols-4">
                    <BillSummaryCard
                      icon={History}
                      iconClass="bg-blue-100 text-blue-700"
                      bgClass="bg-blue-50/60"
                      borderClass="border-blue-300"
                      label={t("Previous", "Hore")}
                    >
                      <p className="text-sm font-black tabular-nums text-blue-900">
                        {previousM3.toLocaleString()}{" "}
                        <span className="text-[10px] font-semibold text-blue-400">m³</span>
                      </p>
                    </BillSummaryCard>
                    <BillSummaryCard
                      icon={Gauge}
                      iconClass="bg-violet-100 text-violet-700"
                      bgClass="bg-violet-50/60"
                      borderClass="border-violet-300"
                      label={t("Current", "Hadda")}
                    >
                      <p className="text-sm font-black tabular-nums text-violet-900">
                        {currentM3.toLocaleString()}{" "}
                        <span className="text-[10px] font-semibold text-violet-400">m³</span>
                      </p>
                    </BillSummaryCard>
                    <BillSummaryCard
                      icon={Droplets}
                      iconClass="bg-amber-100 text-amber-700"
                      bgClass="bg-amber-50/60"
                      borderClass="border-amber-300"
                      label={t("Water used", "Biyo la isticmaalay")}
                    >
                      <p className="text-sm font-black text-amber-900">
                        {formatM3(consumedM3)}
                      </p>
                    </BillSummaryCard>
                    <BillSummaryCard
                      icon={DollarSign}
                      iconClass="bg-rose-100 text-rose-700"
                      bgClass="bg-rose-50/60"
                      borderClass="border-rose-300"
                      label={t("Rate", "Qiimaha")}
                    >
                      <p className="text-sm font-black text-rose-900">
                        {formatCurrency(ratePerM3)}
                        <span className="text-[10px] font-semibold text-rose-400">/m³</span>
                      </p>
                    </BillSummaryCard>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black leading-none text-emerald-800 sm:text-4xl">
                      {formatCurrency(totalUsd)}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <TrendingUp className="h-3 w-3" />
                      {formatM3(consumedM3)} {t("used", "la isticmaalay")}
                    </span>
                  </div>

                  <p className="shrink-0 text-center text-[11px] font-semibold text-gray-600">
                    {formatM3(consumedM3)} × {formatCurrency(ratePerM3)}/m³
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
                  <Droplets className="h-8 w-8 text-emerald-300/80" strokeWidth={1.75} />
                  <p className="text-xs text-gray-400">
                    {currentM3 < previousM3
                      ? t("Current reading must be ≥ previous.", "Akhrinta hadda waa inay ka weyn tahay tii hore.")
                      : theme.emptyHint?.trim() ||
                        t("Press Calculate to see your bill summary.", "Riix Xisaabi si aad u aragto koowarantaada.")}
                  </p>
                </div>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Calculator className="h-4 w-4 shrink-0" />
                <StableBilingual en="Calculate" so="Xisaabi" lang={lang} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-1.5 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                <StableBilingual en="Clear" so="Tirtir" lang={lang} />
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  </div>
  );
}
