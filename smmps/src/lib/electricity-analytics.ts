import type { ElectricityPriceRecord } from "@/lib/market-price-types";

export function countUniqueProviders(
  records: ElectricityPriceRecord[]
): number {
  return new Set(records.map((r) => r.providerName)).size;
}

function getLastUpdated(
  records: ElectricityPriceRecord[]
): Date | null {
  if (records.length === 0) return null;
  return records.reduce(
    (latest, r) => {
      const d = new Date(r.dateRecorded);
      return d > latest ? d : latest;
    },
    new Date(0)
  );
}

export interface YearlyRateRow {
  year: number;
  rate: number;
  changeUsd: number | null;
  changePct: number | null;
}

export interface FiveYearRateHistory {
  rows: YearlyRateRow[];
  currentRate: number;
  /** First real yearly rate used for change KPIs */
  startRate: number;
  updatedAt: Date | null;
  fiveYearChangeUsd: number;
  fiveYearChangePct: number;
  avgAnnualIncreasePct: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Read a yearly rate whether keys are numbers or JSON string years. */
function rateForYear(
  yearlyRates: Partial<Record<number, number>> | Record<string, number> | undefined,
  year: number
): number {
  if (!yearlyRates) return 0;
  const map = yearlyRates as Record<string | number, number | undefined>;
  const raw = map[year] ?? map[String(year)];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function buildHistoryFromYearlyRates(
  yearlyRates: Partial<Record<number, number>>,
  updatedAt: Date | null
): FiveYearRateHistory {
  const normalized = normalizeYearlyRateHistory(yearlyRates);
  if (Object.keys(normalized).length === 0) {
    return {
      rows: [],
      currentRate: 0,
      startRate: 0,
      updatedAt,
      fiveYearChangeUsd: 0,
      fiveYearChangePct: 0,
      avgAnnualIncreasePct: 0,
    };
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  const rates = years.map((y) => round2(rateForYear(normalized, y)));

  const rows: YearlyRateRow[] = years.map((year, i) => {
    const rate = rates[i]!;
    const prevPositive = rates.slice(0, i).filter((r) => r > 0).at(-1) ?? null;
    return {
      year,
      rate,
      changeUsd:
        rate > 0 && prevPositive != null ? round2(rate - prevPositive) : null,
      changePct:
        rate > 0 && prevPositive != null && prevPositive > 0
          ? round2(((rate - prevPositive) / prevPositive) * 100)
          : null,
    };
  });

  const positive = rows.filter((r) => r.rate > 0);
  const first = positive[0];
  const last = positive[positive.length - 1];
  const current =
    positive.find((r) => r.year === currentYear) ?? last ?? null;

  const startRate = first?.rate ?? 0;
  const currentRate = current?.rate ?? 0;
  const fiveYearChangeUsd =
    first && last ? round2(last.rate - first.rate) : 0;
  const fiveYearChangePct =
    first && first.rate > 0
      ? round2(((last!.rate - first.rate) / first.rate) * 100)
      : 0;
  const spanYears =
    first && last ? Math.max(1, last.year - first.year) : 1;
  const avgAnnualIncreasePct =
    first && last && first.rate > 0
      ? round2((Math.pow(last.rate / first.rate, 1 / spanYears) - 1) * 100)
      : 0;

  return {
    rows,
    currentRate,
    startRate,
    updatedAt,
    fiveYearChangeUsd,
    fiveYearChangePct,
    avgAnnualIncreasePct,
  };
}

/** Average USD/kWh by calendar year from approved price rows. */
export function aggregateYearlyAveragesFromPrices(
  records: ElectricityPriceRecord[]
): Partial<Record<number, number>> {
  const byYear = new Map<number, number[]>();
  for (const record of records) {
    const price = Number(record.pricePerKwh);
    if (!Number.isFinite(price) || price <= 0) continue;
    const year = new Date(record.dateRecorded).getFullYear();
    if (!Number.isFinite(year)) continue;
    const values = byYear.get(year) ?? [];
    values.push(price);
    byYear.set(year, values);
  }
  const yearlyRates: Partial<Record<number, number>> = {};
  for (const [year, values] of byYear) {
    yearlyRates[year] = round2(
      values.reduce((sum, value) => sum + value, 0) / values.length
    );
  }
  return yearlyRates;
}

/** Keep only finite positive yearly rates (from DB profile JSON). */
export function normalizeYearlyRateHistory(
  yearlyRates:
    | Partial<Record<number, number>>
    | Record<string, number>
    | null
    | undefined
): Partial<Record<number, number>> {
  if (!yearlyRates || typeof yearlyRates !== "object") return {};
  const out: Partial<Record<number, number>> = {};
  for (const [yearKey, raw] of Object.entries(yearlyRates)) {
    const year = Number(yearKey);
    const value = Number(raw);
    if (!Number.isFinite(year) || !Number.isFinite(value) || value <= 0) continue;
    out[year] = round2(value);
  }
  return out;
}

export type ProviderYearlySeries = {
  key: string;
  label: string;
  color: string;
  name?: string;
  description?: string;
  yearlyRates: Partial<Record<number, number>>;
};

/**
 * Merge DB yearly averages with catalog/profile fallbacks.
 * Positive DB values win per year; missing years fill from fallback (never fake $0.00).
 */
export function mergeYearlyRateMaps(
  primary: Partial<Record<number, number>>,
  fallback?: Partial<Record<number, number>> | Record<string, number> | null
): Partial<Record<number, number>> {
  const out: Partial<Record<number, number>> = { ...normalizeYearlyRateHistory(primary) };
  const fb = normalizeYearlyRateHistory(fallback);
  for (const [yearKey, value] of Object.entries(fb)) {
    const year = Number(yearKey);
    if (!Number.isFinite(year)) continue;
    if (out[year] == null || !(Number(out[year]) > 0)) out[year] = value;
  }
  return out;
}

export function buildFiveYearRateHistory(
  records: ElectricityPriceRecord[],
  fallbackYearlyRates?:
    | Partial<Record<number, number>>
    | Record<string, number>
    | null
): FiveYearRateHistory {
  const latestDate = getLastUpdated(records);
  // Company profile / saved current rate wins; market rows only fill missing years.
  const yearlyRates = mergeYearlyRateMaps(
    fallbackYearlyRates ?? {},
    aggregateYearlyAveragesFromPrices(records)
  );
  return buildHistoryFromYearlyRates(yearlyRates, latestDate);
}
