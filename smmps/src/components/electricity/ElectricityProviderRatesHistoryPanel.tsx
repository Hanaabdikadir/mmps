"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  Calendar,
  Info,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { YearlyRateRow } from "@/lib/electricity-analytics";
import { buildFiveYearRateHistory } from "@/lib/electricity-analytics";
import { SYSTEM_NAME } from "@/lib/home-content";
import { cn, formatCurrency } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import {
  ElectricityProviderSignature,
  type ElectricitySignatureVariant,
} from "@/components/electricity/ElectricityProviderSignatures";
import {
  ProviderTariffTiersContent,
  formatTariffChangeCell,
} from "@/components/providers/ProviderTariffTiersCard";
import {
  ELECTRICITY_TIER_HISTORY_COLUMNS,
  buildElectricityTierHistoryRowsFromMap,
  cleanElectricityTierRateMap,
  ELECTRICITY_USAGE_TIERS,
  type ElectricityUsageTier,
  type ElectricityTierRateMap,
} from "@/lib/electricity-data";
import { TARIFF_YEAR_END, TARIFF_YEAR_START } from "@/lib/tariff-years";

export interface ElectricityProviderRatesTheme {
  label: string;
  companyName: string;
  sourceLabel: string;
  headerBg: string;
  cardBorder?: string;
  accentText: string;
  accent: string;
  chartColor: string;
  logoSrc?: string;
  logoAlt?: string;
  ratesNote?: string | null;
  stampLabel: string;
  stampTitle: string;
  stampTagline: string;
  stampColor?: string;
  stampBorderColor?: string;
  signatureVariant: ElectricitySignatureVariant;
}

export interface SerializableFiveYearHistory {
  rows: YearlyRateRow[];
  currentRate: number;
  startRate: number;
  updatedAt: string | null;
  fiveYearChangeUsd: number;
  fiveYearChangePct: number;
  avgAnnualIncreasePct: number;
}

interface ElectricityProviderRatesHistoryPanelProps {
  theme: ElectricityProviderRatesTheme;
  history: SerializableFiveYearHistory;
  yearlyRateHistory?: Partial<Record<number, number>>;
  tierRateHistory?: ElectricityTierRateMap | null;
  usageTiers?: ElectricityUsageTier[];
  /** Free plan: current-year rate row only (no multi-year history stats). */
  currentOnly?: boolean;
  fromYear?: number;
}

function serializeRateHistory(
  history: ReturnType<typeof buildFiveYearRateHistory>,
  refreshedAt = new Date()
): SerializableFiveYearHistory {
  return {
    rows: history.rows,
    currentRate: history.currentRate,
    startRate: history.startRate,
    updatedAt: refreshedAt.toISOString(),
    fiveYearChangeUsd: history.fiveYearChangeUsd,
    fiveYearChangePct: history.fiveYearChangePct,
    avgAnnualIncreasePct: history.avgAnnualIncreasePct,
  };
}

function formatSignedCurrency(amount: number): string {
  const abs = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `-${abs}`;
  return `+${abs}`;
}

/** Prefer saved headline rate; else low (1–1,000) tier for the year. */
function resolveElectricityCurrentPrice(
  currentRate: number,
  tierRateHistory: ElectricityTierRateMap | null | undefined,
  year: number
): number {
  if (Number.isFinite(currentRate) && currentRate > 0) return currentRate;
  const map = cleanElectricityTierRateMap(tierRateHistory ?? {});
  const low = map[year]?.low ?? map[TARIFF_YEAR_END]?.low;
  return Number.isFinite(low) && (low as number) > 0 ? (low as number) : 0;
}

function ElectricityTariffTiersEmbed({
  tierRateHistory,
  currentOnly = false,
  fromYear = TARIFF_YEAR_START,
  className,
}: {
  tierRateHistory?: ElectricityTierRateMap | null;
  yearlyRateHistory?: Partial<Record<number, number>>;
  usageTiers?: ElectricityUsageTier[];
  currentOnly?: boolean;
  fromYear?: number;
  className?: string;
}) {
  const year = TARIFF_YEAR_END;
  const columns = (
    currentOnly
      ? ELECTRICITY_TIER_HISTORY_COLUMNS.filter((col) => col.key !== "change")
      : ELECTRICITY_TIER_HISTORY_COLUMNS
  ).map((col) => ({
    key: col.key,
    labelEn: col.labelEn,
    labelSo: col.labelSo,
  }));
  const rows = currentOnly
    ? (() => {
        const cleaned = cleanElectricityTierRateMap(tierRateHistory ?? {});
        const row = cleaned[year];
        if (!row) return [];
        return [
          {
            year,
            rates: {
              low: row.low,
              mid: row.mid,
              high: row.high,
              change: Number.NaN,
            },
          },
        ];
      })()
    : buildElectricityTierHistoryRowsFromMap(tierRateHistory, fromYear, TARIFF_YEAR_END);

  return (
    <ProviderTariffTiersContent
      className={cn(!currentOnly && "min-h-0 flex-1", className)}
      sector="electricity"
      unitSuffix="/kWh"
      columns={columns}
      rows={rows}
      compact={currentOnly}
      yearHeaderEn={currentOnly ? "Current Price" : undefined}
      yearHeaderSo={currentOnly ? "Qiimaha Hadda" : undefined}
      formatCell={(key, value) => {
        if (key !== "change") return null;
        return formatTariffChangeCell(value);
      }}
    />
  );
}

function ReportIconBadge({
  icon: Icon,
  ringClass,
  iconClass,
}: {
  icon: typeof Zap;
  ringClass: string;
  iconClass: string;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        ringClass
      )}
    >
      <Icon className={cn("h-4 w-4", iconClass)} strokeWidth={2.25} />
    </span>
  );
}

function ReportStatCard({
  icon,
  ringClass,
  iconClass,
  bgClass,
  borderClass,
  label,
  labelClass,
  value,
  valueClass,
  sub,
  accent,
}: {
  icon: typeof Zap;
  ringClass: string;
  iconClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
  labelClass: string;
  value: string;
  valueClass: string;
  sub: string;
  accent?: "primary" | "secondary";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border p-3 text-center shadow-sm rate-stat-card cursor-pointer",
        bgClass,
        borderClass,
        accent === "primary" && "rate-stat-card--primary",
        accent === "secondary" && "rate-stat-card--secondary"
      )}
    >
      <div className="mb-2">
        <ReportIconBadge
          icon={icon}
          ringClass={cn(
            ringClass,
            accent === "secondary" && "rate-stat-card__icon bg-gradient-to-br from-sky-600 to-cyan-500"
          )}
          iconClass={iconClass}
        />
      </div>
      <p className={cn("mb-2 line-clamp-2 min-h-[1.7em] text-[10px] font-bold uppercase leading-tight tracking-widest", labelClass)}>
        {label}
      </p>
      <p className={cn("text-xl font-black leading-none", valueClass)}>{value}</p>
      <p className="mt-1.5 text-[11px] font-medium text-gray-500">{sub}</p>
    </div>
  );
}

function CompanyApprovalStamp({
  logoSrc,
  logoAlt,
  stampLabel = "",
  stampTitle = "",
  stampTagline = "",
  stampColor = "#1d4ed8",
  stampBorderColor = "#1d4ed8",
  size = "md",
}: {
  logoSrc?: string;
  logoAlt?: string;
  stampLabel?: string;
  stampTitle?: string;
  stampTagline?: string;
  stampColor?: string;
  stampBorderColor?: string;
  size?: "md" | "lg";
}) {
  const topArc = "M 18 52 A 32 32 0 1 1 82 52";
  const bottomArc = "M 82 48 A 32 32 0 1 1 18 48";
  const dim = size === "lg" ? "h-[7.5rem] w-[7.5rem]" : "h-[6.5rem] w-[6.5rem]";
  const safeLabel = (stampLabel || stampTitle || "").toUpperCase();
  const safeTagline = (stampTagline || stampTitle || "").toUpperCase();
  const safeTitle = stampTitle || stampLabel || "";

  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center rounded-full border-[2.5px] bg-white",
        dim
      )}
      style={{ borderColor: `${stampBorderColor}cc` }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <defs>
          <path id={`stamp-top-${safeTitle}`} d={topArc} fill="none" />
          <path id={`stamp-bottom-${safeTitle}`} d={bottomArc} fill="none" />
        </defs>
        <text fill={stampColor} fontSize="5.2" fontWeight="700" letterSpacing="0.8">
          <textPath
            href={`#stamp-top-${safeTitle}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {safeLabel}
          </textPath>
        </text>
        <text fill={stampColor} fontSize="4.8" fontWeight="600" letterSpacing="0.6">
          <textPath
            href={`#stamp-bottom-${safeTitle}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {safeTagline}
          </textPath>
        </text>
      </svg>
      <div className="flex max-w-[5rem] flex-col items-center gap-0.5 px-2 text-center">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={logoAlt ?? safeTitle}
            className="h-7 w-auto max-w-full object-contain"
          />
        ) : null}
        <span className="text-[9px] font-black uppercase tracking-wide text-blue-800">
          {safeTitle}
        </span>
      </div>
    </div>
  );
}

function ElectricityRatesReportSheet({
  theme,
  history,
  rows,
  currentRate,
  currentYear,
  startRate,
  updatedLabel,
  approvedDate,
  yearlyRateHistory,
  tierRateHistory,
  usageTiers = ELECTRICITY_USAGE_TIERS,
  currentOnly = false,
  fromYear = TARIFF_YEAR_START,
}: {
  theme: ElectricityProviderRatesTheme;
  history: SerializableFiveYearHistory;
  rows: YearlyRateRow[];
  currentRate: number;
  currentYear: number;
  startRate: number;
  updatedLabel: string;
  approvedDate: string;
  yearlyRateHistory?: Partial<Record<number, number>>;
  tierRateHistory?: ElectricityTierRateMap | null;
  usageTiers?: ElectricityUsageTier[];
  currentOnly?: boolean;
  fromYear?: number;
}) {
  const { t } = useLang();
  const displayRate = resolveElectricityCurrentPrice(
    currentRate,
    tierRateHistory,
    currentYear
  );
  const currentPriceLabel = t("Current Price", "Qiimaha Hadda");
  const currentPriceValue =
    displayRate > 0
      ? `${formatCurrency(displayRate)}/kWh`
      : t("Free", "Bilaash");

  return (
    <div className="electricity-rates-report pointer-events-none fixed top-0 -left-[120vw] z-[-1] flex w-[794px] max-w-full flex-col rounded-2xl border-2 border-emerald-700 bg-white p-5 print:pointer-events-auto print:static print:z-auto print:w-full">
      <header className="flex flex-col items-center gap-2 border-b border-gray-100 pb-4 text-center">
        {theme.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.logoSrc}
            alt={theme.logoAlt ?? theme.label}
            className="h-14 w-auto max-w-[260px] object-contain"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-black text-gray-900">
            {t("Electricity", "Korontada")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {theme.label}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-800">
          <Calendar className="h-3.5 w-3.5 text-emerald-700" />
          {t("Last Updated (This Card):", "Ugu Dambeyn La Cusboonaysiiyay (Kaarkan):")} {updatedLabel}
        </span>
      </header>

      <div className={cn("mt-4 grid gap-2", currentOnly ? "grid-cols-1" : "grid-cols-4")}>
        <ReportStatCard
          icon={Zap}
          ringClass="bg-emerald-600"
          iconClass="text-white"
          bgClass="bg-emerald-50"
          borderClass="border-emerald-300"
          label={currentPriceLabel}
          labelClass="text-emerald-700"
          value={currentPriceValue}
          valueClass="text-emerald-800"
          sub={`${t("Year", "Sanadka")} ${currentYear}`}
          accent="primary"
        />
        {!currentOnly ? (
          <>
            <ReportStatCard
              icon={TrendingUp}
              ringClass="bg-sky-600"
              iconClass="text-white"
              bgClass="bg-sky-50"
              borderClass="border-sky-300"
              label={t("Rate Change", "Isbeddelka Qiimaha")}
              labelClass="text-cyan-700"
              value={formatSignedCurrency(history.fiveYearChangeUsd)}
              valueClass="text-cyan-800"
              sub={`${formatCurrency(startRate)} → ${formatCurrency(displayRate)}`}
              accent="secondary"
            />
            <ReportStatCard
              icon={BarChart3}
              ringClass="bg-orange-500"
              iconClass="text-white"
              bgClass="bg-orange-50"
              borderClass="border-orange-300"
              label={t("Total Increase", "Koror Guud")}
              labelClass="text-orange-700"
              value={`${history.fiveYearChangePct.toFixed(2)}%`}
              valueClass="text-orange-800"
              sub={t("Across rate history", "Guud ahaan taariikhda qiimaha")}
            />
            <ReportStatCard
              icon={Calendar}
              ringClass="bg-violet-600"
              iconClass="text-white"
              bgClass="bg-violet-50"
              borderClass="border-violet-300"
              label={t("Avg Annual Increase", "Kororka Sanadlaha ah")}
              labelClass="text-violet-700"
              value={`${history.avgAnnualIncreasePct.toFixed(2)}%`}
              valueClass="text-violet-800"
              sub={t("Per Year", "Sanad kasta")}
            />
          </>
        ) : null}
      </div>

      <div className="mt-4">
        <ElectricityTariffTiersEmbed
          tierRateHistory={tierRateHistory}
          yearlyRateHistory={yearlyRateHistory}
          usageTiers={usageTiers}
          currentOnly={currentOnly}
          fromYear={fromYear}
        />
      </div>

      {theme.ratesNote ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p>
            <span className="font-bold">{t("Note:", "Ogeysiis:")}</span> {theme.ratesNote}
          </p>
        </div>
      ) : null}

      <footer className="mt-4 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-3">
          <div className="text-left">
            <p className="text-[11px] font-bold text-gray-800">{t("Generated by:", "Waxaa sameeyay:")}</p>
            <p className="text-[11px] font-bold text-gray-900">
              {SYSTEM_NAME}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              {t("Reliable Data for Better Decisions.", "Xog La Isku Hallayn Karo Go'aan Wanaagsan.")}
            </p>
          </div>

          <div className="h-20 w-px bg-gray-200" aria-hidden />

          <div className="flex justify-center">
            <CompanyApprovalStamp
              logoSrc={theme.logoSrc}
              logoAlt={theme.logoAlt}
              stampLabel={theme.stampLabel}
              stampTitle={theme.stampTitle}
              stampTagline={theme.stampTagline}
              stampColor={theme.stampColor}
              stampBorderColor={theme.stampBorderColor}
              size="lg"
            />
          </div>

          <div className="h-20 w-px bg-gray-200" aria-hidden />

          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-800">
              {t("Verified & Approved by:", "Waxaa xaqiijiyay & ansixiyay:")}
            </p>
            <div className="mt-1 flex justify-end">
              <ElectricityProviderSignature variant={theme.signatureVariant} />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">
              {t("Date:", "Taariikhda:")} {approvedDate}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CompactStatCard({
  icon: Icon,
  iconBgClass,
  bgClass,
  borderClass,
  label,
  labelClass,
  value,
  valueClass,
  sub,
  accent,
  roomy = false,
}: {
  icon: typeof Zap;
  iconBgClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
  labelClass: string;
  value: string;
  valueClass: string;
  sub: string;
  accent?: "primary" | "secondary";
  /** Slightly larger padding/type — free-plan current price card. */
  roomy?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center rounded-lg border text-center shadow-sm rate-stat-card cursor-pointer",
        roomy ? "px-2 py-2" : "px-1.5 py-[5px]",
        bgClass,
        borderClass,
        accent === "primary" && "rate-stat-card--primary",
        accent === "secondary" && "rate-stat-card--secondary"
      )}
    >
      <span
        className={cn(
          "rate-stat-card__icon mb-0.5 flex items-center justify-center rounded-md text-white shadow-sm",
          roomy ? "h-6 w-6" : "h-5 w-5",
          iconBgClass
        )}
      >
        <Icon className={roomy ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2.5} />
      </span>
      <p
        className={cn(
          "mb-0.5 line-clamp-1 w-full px-0.5 font-bold uppercase leading-tight tracking-wide",
          roomy ? "text-[8px] sm:text-[9px]" : "text-[7px] sm:text-[8px]",
          labelClass
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "w-full font-black leading-none",
          roomy ? "text-[14px] sm:text-[15px]" : "text-[12px] sm:text-[13px]",
          valueClass
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-0.5 w-full font-medium leading-none text-gray-500",
          roomy ? "text-[9px]" : "text-[8px]"
        )}
      >
        {sub}
      </p>
    </div>
  );
}

export function ElectricityProviderRatesHistoryPanel({
  theme,
  history,
  yearlyRateHistory,
  tierRateHistory,
  usageTiers = ELECTRICITY_USAGE_TIERS,
  currentOnly = false,
  fromYear = TARIFF_YEAR_START,
}: ElectricityProviderRatesHistoryPanelProps) {
  const { t } = useLang();

  const { rows, currentRate, startRate, updatedAt } = history;
  const currentYear =
    rows.filter((r) => r.rate > 0).at(-1)?.year ??
    rows[rows.length - 1]?.year ??
    TARIFF_YEAR_END;
  const displayRate = resolveElectricityCurrentPrice(
    currentRate,
    tierRateHistory,
    currentYear
  );
  const currentPriceLabel = t("Current Price", "Qiimaha Hadda");
  const currentPriceValue =
    displayRate > 0
      ? `${formatCurrency(displayRate)}/kWh`
      : t("Free", "Bilaash");
  const resolvedStartRate =
    startRate > 0 ? startRate : rows.find((r) => r.rate > 0)?.rate ?? displayRate;

  // Avoid hydration mismatch: never call new Date() during SSR for "now" labels.
  const [liveStamp, setLiveStamp] = useState<{
    updated: string;
    approved: string;
  } | null>(null);
  useEffect(() => {
    if (updatedAt) return;
    const now = new Date();
    setLiveStamp({
      updated: format(now, "d MMM yyyy, HH:mm"),
      approved: format(now, "dd MMM yyyy"),
    });
  }, [updatedAt]);

  const updatedLabel = updatedAt
    ? format(new Date(updatedAt), "d MMM yyyy, HH:mm")
    : liveStamp?.updated ?? "—";

  const approvedDate = updatedAt
    ? format(new Date(updatedAt), "dd MMM yyyy")
    : liveStamp?.approved ?? "—";

  return (
    <div
      id="electricity-rates-history"
      className="electricity-rates-print-root flex h-full w-full flex-col"
    >
      <ElectricityRatesReportSheet
        theme={theme}
        history={history}
        rows={rows}
        currentRate={currentRate}
        currentYear={currentYear}
        startRate={resolvedStartRate}
        updatedLabel={updatedLabel}
        approvedDate={approvedDate}
        yearlyRateHistory={yearlyRateHistory}
        tierRateHistory={tierRateHistory}
        usageTiers={usageTiers}
        currentOnly={currentOnly}
        fromYear={fromYear}
      />

      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md print:hidden",
          theme.cardBorder ?? "border-emerald-200/70"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 border-b border-white/10 px-5 py-2",
            theme.headerBg
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 p-[2px] shadow-sm shadow-orange-900/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white/95">
              <Zap className="h-4 w-4 text-orange-600" strokeWidth={2.5} />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black leading-tight text-white">
              {currentOnly
                ? currentPriceLabel
                : t("Electricity", "Korontada")}
            </h2>
            <p className="text-[10px] text-white/80">
              {theme.label}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
          <div
            className={cn(
              "grid shrink-0 gap-2",
              currentOnly ? "grid-cols-1" : "grid-cols-4"
            )}
          >
            <CompactStatCard
              icon={Zap}
              iconBgClass="bg-emerald-600"
              bgClass="bg-emerald-50"
              borderClass="border-emerald-300"
              label={currentPriceLabel}
              labelClass="text-emerald-700"
              value={currentPriceValue}
              valueClass="text-emerald-800"
              sub={`${t("Year", "Sanadka")} ${currentYear}`}
              accent="primary"
              roomy={currentOnly}
            />
            {!currentOnly ? (
              <>
                <CompactStatCard
                  icon={TrendingUp}
                  iconBgClass="bg-gradient-to-br from-sky-600 to-cyan-500"
                  bgClass="bg-sky-50"
                  borderClass="border-cyan-300"
                  label={t("Rate Change", "Isbeddelka Qiimaha")}
                  labelClass="text-cyan-700"
                  value={formatSignedCurrency(history.fiveYearChangeUsd)}
                  valueClass="text-cyan-800"
                  sub={`${formatCurrency(resolvedStartRate)} → ${formatCurrency(displayRate)}`}
                  accent="secondary"
                />
                <CompactStatCard
                  icon={BarChart3}
                  iconBgClass="bg-orange-500"
                  bgClass="bg-orange-50"
                  borderClass="border-orange-300"
                  label={t("Total Increase", "Koror Guud")}
                  labelClass="text-orange-700"
                  value={`${history.fiveYearChangePct.toFixed(2)}%`}
                  valueClass="text-orange-800"
                  sub={t("Across rate history", "Guud ahaan taariikhda qiimaha")}
                />
                <CompactStatCard
                  icon={Calendar}
                  iconBgClass="bg-violet-600"
                  bgClass="bg-violet-50"
                  borderClass="border-violet-300"
                  label={t("Avg Annual Increase", "Kororka Sanadlaha ah")}
                  labelClass="text-violet-700"
                  value={`${history.avgAnnualIncreasePct.toFixed(2)}%`}
                  valueClass="text-violet-800"
                  sub={t("Per Year", "Sanad kasta")}
                />
              </>
            ) : null}
          </div>

          <ElectricityTariffTiersEmbed
            className={currentOnly ? "shrink-0" : "min-h-0 flex-1"}
            tierRateHistory={tierRateHistory}
            yearlyRateHistory={yearlyRateHistory}
            usageTiers={usageTiers}
            currentOnly={currentOnly}
            fromYear={fromYear}
          />
        </div>
      </div>
    </div>
  );
}
