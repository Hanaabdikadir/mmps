"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Search,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DateInput } from "@/components/ui/DateInput";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { MMPS_SUPPORT_EMAIL, MMPS_PLATFORM_DOMAIN } from "@/lib/home-content";
import { authPortalHeaders } from "@/lib/auth-portal";
import {
  ADVANCED_REPORT_GROUPS,
  ADVANCED_REPORT_OPTIONS,
  reportOptionKey,
  REPORT_DATE_MAX,
  REPORT_DATE_MIN,
  validateReportDateRange,
  type AdvancedReportResult,
  type AdvancedReportType,
  type MarketOption,
  type PriceCompareOp,
  type RateSort,
  type RegisteredKind,
  type LivestockSeason,
  type UtilityKind,
} from "@/lib/super-admin-advanced-reports-shared";

const inputClass =
  "h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
const fieldClass = "block min-w-0 w-full";
const labelClass = "mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500";
const btnClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50";

function marketOptionLabel(m: MarketOption) {
  if (m.label && m.label !== m.name) return m.label;
  return (
    m.name
      .replace(/\s+Livestock\s+Market$/i, "")
      .replace(/\s+livestock\s+market$/i, "")
      .trim() || m.name
  );
}
type LivestockTypeOption = {
  id: number;
  label: string;
  categoryLabel: string;
};

function requiresDates(type: AdvancedReportType) {
  return (
    type === "livestock_type_market" ||
    type === "hal_camel_market" ||
    type === "utility_highest_rate" ||
    type === "registered_in_year" ||
    type === "compare_two_markets" ||
    type === "compare_two_companies" ||
    type === "livestock_price_trend" ||
    type === "price_approvals" ||
    type === "broker_activity"
  );
}
function needsDates(type: AdvancedReportType) {
  return (
    requiresDates(type) ||
    type === "all_utility_prices" ||
    type === "livestock_price_range" ||
    type === "all_subscriptions"
  );
}
function usesMarketFilter(type: AdvancedReportType) {
  return (
    type === "livestock_type_market" ||
    type === "hal_camel_market" ||
    type === "broker_market_goats" ||
    type === "livestock_price_trend" ||
    type === "broker_activity" ||
    type === "livestock_price_range"
  );
}
function needsLivestockType(type: AdvancedReportType) {
  return (
    type === "livestock_type_market" ||
    type === "hal_camel_market" ||
    type === "broker_market_goats" ||
    type === "compare_two_markets" ||
    type === "livestock_price_trend" ||
    type === "livestock_price_range"
  );
}
function needsCompany(type: AdvancedReportType) {
  return type === "utility_highest_rate";
}
function needsPriceRange(type: AdvancedReportType) {
  return type === "livestock_price_range";
}
function needsUtilityKind(type: AdvancedReportType) {
  return (
    type === "companies_by_rate" ||
    type === "utility_highest_rate" ||
    type === "compare_two_companies" ||
    type === "all_utility_prices" ||
    type === "company_info_documents"
  );
}
function needsRateSort(type: AdvancedReportType) {
  return type === "companies_by_rate";
}
function needsYear(type: AdvancedReportType) {
  return (
    type === "registered_in_year" ||
    type === "inactive_registrations" ||
    type === "all_subscriptions"
  );
}
function needsCompareMarkets(type: AdvancedReportType) {
  return type === "compare_two_markets";
}
function needsLivestockClass(type: AdvancedReportType) {
  return type === "compare_two_markets" || type === "livestock_type_market";
}
function needsAge(type: AdvancedReportType) {
  return type === "livestock_type_market";
}
function needsCompareCompanies(type: AdvancedReportType) {
  return type === "compare_two_companies";
}
function needsApprovalStatus(type: AdvancedReportType) {
  return type === "price_approvals";
}
function needsApprovalSector(type: AdvancedReportType) {
  return type === "price_approvals";
}
function isAutoFetchReport(type: AdvancedReportType) {
  return (
    !requiresDates(type) &&
    !needsCompareMarkets(type) &&
    !needsCompareCompanies(type)
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadMmpsLogoJpeg(): Promise<string | null> {
  try {
    const res = await fetch(SYSTEM_LOGO_SRC);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

async function buildPdf(report: AdvancedReportResult, createdBy: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const headerH = 108;
  const footerH = 78;
  const printedDate = new Date(report.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const createdAt = new Date(report.generatedAt).toLocaleString();
  const logoData = await loadMmpsLogoJpeg();

  const drawChrome = (pageNumber: number, totalPages: number) => {
    const showHeader = pageNumber === 1;
    if (showHeader) {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, headerH, "F");
      const centerX = pageWidth / 2;
      let titleY = 30;
      if (pageNumber === 1 && logoData) {
        try {
          const lw = 34;
          doc.addImage(logoData, "JPEG", centerX - lw / 2, 10, lw, lw);
          titleY = 56;
        } catch {
          /* skip broken logo */
        }
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(report.systemName, centerX, titleY, { align: "center" });
      const displayTitle = (report.title || "")
        .replace(/\s*[—–-]+\s*[—–-]+\s*$/g, "")
        .replace(/\s*[—–-]+\s*$/g, "")
        .trim();
      doc.setFontSize(12);
      doc.text(displayTitle, centerX, titleY + 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Created at: ${createdAt}`, margin, headerH - 14);
      doc.text(`Created by: ${createdBy}`, pageWidth - margin, headerH - 14, {
        align: "right",
      });

      doc.setDrawColor(6, 95, 70);
      doc.setLineWidth(1.6);
      doc.line(margin, headerH - 5, pageWidth - margin, headerH - 5);
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - footerH, pageWidth, footerH, "F");

    if (pageNumber === totalPages) {
      const fy = pageHeight - footerH;
      const colW = (pageWidth - margin * 2) / 3;
      const leftX = margin;
      const rightX = margin + colW * 2;
      const lineY = fy + 22;
      const lineLen = colW - 20;

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.7);
      doc.line(leftX, lineY, leftX + lineLen, lineY);
      doc.line(rightX, lineY, rightX + lineLen, lineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Reported By: Super Admin", leftX, lineY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${printedDate}`, leftX, lineY + 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(report.systemName, pageWidth / 2, lineY + 14, {
        align: "center",
        maxWidth: colW - 12,
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Banadir, Mogadishu · ${MMPS_PLATFORM_DOMAIN}`,
        pageWidth / 2,
        lineY + 26,
        { align: "center", maxWidth: colW - 12 }
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Authorized Signature & Stamp", rightX, lineY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Super Admin", rightX, lineY + 26);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 12, {
      align: "right",
    });
  };

  const columns = [...report.columns];
  if (!columns.some((c) => c.key === "status") && report.rows.some((r) => r.status != null)) {
    const afterPrice = columns.findIndex((c) => c.key === "price");
    columns.splice(afterPrice >= 0 ? afterPrice + 1 : 0, 0, {
      key: "status",
      label: "Status",
    });
  }

  const head = [columns.map((c) => c.label)];
  const body = report.rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      if (c.key === "status") return v == null || v === "" ? "—" : String(v).toUpperCase();
      return v == null ? "—" : String(v);
    })
  );

  const statusCol = columns.findIndex((c) => c.key === "status");
  const columnStyles: Record<number, { cellWidth?: number; fontStyle?: "bold"; halign?: "center" }> =
    {};
  if (statusCol >= 0 && columns.length <= 6) {
    columnStyles[statusCol] = {
      fontStyle: "bold",
      halign: "center",
    };
  }

  autoTable(doc, {
    head,
    body: body.length ? body : [columns.map((c) => (c.key === "status" ? "—" : "No records found"))],
    startY: headerH + 14,
    margin: { top: margin, left: margin, right: margin, bottom: footerH + 8 },
    tableWidth: pageWidth - margin * 2,
    styles: {
      fontSize: 8,
      cellPadding: 4.2,
      overflow: "linebreak",
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
      valign: "middle",
    },
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    columnStyles,
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      drawChrome(data.pageNumber, doc.getNumberOfPages());
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawChrome(i, totalPages);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`mmps-${report.reportType}-${stamp}.pdf`);
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export function SuperAdminAdvancedReportsPanel() {
  const { t, lc } = useLang();
  const F = TRANSLATIONS.filters;
  const [reportType, setReportType] =
    useState<AdvancedReportType>("livestock_type_market");
  const [optionKey, setOptionKey] = useState(
    reportOptionKey({ type: "livestock_type_market" })
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [marketName, setMarketName] = useState("");
  const [marketNameB, setMarketNameB] = useState("");
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [livestockTypes, setLivestockTypes] = useState<LivestockTypeOption[]>([]);
  const [livestockTypesLoading, setLivestockTypesLoading] = useState(true);
  const [livestockTypeId, setLivestockTypeId] = useState("all");
  const [companyName, setCompanyName] = useState("all");
  const [companyNameB, setCompanyNameB] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<
    "all" | "PENDING" | "APPROVED" | "REJECTED"
  >("all");
  const [approvalSector, setApprovalSector] = useState<
    "all" | "livestock" | "water" | "electricity"
  >("all");
  const [utilityCompanies, setUtilityCompanies] = useState<{
    water: string[];
    electricity: string[];
  }>({ water: [], electricity: [] });
  const [utilityKind, setUtilityKind] = useState<UtilityKind | "all">("water");
  const [priceOp, setPriceOp] = useState<PriceCompareOp>("between");
  const [livestockPriceOp, setLivestockPriceOp] = useState<"all" | PriceCompareOp>("all");
  const [priceMin, setPriceMin] = useState("200");
  const [priceMax, setPriceMax] = useState("500");
  const [rateSort, setRateSort] = useState<RateSort>("cheap");
  const [registeredKind, setRegisteredKind] = useState<RegisteredKind>("both");
  const [livestockSeason, setLivestockSeason] = useState<"all" | LivestockSeason>("all");
  const [ageFrom, setAgeFrom] = useState("");
  const [ageTo, setAgeTo] = useState("");
  const [originPlace, setOriginPlace] = useState("");
  const [livestockCategory, setLivestockCategory] = useState("all");
  const [report, setReport] = useState<AdvancedReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/super-admin/advanced-reports", { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        const water = Array.isArray(data?.utilityCompanies?.water)
          ? data.utilityCompanies.water.map((n: string) => String(n))
          : [];
        const electricity = Array.isArray(data?.utilityCompanies?.electricity)
          ? data.utilityCompanies.electricity.map((n: string) => String(n))
          : [];
        setUtilityCompanies({ water, electricity });

        const typeOpts: LivestockTypeOption[] = Array.isArray(data?.livestockTypes)
          ? data.livestockTypes
            .map(
              (t: {
                id?: number;
                label?: string;
                categoryLabel?: string;
              }) => ({
                id: Number(t.id),
                label: String(t.label || "").trim(),
                categoryLabel: String(t.categoryLabel || "—"),
              })
            )
            .filter((t: LivestockTypeOption) => t.id && t.label)
          : [];
        typeOpts.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        );
        setLivestockTypes(typeOpts);
        setLivestockTypeId((prev) => {
          if (prev === "all") return "all";
          if (prev && typeOpts.some((o) => String(o.id) === prev)) return prev;
          return "all";
        });

        const marketOpts: MarketOption[] = Array.isArray(data?.livestockMarkets)
          ? data.livestockMarkets
            .map(
              (m: {
                id: number;
                name: string;
                location?: string | null;
                label?: string;
              }) => ({
                id: Number(m.id),
                name: String(m.name || "").trim(),
                location: m.location ?? null,
                label: String(m.label || m.name || "").trim(),
              })
            )
            .filter((m: MarketOption) => m.id && m.name)
          : [];
        setMarkets(marketOpts);
        setMarketName((prev) => {
          if (!prev) return "";
          if (marketOpts.some((m) => m.name === prev)) return prev;
          return "";
        });
        setMarketNameB((prev) => {
          if (!prev) return "";
          if (marketOpts.some((m) => m.name === prev)) return prev;
          return "";
        });
      })
      .catch(() => {
        if (cancelled) return;
        setUtilityCompanies({ water: [], electricity: [] });
        setLivestockTypes([]);
        setMarkets([]);
      })
      .finally(() => {
        if (cancelled) return;
        setMarketsLoading(false);
        setLivestockTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportType]);

  const companyOptions = useMemo(
    () =>
      utilityKind === "electricity"
        ? utilityCompanies.electricity
        : utilityCompanies.water,
    [utilityKind, utilityCompanies]
  );

  const safeCompanyName =
    companyName === "all" || companyOptions.includes(companyName)
      ? companyName
      : "all";
  const safeCompanyNameB =
    !companyNameB || companyOptions.includes(companyNameB)
      ? companyNameB
      : "";

  const selectedMeta = useMemo(
    () =>
      ADVANCED_REPORT_OPTIONS.find((o) => reportOptionKey(o) === optionKey) ??
      ADVANCED_REPORT_OPTIONS.find((o) => o.type === reportType),
    [optionKey, reportType]
  );

  const filterNeedle = searchQuery.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    if (!report) return [];
    if (!filterNeedle) return report.rows;
    return report.rows.filter((row) =>
      report.columns.some((c) =>
        String(row[c.key] ?? "")
          .toLowerCase()
          .includes(filterNeedle)
      )
    );
  }, [report, filterNeedle]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const showingFrom = visibleRows.length === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const showingTo = Math.min(visibleRows.length, currentPage * perPage);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return visibleRows.slice(start, start + perPage);
  }, [visibleRows, currentPage, perPage]);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  function buildPayload(
    format: "json" | "csv" = "json",
    overrideType?: AdvancedReportType,
    overrides?: {
      utilityKind?: UtilityKind;
      sector?: "livestock" | "water" | "electricity";
      registeredKind?: RegisteredKind;
    }
  ) {
    const activeType = overrideType || reportType;
    const activeUtility = overrides?.utilityKind ?? utilityKind;
    const activeSector = overrides?.sector ?? approvalSector;
    const activeKind = overrides?.registeredKind ?? registeredKind;
    return {
      reportType: activeType,
      format,
      dateFrom: needsDates(activeType) ? dateFrom : null,
      dateTo: needsDates(activeType) ? dateTo : null,
      marketName:
        usesMarketFilter(activeType) || needsCompareMarkets(activeType)
          ? marketName.trim() || null
          : null,
      marketNameB: needsCompareMarkets(activeType)
        ? marketNameB.trim() || null
        : null,
      livestockTypeId: needsLivestockType(activeType)
        ? livestockTypeId === "all"
          ? null
          : Number(livestockTypeId) || null
        : null,
      companyName: needsCompany(activeType)
        ? safeCompanyName && safeCompanyName !== "all"
          ? safeCompanyName
          : null
        : needsCompareCompanies(activeType)
          ? safeCompanyName.trim() && safeCompanyName !== "all"
            ? safeCompanyName
            : null
          : null,
      companyNameB: needsCompareCompanies(activeType)
        ? safeCompanyNameB.trim() || null
        : null,
      utilityKind:
        needsUtilityKind(activeType) && activeUtility !== "all"
          ? activeUtility
          : null,
      priceOp:
        activeType === "livestock_type_market"
          ? livestockPriceOp === "all"
            ? null
            : livestockPriceOp
          : needsPriceRange(activeType)
            ? priceOp
            : null,
      priceMin:
        activeType === "livestock_type_market"
          ? livestockPriceOp !== "all" && priceMin.trim() !== ""
            ? Number(priceMin)
            : null
          : needsPriceRange(activeType) && priceMin.trim() !== ""
            ? Number(priceMin)
            : null,
      priceMax:
        activeType === "livestock_type_market"
          ? livestockPriceOp === "between" && priceMax.trim() !== ""
            ? Number(priceMax)
            : null
          : needsPriceRange(activeType) && priceOp === "between" && priceMax.trim() !== ""
            ? Number(priceMax)
            : null,
      rateSort: needsRateSort(activeType) ? rateSort : null,
      year: null,
      monthFrom: null,
      monthTo: null,
      registeredKind: needsYear(activeType) ? activeKind : null,
      livestockSeason: needsLivestockClass(activeType)
        ? livestockSeason === "birimo" || livestockSeason === "sugunto"
          ? livestockSeason
          : null
        : null,
      ageClass: null,
      ageMin:
        needsAge(activeType) && ageFrom.trim() !== "" ? Number(ageFrom) : null,
      ageMax:
        needsAge(activeType) && ageTo.trim() !== "" ? Number(ageTo) : null,
      originPlace:
        needsAge(activeType) && originPlace.trim() !== ""
          ? originPlace.trim()
          : null,
      livestockCategory:
        activeType === "all_categories" && livestockCategory !== "all"
          ? livestockCategory
          : null,
      approvalStatus:
        needsApprovalStatus(activeType) && approvalStatus !== "all"
          ? approvalStatus
          : null,
      sector:
        needsApprovalSector(activeType) && activeSector !== "all"
          ? activeSector
          : null,
    };
  }

  function executeReport(
    overrideType?: AdvancedReportType,
    overrides?: {
      utilityKind?: UtilityKind;
      sector?: "livestock" | "water" | "electricity";
      registeredKind?: RegisteredKind;
    }
  ) {
    const activeType = overrideType || reportType;
    if (
      needsLivestockType(activeType) &&
      livestockTypeId !== "all" &&
      !Number(livestockTypeId)
    ) {
      setError("Please select a livestock type.");
      return;
    }
    if (requiresDates(activeType)) {
      if (!dateFrom.trim() || !dateTo.trim()) {
        setError("Please enter both From date and To date.");
        return;
      }
      const dateError = validateReportDateRange(dateFrom, dateTo);
      if (dateError) {
        setError(dateError);
        return;
      }
    } else if (dateFrom.trim() || dateTo.trim()) {
      const dateError = validateReportDateRange(dateFrom, dateTo);
      if (dateError) {
        setError(dateError);
        return;
      }
    }
    if (needsCompareMarkets(activeType)) {
      if (!marketName.trim() || !marketNameB.trim()) {
        setError("Please select two markets to compare.");
        return;
      }
      if (marketName.trim().toLowerCase() === marketNameB.trim().toLowerCase()) {
        setError("Please select two different markets.");
        return;
      }
    }
    if (needsCompareCompanies(activeType)) {
      if (!companyName.trim() || companyName === "all" || !companyNameB.trim()) {
        setError("Please select two companies to compare.");
        return;
      }
      if (companyName.trim().toLowerCase() === companyNameB.trim().toLowerCase()) {
        setError("Please select two different companies.");
        return;
      }
    }
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/super-admin/advanced-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload("json", activeType, overrides)),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        setReport(data.report as AdvancedReportResult);
        setPage(1);
      } catch (e) {
        setReport(null);
        setError(e instanceof Error ? e.message : "Failed to load report");
      }
    });
  }

  function searchReport() {
    executeReport();
  }


  async function exportExcel() {
    if (!report || report.rows.length === 0) {
      setError("Search the report first, then export Excel.");
      return;
    }
    setError(null);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Super Admin";
      workbook.created = new Date();

      const safeSheetName = (report.title || "Report")
        .slice(0, 31)
        .replace(/[:\\/?*\[\]]/g, "-");
      const sheet = workbook.addWorksheet(safeSheetName, {
        views: [{ state: "frozen", ySplit: 4 }],
      });

      const columns = report.columns;
      const colCount = Math.max(columns.length, 1);

      sheet.columns = columns.map((col) => {
        const maxLen = Math.max(
          col.label.length,
          ...report.rows.map((r) => String(r[col.key] ?? "").length)
        );
        return {
          key: col.key,
          width: Math.min(Math.max(maxLen + 4, 12), 42),
        };
      });

      const titleText = `${report.systemName} — ${report.title}`;
      sheet.addRow([titleText]);
      sheet.mergeCells(1, 1, 1, colCount);
      sheet.getRow(1).height = 28;
      sheet.getCell(1, 1).font = {
        name: "Calibri",
        size: 14,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      sheet.getCell(1, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF065F46" },
      };
      sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };

      const metaText = `${report.subtitle} | Generated: ${new Date(report.generatedAt).toLocaleString()} | ${report.summary || ""}`;
      sheet.addRow([metaText]);
      sheet.mergeCells(2, 1, 2, colCount);
      sheet.getRow(2).height = 20;
      sheet.getCell(2, 1).font = {
        name: "Calibri",
        size: 10,
        italic: true,
        color: { argb: "FF475569" },
      };
      sheet.getCell(2, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      sheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left" };

      sheet.addRow([]);
      sheet.getRow(3).height = 8;

      const headerRow = sheet.addRow(columns.map((c) => c.label));
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF047857" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF065F46" } },
          bottom: { style: "thin", color: { argb: "FF065F46" } },
          left: { style: "thin", color: { argb: "FF065F46" } },
          right: { style: "thin", color: { argb: "FF065F46" } },
        };
      });

      report.rows.forEach((row, idx) => {
        const dataRow = sheet.addRow(
          columns.map((c) => {
            const val = row[c.key];
            return val == null ? "—" : val;
          })
        );
        dataRow.height = 20;
        const isEven = idx % 2 === 0;
        dataRow.eachCell((cell) => {
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (!isEven) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `mmps-${report.reportType}-${stamp}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel export failed");
    }
  }

  function handlePrint() {
    if (!report || report.rows.length === 0) {
      setError("Search the report first, then click Print.");
      return;
    }
    window.print();
  }

  async function exportPdf() {
    if (!report) {
      setError("Search the report first, then export PDF.");
      return;
    }
    try {
      let createdBy = "Super Admin";
      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          headers: authPortalHeaders("super"),
        });
        const meData = await meRes.json().catch(() => ({}));
        const name = String(meData?.user?.fullName || "").trim();
        if (name) createdBy = name;
      } catch {
        /* keep Super Admin */
      }
      await buildPdf(report, createdBy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm print:hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-5">
          <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            System Reports
          </h2>
          <span className="mt-2 block h-1 w-12 rounded-full bg-emerald-600" aria-hidden />
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            {ADVANCED_REPORT_GROUPS.map((group) => {
              const active = (selectedMeta?.group ?? "Livestock") === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => {
                    const next = ADVANCED_REPORT_OPTIONS.find((o) => o.group === group);
                    if (!next) return;
                    setOptionKey(reportOptionKey(next));
                    setReportType(next.type);
                    setError(null);
                    if (next.lockUtility) {
                      setUtilityKind(next.lockUtility);
                      setCompanyName("all");
                      setCompanyNameB("");
                    }
                    if (next.lockSector) setApprovalSector(next.lockSector);
                    if (isAutoFetchReport(next.type)) {
                      executeReport(next.type, {
                        utilityKind: next.lockUtility,
                        sector: next.lockSector,
                      });
                    } else {
                      setReport(null);
                    }
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-black transition",
                    active
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  {group}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={labelClass}>Report</span>
              <select
                className={inputClass}
                value={optionKey}
                onChange={(e) => {
                  const next = ADVANCED_REPORT_OPTIONS.find(
                    (o) => reportOptionKey(o) === e.target.value
                  );
                  if (!next) return;
                  setOptionKey(reportOptionKey(next));
                  setReportType(next.type);
                  setError(null);
                  if (next.lockUtility) {
                    setUtilityKind(next.lockUtility);
                    setCompanyName("all");
                    setCompanyNameB("");
                  } else if (next.type !== "company_info_documents") {
                    setUtilityKind((k) => (k === "all" ? "water" : k));
                  }
                  if (next.lockSector) setApprovalSector(next.lockSector);
                  if (next.type === "company_info_documents") {
                    setUtilityKind("all");
                  }
                  if (isAutoFetchReport(next.type)) {
                    executeReport(next.type, {
                      utilityKind: next.lockUtility,
                      sector: next.lockSector,
                    });
                  } else {
                    setReport(null);
                  }
                }}
              >
                {ADVANCED_REPORT_OPTIONS.filter(
                  (o) => o.group === (selectedMeta?.group ?? "Livestock")
                ).map((o) => (
                  <option key={reportOptionKey(o)} value={reportOptionKey(o)}>
                    {o.label}
                  </option>
                ))}
              </select>
              {selectedMeta ? (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  {selectedMeta.description}
                </p>
              ) : null}
            </label>
            <label className="block min-w-0">
              <span className={labelClass}>Search</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className={cn(inputClass, "pl-9")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reports or results…"
                  aria-label="Search reports or results"
                />
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {needsDates(reportType) ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>{t(F.fromDate.en, F.fromDate.so)}</span>
                  <DateInput
                    className={inputClass}
                    min={REPORT_DATE_MIN}
                    max={REPORT_DATE_MAX}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>{t(F.toDate.en, F.toDate.so)}</span>
                  <DateInput
                    className={inputClass}
                    min={REPORT_DATE_MIN}
                    max={REPORT_DATE_MAX}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </>
            ) : null}

            {needsLivestockType(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Livestock type</span>
                <select
                  className={inputClass}
                  value={livestockTypeId}
                  disabled={livestockTypesLoading}
                  onChange={(e) => setLivestockTypeId(e.target.value)}
                >
                  <option value="all">All</option>
                  {livestockTypes.length === 0 && !livestockTypesLoading ? (
                    <option value="" disabled>
                      No livestock types found
                    </option>
                  ) : null}
                  {livestockTypes.map((lt) => (
                    <option key={lt.id} value={String(lt.id)}>
                      {lt.label}
                      {lt.categoryLabel ? ` (${lt.categoryLabel})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {needsLivestockClass(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Type (First / Second Class)</span>
                <select
                  className={inputClass}
                  value={livestockSeason}
                  onChange={(e) =>
                    setLivestockSeason(e.target.value as "all" | LivestockSeason)
                  }
                >
                  <option value="all">All</option>
                  <option value="birimo">First Class</option>
                  <option value="sugunto">Second Class</option>
                </select>
              </label>
            ) : null}

            {reportType === "all_categories" ? (
              <label className={fieldClass}>
                <span className={labelClass}>Category</span>
                <select
                  className={inputClass}
                  value={livestockCategory}
                  disabled={livestockTypesLoading}
                  onChange={(e) => setLivestockCategory(e.target.value)}
                >
                  <option value="all">All</option>
                  {[...new Set(livestockTypes.map((lt) => lt.categoryLabel).filter(Boolean))].map(
                    (name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    )
                  )}
                </select>
              </label>
            ) : null}

            {needsAge(reportType) ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>Age from (years)</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={ageFrom}
                    onChange={(e) => setAgeFrom(e.target.value)}
                    placeholder="1"
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Age to (years)</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={ageTo}
                    onChange={(e) => setAgeTo(e.target.value)}
                    placeholder="2"
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>From</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={originPlace}
                    onChange={(e) => setOriginPlace(e.target.value)}
                    placeholder="Baydhabo"
                  />
                </label>
              </>
            ) : null}

            {usesMarketFilter(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Market</span>
                <select
                  className={inputClass}
                  value={marketName}
                  disabled={marketsLoading}
                  onChange={(e) => setMarketName(e.target.value)}
                >
                  <option value="">All markets</option>
                  {markets.length === 0 && !marketsLoading ? (
                    <option value="" disabled>
                      No markets found
                    </option>
                  ) : null}
                  {markets.map((m) => (
                    <option key={m.id} value={m.name}>
                      {marketOptionLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {needsCompareMarkets(reportType) ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>Market 1</span>
                  <select
                    className={inputClass}
                    value={marketName}
                    disabled={marketsLoading}
                    onChange={(e) => setMarketName(e.target.value)}
                  >
                    <option value="">Select market</option>
                    {markets
                      .filter((m) => m.name !== marketNameB)
                      .map((m) => (
                      <option key={`a-${m.id}`} value={m.name}>
                        {marketOptionLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Market 2</span>
                  <select
                    className={inputClass}
                    value={marketNameB}
                    disabled={marketsLoading}
                    onChange={(e) => setMarketNameB(e.target.value)}
                  >
                    <option value="">Select market</option>
                    {markets
                      .filter((m) => m.name !== marketName)
                      .map((m) => (
                      <option key={`b-${m.id}`} value={m.name}>
                        {marketOptionLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {needsCompany(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Company name</span>
                <select
                  className={inputClass}
                  value={safeCompanyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                >
                  <option value="all">All</option>
                  {companyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {needsUtilityKind(reportType) && !selectedMeta?.lockUtility ? (
              <label className={fieldClass}>
                <span className={labelClass}>Utility</span>
                <select
                  className={inputClass}
                  value={utilityKind}
                  onChange={(e) => {
                    setUtilityKind(e.target.value as UtilityKind | "all");
                    setCompanyName("all");
                    setCompanyNameB("");
                  }}
                >
                  {reportType === "company_info_documents" ? (
                    <option value="all">All sectors</option>
                  ) : null}
                  <option value="water">Water (m³)</option>
                  <option value="electricity">Electricity (kWh)</option>
                </select>
              </label>
            ) : null}

            {needsCompareCompanies(reportType) ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>Company 1</span>
                  <select
                    className={inputClass}
                    value={safeCompanyName === "all" ? "" : safeCompanyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  >
                    <option value="">Select company</option>
                    {companyOptions
                      .filter((name) => name !== companyNameB)
                      .map((name) => (
                      <option key={`c1-${name}`} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Company 2</span>
                  <select
                    className={inputClass}
                    value={safeCompanyNameB}
                    onChange={(e) => setCompanyNameB(e.target.value)}
                  >
                    <option value="">Select company</option>
                    {companyOptions
                      .filter((name) => name !== companyName && name !== "all")
                      .map((name) => (
                      <option key={`c2-${name}`} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                {companyOptions.length < 2 ? (
                  <p className="sm:col-span-2 text-sm font-semibold text-amber-800">
                    {utilityKind === "electricity"
                      ? "Only one electricity company is available, so two companies cannot be compared."
                      : "Only one water company is available, so two companies cannot be compared."}
                  </p>
                ) : null}
              </>
            ) : null}

            {needsApprovalStatus(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Approval status</span>
                <select
                  className={inputClass}
                  value={approvalStatus}
                  onChange={(e) =>
                    setApprovalStatus(
                      e.target.value as "all" | "PENDING" | "APPROVED" | "REJECTED"
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
            ) : null}

            {needsApprovalSector(reportType) && !selectedMeta?.lockSector ? (
              <label className={fieldClass}>
                <span className={labelClass}>Sector</span>
                <select
                  className={inputClass}
                  value={approvalSector}
                  onChange={(e) =>
                    setApprovalSector(
                      e.target.value as "all" | "livestock" | "water" | "electricity"
                    )
                  }
                >
                  <option value="all">All sectors</option>
                  <option value="livestock">Livestock</option>
                  <option value="water">Water</option>
                  <option value="electricity">Electricity</option>
                </select>
              </label>
            ) : null}

            {needsRateSort(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Sort</span>
                <select
                  className={inputClass}
                  value={rateSort}
                  onChange={(e) => setRateSort(e.target.value as RateSort)}
                >
                  <option value="cheap">cheapest</option>
                  <option value="high">highest</option>
                </select>
              </label>
            ) : null}

            {reportType === "livestock_type_market" ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>By Range</span>
                  <select
                    className={inputClass}
                    value={livestockPriceOp}
                    onChange={(e) => setLivestockPriceOp(e.target.value as "all" | PriceCompareOp)}
                  >
                    <option value="all">All prices</option>
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="between">Between</option>
                  </select>
                </label>
                {livestockPriceOp !== "all" ? (
                  <label className={fieldClass}>
                    <span className={labelClass}>
                      {livestockPriceOp === "between" ? "Min price ($)" : "Price ($)"}
                    </span>
                    <input
                      type="number"
                      className={inputClass}
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                ) : null}
                {livestockPriceOp === "between" ? (
                  <label className={fieldClass}>
                    <span className={labelClass}>Max price ($)</span>
                    <input
                      type="number"
                      className={inputClass}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                ) : null}
              </>
            ) : needsPriceRange(reportType) ? (
              <>
                <label className={fieldClass}>
                  <span className={labelClass}>Compare</span>
                  <select
                    className={inputClass}
                    value={priceOp}
                    onChange={(e) => setPriceOp(e.target.value as PriceCompareOp)}
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="between">Between</option>
                  </select>
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>
                    {priceOp === "between" ? "Min price" : "Price"}
                  </span>
                  <input
                    type="number"
                    className={inputClass}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                </label>
                {priceOp === "between" ? (
                  <label className={fieldClass}>
                    <span className={labelClass}>Max price</span>
                    <input
                      type="number"
                      className={inputClass}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            {needsYear(reportType) ? (
              <label className={fieldClass}>
                <span className={labelClass}>Kind</span>
                <select
                  className={inputClass}
                  value={registeredKind}
                  onChange={(e) => {
                    const next = e.target.value as RegisteredKind;
                    setRegisteredKind(next);
                    if (reportType === "all_subscriptions") {
                      executeReport(reportType, { registeredKind: next });
                    }
                  }}
                >
                  <option value="both">Companies + Brokers</option>
                  <option value="companies">Companies only</option>
                  <option value="brokers">Brokers only</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={searchReport}
              disabled={pending}
              className={cn(btnClass, "bg-emerald-700 hover:bg-emerald-800")}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search Report
            </button>
            <button
              type="button"
              onClick={() => void exportPdf()}
              disabled={!report || report.rows.length === 0}
              className={cn(btnClass, "bg-rose-600 hover:bg-rose-700")}
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => void exportExcel()}
              disabled={!report || report.rows.length === 0}
              className={cn(btnClass, "bg-emerald-600 hover:bg-emerald-700")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!report || report.rows.length === 0}
              className={cn(btnClass, "bg-slate-700 hover:bg-slate-800")}
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {pending && !report ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-slate-500 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-semibold">
            {t("Loading report data...", "Warbixinta ayaa la soo gelinayaa...")}
          </p>
        </div>
      ) : null}

      {report ? (
        <div className={cn("overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-opacity", pending && "opacity-60")}>
          <div className="hidden print:flex items-start gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-800 to-emerald-600 px-5 py-4 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SYSTEM_LOGO_SRC}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                {report.systemName}
              </p>
              <h3 className="mt-1 text-lg font-black">
                {(report.title || "")
                  .replace(/\s*[—–-]+\s*[—–-]+\s*$/g, "")
                  .replace(/\s*[—–-]+\s*$/g, "")
                  .trim()}
              </h3>
              <p className="mt-1 text-sm text-emerald-50">{report.subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-100">
                <span>{report.summary}</span>
                <span>
                  Created {new Date(report.generatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {report.columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.columns.length}
                      className="px-4 py-10 text-center text-sm font-semibold text-slate-400"
                    >
                      No records found for these filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-slate-100 text-slate-700 odd:bg-white even:bg-slate-50/60"
                    >
                      {report.columns.map((c) => (
                        <td key={c.key} className="px-4 py-2.5 whitespace-nowrap font-medium">
                          {row[c.key] == null
                            ? "—"
                            : c.key === "age" ||
                                c.key === "livestock" ||
                                c.key === "type" ||
                                c.key === "category" ||
                                c.key === "animal"
                              ? lc(String(row[c.key]))
                              : String(row[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {visibleRows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 bg-white px-5 py-3.5 print:hidden">
              <p className="text-xs font-semibold text-slate-500">
                {t(
                  `Showing ${showingFrom} to ${showingTo} of ${visibleRows.length} results`,
                  `Waxaa la muujinayaa ${showingFrom} ilaa ${showingTo} ee ${visibleRows.length} natiijo`
                )}
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t("Previous", "Hore")}</span>
                </button>

                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-9 w-9 items-center justify-center text-xs font-bold text-slate-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(Number(p))}
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-bold transition",
                        currentPage === p
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <span>{t("Next", "Xiga")}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("Rows per page", "Safafka boggiiba")}:
                </span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
