export const MMPS_TIME_ZONE = "Africa/Mogadishu";
const MOGADISHU_OFFSET_MS = 3 * 60 * 60 * 1000;

export function formatMmpsStamp(iso: string | null | undefined, lang = "en") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "so" ? "so-SO" : "en-GB", {
    timeZone: MMPS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatMmpsTime(iso: string, lang = "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(lang === "so" ? "so-SO" : "en-GB", {
    timeZone: MMPS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatMmpsDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    timeZone: MMPS_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function mogadishuHour(d = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: MMPS_TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(d);
  const n = Number(hour);
  return Number.isFinite(n) ? n : d.getHours();
}

export function formatMmpsDayLabel(iso: string, lang = "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const loc = lang === "so" ? "so-SO" : "en-GB";
  const today = new Date();
  const yday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const key = (value: Date) =>
    value.toLocaleDateString("en-CA", { timeZone: MMPS_TIME_ZONE });
  if (key(d) === key(today)) return lang === "so" ? "Maanta" : "Today";
  if (key(d) === key(yday)) return lang === "so" ? "Shalay" : "Yesterday";
  return d.toLocaleDateString(loc, {
    timeZone: MMPS_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function naiveTimestampOffsetMs(
  storedIso: string | null | undefined,
  trueInstant: Date
): number {
  if (!storedIso) return 0;
  const stored = new Date(storedIso).getTime();
  if (!Number.isFinite(stored)) return 0;
  const delta = stored - trueInstant.getTime();
  if (delta >= 2.4 * 3_600_000 && delta <= 3.7 * 3_600_000 + 120_000) {
    return MOGADISHU_OFFSET_MS;
  }
  return 0;
}

export function shiftIso(iso: string, offsetMs: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || !offsetMs) return iso;
  return new Date(t - offsetMs).toISOString();
}

/** Calendar day YYYY-MM-DD (Africa/Mogadishu, UTC+3, no DST). */
export function parseIsoDateOnly(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function mogadishuYmd(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: MMPS_TIME_ZONE });
}

export function mogadishuDayStart(ymd: string | null | undefined): Date | null {
  const t = parseIsoDateOnly(ymd);
  if (!t) return null;
  const d = new Date(`${t}T00:00:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mogadishuDayEnd(ymd: string | null | undefined): Date | null {
  const t = parseIsoDateOnly(ymd);
  if (!t) return null;
  const d = new Date(`${t}T23:59:59.999+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function inMogadishuDateRange(
  recorded: string | Date,
  fromYmd: string | null | undefined,
  toYmd: string | null | undefined
): boolean {
  const ymd = mogadishuYmd(recorded);
  if (!ymd) return false;
  const from = parseIsoDateOnly(fromYmd);
  const to = parseIsoDateOnly(toYmd);
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

export function yearOverlapsMogadishuRange(
  year: number,
  fromYmd: string | null | undefined,
  toYmd: string | null | undefined
): boolean {
  if (!Number.isFinite(year)) return false;
  const from = parseIsoDateOnly(fromYmd);
  const to = parseIsoDateOnly(toYmd);
  if (from && year < Number(from.slice(0, 4))) return false;
  if (to && year > Number(to.slice(0, 4))) return false;
  return true;
}

export function yearsOverlappingMogadishu(
  fromYmd: string | null | undefined,
  toYmd: string | null | undefined,
  yearMin: number,
  yearMax: number
): number[] {
  const from = parseIsoDateOnly(fromYmd);
  const to = parseIsoDateOnly(toYmd);
  const startY = from ? Number(from.slice(0, 4)) : yearMin;
  const endY = to ? Number(to.slice(0, 4)) : yearMax;
  const years: number[] = [];
  for (let y = startY; y <= endY; y++) years.push(y);
  return years;
}
