export type AdvancedReportType =
  | "livestock_type_market"
  | "hal_camel_market" // legacy alias → livestock_type_market
  | "utility_highest_rate"
  | "livestock_price_range"
  | "all_companies"
  | "company_info_documents"
  | "all_brokers"
  | "all_livestock"
  | "companies_by_rate"
  | "registered_in_year"
  | "all_users"
  | "all_categories"
  | "broker_market_goats"
  | "compare_two_markets"
  | "compare_two_companies"
  | "livestock_price_trend"
  | "price_approvals"
  | "broker_activity"
  | "inactive_registrations"
  | "all_markets"
  | "all_utility_prices"
  | "all_subscriptions";

export type PriceCompareOp = "gt" | "lt" | "between";
export type RateSort = "cheap" | "high";
export type UtilityKind = "water" | "electricity";
export type RegisteredKind = "companies" | "brokers" | "both";
export type LivestockClass = "birimo" | "sugunto";
export type MarketOption = {
  id?: number | string;
  name: string;
  label?: string;
};

/** @deprecated Use LivestockClass — Birimo/Sugunto are class types, not seasons. */
export type LivestockSeason = LivestockClass;

export type AdvancedReportFilters = {
  reportType: AdvancedReportType;
  dateFrom?: string | null;
  dateTo?: string | null;
  marketName?: string | null;
  /** Second market for compare_two_markets. */
  marketNameB?: string | null;
  /** Selected livestock animal type id (for livestock_type_market). */
  livestockTypeId?: number | null;
  /** Display name resolved server-side / UI for titles. */
  livestockTypeName?: string | null;
  companySlug?: string | null;
  companyName?: string | null;
  companyNameB?: string | null;
  utilityKind?: UtilityKind | null;
  priceOp?: PriceCompareOp | null;
  priceMin?: number | null;
  priceMax?: number | null;
  rateSort?: RateSort | null;
  year?: number | null;
  /** YYYY-MM — registration range start (registered_in_year). */
  monthFrom?: string | null;
  /** YYYY-MM — registration range end (registered_in_year). */
  monthTo?: string | null;
  registeredKind?: RegisteredKind | null;
  livestockSeason?: LivestockSeason | null;
  ageClass?: string | null;
  /** Inclusive livestock age in years (livestock_type_market). */
  ageMin?: number | null;
  ageMax?: number | null;
  /** Origin place filter (meesha laga keenay). */
  originPlace?: string | null;
  /** Livestock category name for the categories report. */
  livestockCategory?: string | null;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  /** Sector filter for price_approvals: "all" | "livestock" | "water" | "electricity" */
  sector?: "all" | "livestock" | "water" | "electricity" | string | null;
};

export type AdvancedReportColumn = { key: string; label: string };
export type AdvancedReportRow = Record<string, string | number | null>;

export type AdvancedReportResult = {
  reportType: AdvancedReportType;
  title: string;
  subtitle: string;
  generatedAt: string;
  systemName: string;
  systemShort: string;
  columns: AdvancedReportColumn[];
  rows: AdvancedReportRow[];
  summary?: string;
};

/** Inclusive calendar bounds for report date filters (YYYY-MM-DD). */
export const REPORT_DATE_MIN = "2020-01-01";
export const REPORT_DATE_MAX = "2030-12-31";
export const REPORT_YEAR_MIN = 2020;
export const REPORT_YEAR_MAX = 2030;

/** True when value is empty or a real YYYY-MM-DD within REPORT_DATE_MIN..MAX. */
export function isValidReportDate(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < REPORT_YEAR_MIN || y > REPORT_YEAR_MAX) return false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }
  const iso = value.trim();
  return iso >= REPORT_DATE_MIN && iso <= REPORT_DATE_MAX;
}

/** Returns an error message, or null when the range is OK. */
export function validateReportDateRange(
  dateFrom?: string | null,
  dateTo?: string | null
): string | null {
  if (dateFrom?.trim() && !isValidReportDate(dateFrom)) {
    return `From date must be a valid day between ${REPORT_DATE_MIN} and ${REPORT_DATE_MAX}.`;
  }
  if (dateTo?.trim() && !isValidReportDate(dateTo)) {
    return `To date must be a valid day between ${REPORT_DATE_MIN} and ${REPORT_DATE_MAX}.`;
  }
  if (dateFrom?.trim() && dateTo?.trim() && dateFrom.trim() > dateTo.trim()) {
    return "From date cannot be after To date.";
  }
  return null;
}

export function isValidReportYear(year: number | null | undefined): boolean {
  if (year == null || !Number.isFinite(year)) return true;
  return (
    Number.isInteger(year) &&
    year >= REPORT_YEAR_MIN &&
    year <= REPORT_YEAR_MAX
  );
}

export const REPORT_MONTH_MIN = `${REPORT_YEAR_MIN}-01`;
export const REPORT_MONTH_MAX = `${REPORT_YEAR_MAX}-12`;

/** True when empty or a real YYYY-MM within REPORT_YEAR_MIN..MAX. */
export function isValidReportMonth(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (y < REPORT_YEAR_MIN || y > REPORT_YEAR_MAX) return false;
  if (mo < 1 || mo > 12) return false;
  return true;
}

const REPORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatReportMonth(yyyyMm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!m) return yyyyMm;
  const mo = Number(m[2]);
  return `${REPORT_MONTH_NAMES[mo - 1]} ${m[1]}`;
}

export function reportMonthFirstDay(yyyyMm: string): string {
  return `${yyyyMm.trim()}-01`;
}

export function reportMonthLastDay(yyyyMm: string): string {
  const [y, mo] = yyyyMm.trim().split("-").map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${yyyyMm.trim()}-${String(last).padStart(2, "0")}`;
}

export function validateReportMonthRange(
  monthFrom?: string | null,
  monthTo?: string | null
): string | null {
  if (monthFrom?.trim() && !isValidReportMonth(monthFrom)) {
    return `From month must be between ${REPORT_MONTH_MIN} and ${REPORT_MONTH_MAX}.`;
  }
  if (monthTo?.trim() && !isValidReportMonth(monthTo)) {
    return `To month must be between ${REPORT_MONTH_MIN} and ${REPORT_MONTH_MAX}.`;
  }
  if (
    monthFrom?.trim() &&
    monthTo?.trim() &&
    monthFrom.trim() > monthTo.trim()
  ) {
    return "From month cannot be after To month.";
  }
  return null;
}

export const ADVANCED_REPORT_GROUPS = [
  "Livestock",
  "Water",
  "Electricity",
  "Companies & brokers",
  "System",
] as const;

export type AdvancedReportGroup = (typeof ADVANCED_REPORT_GROUPS)[number];

export const ADVANCED_REPORT_OPTIONS: {
  type: AdvancedReportType;
  label: string;
  description: string;
  group: AdvancedReportGroup;
  /** Locks the utility filter so water and electricity stay in their own lists. */
  lockUtility?: UtilityKind;
  /** Locks the approval sector so each sector list stays together. */
  lockSector?: "livestock" | "water" | "electricity";
}[] = [
  {
    type: "livestock_type_market",
    group: "Livestock",
    label: "Livestock by type, market & date",
    description:
      "Any livestock type (Hal, Awr, Sac, etc.) prices in a market between two dates",
  },
  {
    type: "utility_highest_rate",
    group: "Water",
    lockUtility: "water",
    label: "Highest water rate (m³)",
    description: "Highest water rate for a company in a date range",
  },
  {
    type: "companies_by_rate",
    group: "Water",
    lockUtility: "water",
    label: "Water companies by cheap / high rate",
    description: "Water companies ranked by cheapest or highest rates",
  },
  {
    type: "compare_two_companies",
    group: "Water",
    lockUtility: "water",
    label: "Compare two water companies",
    description: "Compare water rates of two companies side by side",
  },
  {
    type: "all_utility_prices",
    group: "Water",
    lockUtility: "water",
    label: "All water prices",
    description: "Live water rates saved in the database",
  },
  {
    type: "all_companies",
    group: "Companies & brokers",
    label: "All registered companies",
    description: "List of all active registered companies",
  },
  {
    type: "company_info_documents",
    group: "Companies & brokers",
    label: "Company info and documents",
    description:
      "Company profile, contacts, and which registration documents are on file",
  },
  {
    type: "all_brokers",
    group: "Companies & brokers",
    label: "All livestock brokers",
    description: "List of all livestock brokers",
  },
  {
    type: "all_livestock",
    group: "Livestock",
    label: "All livestock price records",
    description: "All livestock price records in the system",
  },
  {
    type: "utility_highest_rate",
    group: "Electricity",
    lockUtility: "electricity",
    label: "Highest electricity rate (kWh)",
    description: "Highest electricity rate for a company in a date range",
  },
  {
    type: "companies_by_rate",
    group: "Electricity",
    lockUtility: "electricity",
    label: "Electricity companies by cheap / high rate",
    description: "Electricity companies ranked by cheapest or highest rates",
  },
  {
    type: "compare_two_companies",
    group: "Electricity",
    lockUtility: "electricity",
    label: "Compare two electricity companies",
    description: "Compare electricity rates of two companies side by side",
  },
  {
    type: "all_utility_prices",
    group: "Electricity",
    lockUtility: "electricity",
    label: "All electricity prices",
    description: "Live electricity rates saved in the database",
  },
  {
    type: "registered_in_year",
    group: "Companies & brokers",
    label: "Registration date range",
    description:
      "From date through the last registration on or before To date (companies and/or brokers)",
  },
  {
    type: "all_users",
    group: "System",
    label: "All users",
    description: "System users with roles and status",
  },
  {
    type: "all_subscriptions",
    group: "System",
    label: "All subscriptions",
    description:
      "Company and broker plans, status, start/expiry dates, and latest payment proof",
  },
  {
    type: "all_categories",
    group: "Livestock",
    label: "Livestock categories",
    description: "Livestock categories and animal types",
  },
  {
    type: "broker_market_goats",
    group: "Livestock",
    label: "Broker by market + livestock",
    description:
      "Brokers in a market with the livestock they manage (2 if they manage 2, 3 if they manage 3)",
  },
  {
    type: "compare_two_markets",
    group: "Livestock",
    label: "Compare two markets",
    description: "Compare a livestock type’s prices in two markets side by side",
  },
  {
    type: "price_approvals",
    group: "Livestock",
    lockSector: "livestock",
    label: "Livestock price approvals",
    description: "Pending, approved, and rejected livestock price submissions",
  },
  {
    type: "livestock_price_trend",
    group: "Livestock",
    label: "Livestock price trend",
    description: "Monthly average, min, and max livestock prices in a date range",
  },
  {
    type: "broker_activity",
    group: "Companies & brokers",
    label: "Broker activity",
    description: "How many prices each broker submitted in a date range",
  },
  {
    type: "inactive_registrations",
    group: "Companies & brokers",
    label: "Inactive companies & brokers",
    description: "Pending, rejected, suspended, or inactive companies and brokers",
  },
  {
    type: "all_markets",
    group: "System",
    label: "All markets",
    description: "Water, electricity, and livestock markets currently in the system",
  },
];

export function reportOptionKey(option: {
  type: AdvancedReportType;
  lockUtility?: UtilityKind;
  lockSector?: "livestock" | "water" | "electricity";
}): string {
  return `${option.type}|${option.lockUtility ?? ""}|${option.lockSector ?? ""}`;
}
