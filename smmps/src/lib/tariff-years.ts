/** Fixed tariff history window shown on water & electricity provider pages. */
export const TARIFF_YEAR_START = 2022;
export const TARIFF_YEAR_END = 2026;

export function tariffDisplayYears(
  start = TARIFF_YEAR_START,
  end = TARIFF_YEAR_END
): number[] {
  const years: number[] = [];
  for (let year = end; year >= start; year--) {
    years.push(year);
  }
  return years;
}

/** Ascending calendar years for admin forms (oldest → newest). */
export function tariffAdminYears(
  start = TARIFF_YEAR_START,
  end = TARIFF_YEAR_END
): number[] {
  return tariffDisplayYears(start, end).slice().reverse();
}

/**
 * Oldest year the paid months may show.
 * 1 month: current year. 2 months: 2 years. 3 months: 3 years.
 * 6 months and 1 year: full 2022–2026 table.
 */
export function tariffFromYearForPlan(
  price: number | string | null | undefined,
  durationDays: number | null | undefined
): number {
  const n = Number(price);
  const days = Number(durationDays);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(days) || days <= 31) {
    return TARIFF_YEAR_END;
  }
  if (days <= 65) return Math.max(TARIFF_YEAR_START, TARIFF_YEAR_END - 1);
  if (days <= 95) return Math.max(TARIFF_YEAR_START, TARIFF_YEAR_END - 2);
  return TARIFF_YEAR_START;
}

/** Past years shown as read-only price history (2022–2025). */
export function tariffHistoryYears(
  start = TARIFF_YEAR_START,
  current = TARIFF_YEAR_END
): number[] {
  if (current <= start) return [];
  return tariffAdminYears(start, current - 1);
}
