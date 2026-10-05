"use client";

import type { ReactNode } from "react";
import { Layers } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TRANSLATIONS, useLang } from "@/lib/language-context";

export type TariffTierColumn = {
  key: string;
  labelEn: string;
  labelSo: string;
};

export type TariffTierRow = {
  year: number;
  /** Rate values keyed by column.key */
  rates: Record<string, number>;
};

/** Fixed tariff history window shown on water & electricity provider pages. */
export {
  TARIFF_YEAR_START,
  TARIFF_YEAR_END,
  tariffDisplayYears,
} from "@/lib/tariff-years";
import {
  TARIFF_YEAR_START,
  TARIFF_YEAR_END,
  tariffDisplayYears,
} from "@/lib/tariff-years";

/** Format signed USD change for tariff table cells. */
export function formatTariffChangeCell(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "+$0.00";
  const sign = value > 0 ? "+" : "−";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function tariffYearsInRange(
  rows: TariffTierRow[],
  start = TARIFF_YEAR_START,
  end = TARIFF_YEAR_END
): TariffTierRow[] {
  return [...rows]
    .filter((row) => row.year >= start && row.year <= end)
    .sort((a, b) => b.year - a.year);
}

/** Read a stored yearly rate (profile DB or market-price aggregates). No hardcoded defaults. */
export function lookupStoredYearlyRate(
  history: Partial<Record<number, number>> | undefined,
  year: number
): number | undefined {
  if (!history) return undefined;
  const map = history as Record<string | number, number | undefined>;
  const raw = map[year] ?? map[String(year)];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function buildYearlyRateChangeRows(
  yearlyRateHistory: Partial<Record<number, number>> | undefined,
  fromYear = TARIFF_YEAR_START
): TariffTierRow[] {
  return tariffDisplayYears(fromYear, TARIFF_YEAR_END).map((year) => {
    const rate = lookupStoredYearlyRate(yearlyRateHistory, year);
    const prevRate = lookupStoredYearlyRate(yearlyRateHistory, year - 1);
    let change = Number.NaN;
    if (rate != null && prevRate != null) {
      change = Math.round((rate - prevRate) * 100) / 100;
    } else if (rate != null && year === fromYear) {
      // Oldest displayed year has no prior year in the table — show +$0.00
      change = 0;
    }
    return {
      year,
      rates: {
        rate: rate ?? Number.NaN,
        change,
      },
    };
  });
}

export const YEARLY_RATE_CHANGE_COLUMNS: Record<
  UtilityTariffSector,
  TariffTierColumn[]
> = {
  water: [
    { key: "rate", labelEn: "USD / M³", labelSo: "USD / M³" },
    { key: "change", labelEn: "CHANGE", labelSo: "ISBEDDEL" },
  ],
  electricity: [
    { key: "rate", labelEn: "USD / kWh", labelSo: "USD / kWh" },
    { key: "change", labelEn: "CHANGE", labelSo: "ISBEDDEL" },
  ],
};

export type UtilityTariffSector = "water" | "electricity";

export type ProviderTariffTiersContentProps = {
  sector: UtilityTariffSector;
  unitSuffix: string;
  columns: TariffTierColumn[];
  rows: TariffTierRow[];
  /** Return a custom cell string, or null to use default currency formatting */
  formatCell?: (key: string, value: number, year: number) => string | null;
  className?: string;
  /** Optional content shown inside the price-history box, above the table */
  topContent?: ReactNode;
  /** Override the year-column header (default: Price History). */
  yearHeaderEn?: string;
  yearHeaderSo?: string;
  /** Natural-height table (no stretch) — e.g. free-plan current-year row. */
  compact?: boolean;
};

export function ProviderTariffTiersContent({
  sector,
  unitSuffix,
  columns,
  rows,
  formatCell,
  className,
  topContent,
  yearHeaderEn,
  yearHeaderSo,
  compact = false,
}: ProviderTariffTiersContentProps) {
  void unitSuffix;
  const { lang, t } = useLang();
  const sorted = [...rows].sort((a, b) => b.year - a.year);
  const displayRows = tariffYearsInRange(sorted);
  const yearColWidth = columns.length <= 2 ? "w-[22%]" : "w-[20%]";
  const periodTranslations =
    sector === "water" ? TRANSLATIONS.water : TRANSLATIONS.electricity;
  const yearHeader =
    yearHeaderEn && yearHeaderSo
      ? t(yearHeaderEn, yearHeaderSo)
      : t(
          periodTranslations.priceHistory.en,
          periodTranslations.priceHistory.so
        );
  const cellPad = compact
    ? "px-2 py-1.5 sm:px-3"
    : "px-2 py-[5px] sm:px-3";
  const headPad = compact
    ? "px-1.5 py-1.5 sm:px-2"
    : "px-1.5 py-[5px] sm:px-2";
  const cellText = compact ? "text-xs sm:text-[13px]" : "text-xs sm:text-sm";
  const headText = compact
    ? "text-[11px] sm:text-xs"
    : "text-[10px] sm:text-[11px]";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        !compact && "min-h-0 flex-1",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-white shadow-sm animate-rate-history-in",
          !compact && "min-h-0 flex-1"
        )}
      >
        {topContent ? (
          <div className="shrink-0 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50">
            {topContent}
          </div>
        ) : null}
        <table
          className={cn(
            "w-full table-fixed border-collapse text-left",
            !compact && "h-full"
          )}
        >
          <thead>
            <tr className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50">
              <th
                className={cn(
                  "bg-transparent font-bold uppercase leading-tight tracking-wide text-sky-800",
                  "whitespace-nowrap",
                  headText,
                  cellPad,
                  yearColWidth
                )}
              >
                {yearHeader}
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-center font-bold uppercase leading-tight tracking-wide text-sky-800",
                    headText,
                    headPad
                  )}
                >
                  {lang === "so" ? col.labelSo : col.labelEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const isCurrentYear = row.year === TARIFF_YEAR_END;
              return (
                <tr
                  key={row.year}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    isCurrentYear
                      ? "bg-violet-300"
                      : idx % 2 === 0
                        ? "rate-history-row--alt"
                        : "bg-white"
                  )}
                >
                  <td
                    className={cn(
                      "bg-inherit font-black",
                      cellPad,
                      cellText,
                      isCurrentYear ? "text-violet-950" : "text-slate-900"
                    )}
                  >
                    {row.year}
                  </td>
                  {columns.map((col) => {
                    const value = row.rates[col.key];
                    const custom =
                      typeof value === "number" && formatCell
                        ? formatCell(col.key, value, row.year)
                        : null;
                    const isChangeCol = col.key === "change";
                    const changeTone =
                      isChangeCol &&
                      typeof value === "number" &&
                      Number.isFinite(value)
                        ? value > 0
                          ? "text-emerald-700 font-black"
                          : value < 0
                            ? "text-rose-700 font-black"
                            : "text-violet-950"
                        : isCurrentYear
                          ? "text-violet-950"
                          : "text-slate-900";
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "text-center font-bold tabular-nums",
                          headPad,
                          cellText,
                          changeTone
                        )}
                      >
                        {custom != null
                          ? custom
                          : typeof value === "number" && Number.isFinite(value)
                            ? formatCurrency(value)
                            : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type ProviderTariffTiersCardProps = {
  headerBg: string;
  cardBorder: string;
  providerLabel: string;
  sector: UtilityTariffSector;
  unitSuffix: string;
  columns: TariffTierColumn[];
  rows: TariffTierRow[];
  titleEn?: string;
  titleSo?: string;
  subtitleEn?: string;
  subtitleSo?: string;
  /** Return a custom cell string, or null to use default currency formatting */
  formatCell?: (key: string, value: number, year: number) => string | null;
};

export function ProviderTariffTiersCard({
  headerBg,
  cardBorder,
  providerLabel,
  sector,
  unitSuffix,
  columns,
  rows,
  titleEn = TRANSLATIONS.electricity.tariffRatesByTier.en,
  titleSo = TRANSLATIONS.electricity.tariffRatesByTier.so,
  subtitleEn,
  subtitleSo,
  formatCell,
}: ProviderTariffTiersCardProps) {
  const { t } = useLang();
  const officialTariffLabel =
    sector === "water"
      ? TRANSLATIONS.water.officialTariff
      : TRANSLATIONS.electricity.officialTariff;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md",
        cardBorder
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-2",
          headerBg
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50">
          <Layers className="h-4 w-4 text-indigo-600" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-tight text-white">
            {t(titleEn, titleSo)}
          </h2>
          <p className="text-[10px] text-white/80">
            {subtitleEn && subtitleSo
              ? t(subtitleEn, subtitleSo)
              : `${t(officialTariffLabel.en, officialTariffLabel.so)} · ${providerLabel}`}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <ProviderTariffTiersContent
          sector={sector}
          unitSuffix={unitSuffix}
          columns={columns}
          rows={rows}
          formatCell={formatCell}
        />
      </div>
    </div>
  );
}
