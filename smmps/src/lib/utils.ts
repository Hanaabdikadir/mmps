export function formatCurrency(amount: number | string, currency = "USD"): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** USD/kWh rate — always 2 decimal places (e.g. 0.35, not 0.350) */
export function formatRatePerKwh(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return Number(value).toFixed(2);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatLabel(value: string): string {
  if (value === "SERVICE_PROVIDER") return "Professionals";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
