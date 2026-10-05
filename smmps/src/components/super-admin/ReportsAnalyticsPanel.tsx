"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  CalendarRange,
  Search,
} from "lucide-react";
import { format, subDays } from "date-fns";
import type { ReportRow } from "@/lib/report-engine";
import type ExcelJS from "exceljs";
import { DateInput } from "@/components/ui/DateInput";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn, formatLabel } from "@/lib/utils";
import {
  formatMmpsStamp,
  inMogadishuDateRange,
  mogadishuYmd,
  parseIsoDateOnly,
  yearOverlapsMogadishuRange,
} from "@/lib/mogadishu-time";
import { SYSTEM_NAME } from "@/lib/home-content";
import { authPortalHeaders } from "@/lib/auth-portal";
import {
  REPORT_DATE_MAX,
  REPORT_DATE_MIN,
  validateReportDateRange,
} from "@/lib/super-admin-advanced-reports-shared";

const STATUS_OPTIONS = [
  { key: "ALL", label: "All statuses" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

type PriceFilter = "none" | "highest" | "lowest" | "gt" | "lt" | "between";
type UnitFilter = "ALL" | "kWh" | "m³";
type SectorFilter = "ALL" | "Livestock" | "Water" | "Electricity";
type LockedSector = "Livestock" | "Water" | "Electricity";

type MarketSectionOption = {
  id: number;
  name: string;
  marketId: number;
  marketName: string;
  marketType: string;
};

type CompanyOption = {
  id: number;
  name: string;
  slug: string;
  type: string;
  marketId: number | null;
};

function sectorToApi(sector: SectorFilter): string {
  if (sector === "ALL") return "all";
  return sector.toLowerCase();
}

function defaultDateFrom() {
  return format(subDays(new Date(), 30), "yyyy-MM-dd");
}

function defaultDateTo() {
  return format(new Date(), "yyyy-MM-dd");
}

function sectorFromCompanySector(
  sector: "water" | "electricity" | "livestock" | null | undefined
): LockedSector | undefined {
  if (sector === "water") return "Water";
  if (sector === "electricity") return "Electricity";
  if (sector === "livestock") return "Livestock";
  return undefined;
}

function rowUnitKind(unit: string): UnitFilter | "other" {
  const u = unit.toLowerCase();
  if (u.includes("kwh") || u.includes("kilowatt")) return "kWh";
  if (u.includes("m³") || u.includes("m3") || u.includes("cubic")) return "m³";
  return "other";
}

function formatChangeWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatMmpsStamp(iso);
}

export function ReportsAnalyticsPanel({
  initialRows: _initialRows = [],
  showCompanyFilter = false,
  lockedSector,
  companySector,
  refreshKey = 0,
  companyLogo,
  companyName,
  companyAcronym,
  companyAddress,
  adminName,
  adminEmail,
}: {
  /** Optional SSR seed — unused; reports load only after Search Report */
  initialRows?: ReportRow[];
  /** Kept for company dashboards; Super Admin reports hide company text filter */
  showCompanyFilter?: boolean;
  /** When set, hides other sectors and only loads this sector's report */
  lockedSector?: LockedSector;
  /** Convenience: map company dashboard sector to lockedSector */
  companySector?: "water" | "electricity" | "livestock" | null;
  /** Bump after a price save so history reloads */
  refreshKey?: number;
  companyLogo?: string | null;
  companyName?: string;
  companyAcronym?: string;
  companyAddress?: string;
  adminName?: string;
  adminEmail?: string;
}) {
  void _initialRows;
  void showCompanyFilter;
  const forcedSector =
    lockedSector ?? sectorFromCompanySector(companySector) ?? null;
  const companyView = Boolean(forcedSector);
  const lockedUnit: UnitFilter | null =
    forcedSector === "Water"
      ? "m³"
      : forcedSector === "Electricity"
        ? "kWh"
        : null;
  const { t } = useLang();
  const F = TRANSLATIONS.filters;
  const [sector, setSector] = useState<SectorFilter>(forcedSector ?? "ALL");
  /** Company reports: leave blank to load full history (no date filter). */
  const [dateFrom, setDateFrom] = useState(() =>
    companyView ? "" : defaultDateFrom()
  );
  const [dateTo, setDateTo] = useState(() => (companyView ? "" : defaultDateTo()));
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["key"]>(
    "ALL"
  );
  const [sectionId, setSectionId] = useState<number | "ALL">("ALL");
  const [companyKey, setCompanyKey] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("none");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("ALL");
  const [sections, setSections] = useState<MarketSectionOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (forcedSector) setSector(forcedSector);
  }, [forcedSector]);

  const filtersRef = useRef({
    dateFrom,
    dateTo,
    sector,
    status,
    sectionId,
    companyKey,
    forcedSector,
  });
  useEffect(() => {
    filtersRef.current = {
      dateFrom,
      dateTo,
      sector,
      status,
      sectionId,
      companyKey,
      forcedSector,
    };
  }, [dateFrom, dateTo, sector, status, sectionId, companyKey, forcedSector]);

  useEffect(() => {
    if (forcedSector) return;
    let cancelled = false;
    fetch("/api/reports?catalog=sections")
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        setSections(Array.isArray(data.sections) ? data.sections : []);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });
    fetch("/api/companies", { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.companies) ? data.companies : [];
        setCompanies(
          list.map(
            (c: {
              id: number;
              name: string;
              slug?: string;
              type?: string;
              marketId?: number | null;
              market?: { id: number } | null;
            }) => ({
              id: c.id,
              name: c.name,
              slug: c.slug || String(c.id),
              type: String(c.type || "OTHER"),
              marketId: c.marketId ?? c.market?.id ?? null,
            })
          )
        );
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [forcedSector]);

  const loadReport = useCallback(
    (opts?: { print?: boolean; action?: "FILTER" | "PRINT" }) => {
      startTransition(async () => {
        setError(null);
        const current = filtersRef.current;
        const activeSector = current.forcedSector ?? current.sector;

        let from = current.dateFrom.trim() || null;
        let to = current.dateTo.trim() || null;
        const dateError = validateReportDateRange(from, to);
        if (dateError) {
          setError(dateError);
          setHasSearched(true);
          return;
        }
        // Auto-correct reversed ranges (common with locale date pickers)
        if (from && to && from > to) {
          const swap = from;
          from = to;
          to = swap;
          setDateFrom(from);
          setDateTo(to);
        }

        // Clear previous rows while searching
        setRows([]);

        const body = {
          dateFrom: from,
          dateTo: to,
          sector: sectorToApi(activeSector),
          status: current.forcedSector ? "ALL" : current.status,
          sectionId:
            current.forcedSector || current.sectionId === "ALL"
              ? null
              : current.sectionId,
          company: current.forcedSector ? null : current.companyKey || null,
          action: opts?.action ?? (opts?.print ? "PRINT" : "FILTER"),
        };

        try {
          const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to load report");
          setRows((data.rows ?? []) as ReportRow[]);
          setHasSearched(true);

          if (opts?.print) {
            window.setTimeout(() => window.print(), 120);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load report");
          setHasSearched(true);
        }
      });
    },
    []
  );

  // Super Admin: load live records on first visit so the report box is not empty.
  useEffect(() => {
    if (companyView) return;
    loadReport({ action: "FILTER" });
    // First paint only — later searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyView]);

  // After a price save, load this company's report (current rate + history)
  useEffect(() => {
    if (!companyView || refreshKey <= 0) return;
    setHasSearched(true);
    loadReport({ action: "FILTER" });
  }, [refreshKey, companyView, loadReport]);

  async function downloadPdf() {
    if (!displayedRows.length) return;
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableMod.default;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const printedAt = formatChangeWhen(new Date().toISOString());
      const createdAt = new Date().toLocaleString();
      const orgName = companyView
        ? companyName || companyAcronym || SYSTEM_NAME
        : SYSTEM_NAME;
      const orgAddress = companyView ? String(companyAddress || "").trim() : "";
      const title = companyView ? "Price Report" : "Market Price Report";
      const logoSrc = companyView
        ? companyLogo || "/images/brand/mmps-logo.png"
        : "/images/brand/mmps-logo.png";
      const logoData = await (await import("@/lib/report-logo")).loadReportLogoJpeg(logoSrc);
      let createdBy = companyView
        ? (adminName || "Company Admin").trim()
        : "Super Admin";
      if (!companyView || !adminName?.trim()) {
        try {
          const meRes = await fetch("/api/auth/me", {
            credentials: "include",
            headers: authPortalHeaders(companyView ? "admin" : "super"),
          });
          const meData = await meRes.json().catch(() => ({}));
          const name = String(meData?.user?.fullName || "").trim();
          if (name) createdBy = name;
        } catch {
          /* keep fallback */
        }
      }

      const headerH = 108;
      const footerH = 36;

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
          doc.text(orgName, centerX, titleY, { align: "center" });
          doc.setFontSize(12);
          doc.text(title, centerX, titleY + 16, { align: "center" });

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
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Date: ${printedAt}`, margin, pageHeight - 14);
          if (orgAddress) {
            doc.text(orgAddress, pageWidth / 2, pageHeight - 14, { align: "center" });
          }
          doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 14, {
            align: "right",
          });
        }
      };

      const head = companyView
        ? [["Provider", forcedSector === "Electricity" ? "Band" : "Rate type", "Unit", "Price (USD)", "Status", "Changed by", "Date"]]
        : [[
            "Sector",
            "Section",
            "Item",
            "Provider",
            "Unit",
            "Price (USD)",
            "Status",
            "Submitted by",
            "Date",
          ]];

      const body = displayedRows.map((r) => {
        const when = String(r.id).startsWith("YH-")
          ? String(new Date(r.dateRecorded).getUTCFullYear())
          : companyView
            ? formatChangeWhen(r.dateRecorded)
            : mogadishuYmd(r.dateRecorded) || "—";
        if (companyView) {
          return [
            r.provider,
            r.item && r.item !== "Professionals" && r.item !== "Price History"
              ? r.item
              : "Standard rate",
            r.unit,
            `$${Number(r.price).toFixed(2)}`,
            r.status || "—",
            r.submittedBy || "—",
            when,
          ];
        }
        return [
          r.sector,
          r.section || "—",
          formatLabel(r.item),
          r.provider,
          r.unit,
          `$${Number(r.price).toFixed(2)}`,
          r.status,
          r.submittedBy || "—",
          when,
        ];
      });

      autoTable(doc, {
        head,
        body: body.length ? body : [["No records found"]],
        startY: headerH + 14,
        margin: { top: margin, left: margin, right: margin, bottom: footerH + 8 },
        styles: {
          fontSize: 8,
          cellPadding: 4.2,
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
        },
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

      const stamp = format(new Date(), "yyyyMMdd-HHmm");
      const file = companyView
        ? `${(companyAcronym || "company").toLowerCase()}-price-report-${stamp}.pdf`
        : `mmps-market-report-${stamp}.pdf`;
      doc.save(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export PDF");
    }
  }

  function setRangeFrom(nextFrom: string) {
    setDateFrom(nextFrom);
    if (nextFrom && dateTo && nextFrom > dateTo) {
      setDateTo(nextFrom);
    }
  }

  function setRangeTo(nextTo: string) {
    setDateTo(nextTo);
    if (nextTo && dateFrom && dateFrom > nextTo) {
      setDateFrom(nextTo);
    }
  }

  const visibleSections = useMemo(() => {
    if (sector === "ALL") return sections;
    const type =
      sector === "Water"
        ? "WATER"
        : sector === "Electricity"
          ? "ELECTRICITY"
          : "LIVESTOCK";
    return sections.filter((s) => s.marketType === type || s.marketType === "GENERAL");
  }, [sections, sector]);

  const visibleCompanies = useMemo(() => {
    const bySector = companies.filter((c) => {
      if (sector === "Water") return c.type === "WATER_SUPPLY";
      if (sector === "Electricity") return c.type === "ELECTRICITY";
      if (sector === "Livestock") return c.type !== "WATER_SUPPLY" && c.type !== "ELECTRICITY";
      return true;
    });
    if (sectionId === "ALL") return bySector;
    const section = visibleSections.find((s) => s.id === sectionId);
    if (!section) return bySector;
    const matched = bySector.filter((c) => c.marketId === section.marketId);
    return matched.length ? matched : bySector;
  }, [companies, sector, sectionId, visibleSections]);

  useEffect(() => {
    if (sectionId === "ALL") return;
    if (!visibleSections.some((s) => s.id === sectionId)) {
      setSectionId("ALL");
    }
  }, [visibleSections, sectionId]);

  useEffect(() => {
    if (!companyKey) return;
    if (!visibleCompanies.some((c) => c.slug === companyKey || c.name === companyKey)) {
      setCompanyKey("");
    }
  }, [visibleCompanies, companyKey]);

  const displayedRows = (() => {
    let list = forcedSector
      ? rows
      : rows.filter((r) => !String(r.id).startsWith("YH-"));

    const fromYmd = parseIsoDateOnly(dateFrom);
    const toYmd = parseIsoDateOnly(dateTo);
    if (fromYmd || toYmd) {
      list = list.filter((r) => {
        if (String(r.id).startsWith("YH-")) {
          const y =
            Number(mogadishuYmd(r.dateRecorded).slice(0, 4)) ||
            Number(String(r.id).split("-")[1]);
          return yearOverlapsMogadishuRange(y, fromYmd, toYmd);
        }
        return inMogadishuDateRange(r.dateRecorded, fromYmd, toYmd);
      });
    }

    if (!forcedSector && companyKey) {
      const selected = companies.find(
        (c) => c.slug === companyKey || c.name === companyKey
      );
      const needles = [companyKey, selected?.name, selected?.slug]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      list = list.filter((r) => {
        const provider = r.provider.toLowerCase();
        return needles.some((n) => provider.includes(n) || n.includes(provider));
      });
    }

    const activeUnit = lockedUnit ?? unitFilter;
    if (activeUnit !== "ALL") {
      const matched = list.filter((r) => {
        const kind = rowUnitKind(r.unit);
        if (kind === activeUnit) return true;
        if (lockedUnit && kind === "other") return true;
        return false;
      });
      if (matched.length) list = matched;
    }

    const amount = (r: ReportRow) => {
      const n = Number(r.price);
      return Number.isFinite(n) ? n : 0;
    };
    const cents = (r: ReportRow) => Math.round(amount(r) * 100);
    if (list.length && priceFilter === "highest") {
      const max = Math.max(...list.map(cents));
      list = list.filter((r) => cents(r) === max);
    } else if (list.length && priceFilter === "lowest") {
      const min = Math.min(...list.map(cents));
      list = list.filter((r) => cents(r) === min);
    } else if (priceFilter === "gt") {
      const min = Number(priceMin);
      if (Number.isFinite(min)) {
        list = list.filter((r) => amount(r) > min);
      }
    } else if (priceFilter === "lt") {
      const max = Number(priceMin);
      if (Number.isFinite(max)) {
        list = list.filter((r) => amount(r) < max);
      }
    } else if (priceFilter === "between") {
      const min = Number(priceMin);
      const max = Number(priceMax);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        list = list.filter((r) => amount(r) >= lo && amount(r) <= hi);
      } else if (Number.isFinite(min)) {
        list = list.filter((r) => amount(r) >= min);
      } else if (Number.isFinite(max)) {
        list = list.filter((r) => amount(r) <= max);
      }
    }

    return list;
  })();

  async function exportExcel() {
    if (displayedRows.length === 0) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = companyName || "MMPS";
      workbook.created = new Date();

      const colCount = companyView ? 7 : 9;
      const sheet = workbook.addWorksheet(
        companyView ? "Price History" : "Market Report",
        { views: [{ state: "frozen", ySplit: 4 }] }
      );

      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF047857" },
      };
      const altFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };

      if (companyView) {
        sheet.columns = [
          { key: "provider", width: 36 },
          { key: "item", width: 18 },
          { key: "unit", width: 12 },
          { key: "price", width: 14 },
          { key: "status", width: 14 },
          { key: "changedBy", width: 28 },
          { key: "when", width: 22 },
        ];
      } else {
        sheet.columns = [
          { key: "sector", width: 14 },
          { key: "section", width: 22 },
          { key: "item", width: 18 },
          { key: "provider", width: 34 },
          { key: "unit", width: 12 },
          { key: "price", width: 14 },
          { key: "status", width: 12 },
          { key: "submittedBy", width: 26 },
          { key: "when", width: 16 },
        ];
      }

      // Row 1 — title
      sheet.addRow([
        companyView
          ? `${companyName || companyAcronym || "Company"} - Professionals Price Report`
          : "MMPS - Market Price Report",
      ]);
      sheet.mergeCells(1, 1, 1, colCount);
      sheet.getRow(1).height = 26;
      sheet.getCell(1, 1).font = {
        name: "Calibri",
        size: 14,
        bold: true,
        color: { argb: "FF064E3B" },
      };
      sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };

      // Row 2 — meta
      sheet.addRow([
        `Created ${formatChangeWhen(new Date().toISOString())}${
          adminName ? ` | Admin: ${adminName}` : ""
        }`,
      ]);
      sheet.mergeCells(2, 1, 2, colCount);
      sheet.getRow(2).height = 18;
      sheet.getCell(2, 1).font = {
        name: "Calibri",
        size: 9,
        italic: true,
        color: { argb: "FF64748B" },
      };

      // Row 3 — spacer
      sheet.addRow([]);
      sheet.getRow(3).height = 8;

      // Row 4 — headers
      const headers = companyView
        ? ["Provider", forcedSector === "Electricity" ? "Band" : "Rate type", "Unit", "Price (USD)", "Status", "Changed By", "Date & Time"]
        : [
            "Sector",
            "Section",
            "Item",
            "Provider",
            "Unit",
            "Price (USD)",
            "Status",
            "Submitted By",
            "Date Recorded",
          ];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
          name: "Calibri",
          size: 11,
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });

      // Data rows
      const priceCol = companyView ? 4 : 6;
      for (const r of displayedRows) {
        const values = companyView
          ? [
              r.provider,
              r.item && r.item !== "Professionals" && r.item !== "Price History"
                ? r.item
                : "Standard rate",
              r.unit,
              Number(r.price.toFixed(2)),
              r.status || "—",
              r.submittedBy || "-",
              String(r.id).startsWith("YH-")
                ? String(new Date(r.dateRecorded).getUTCFullYear())
                : formatChangeWhen(r.dateRecorded),
            ]
          : [
              r.sector,
              r.section || "—",
              formatLabel(r.item),
              r.provider,
              r.unit,
              Number(r.price.toFixed(2)),
              r.status,
              r.submittedBy || "-",
              new Date(r.dateRecorded).toLocaleDateString("en-GB"),
            ];
        const dataRow = sheet.addRow(values);
        dataRow.height = 18;
        dataRow.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          cell.font = {
            name: "Calibri",
            size: 10,
            color: { argb: "FF0F172A" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber === priceCol ? "right" : "left",
          };
          if (dataRow.number % 2 === 0) cell.fill = altFill;
        });
        const priceCell = dataRow.getCell(priceCol);
        priceCell.numFmt = '"$"#,##0.00';
        priceCell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: "FF047857" },
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
      const stamp = format(new Date(), "yyyyMMdd-HHmm");
      a.download = companyView
        ? `${(companyAcronym || "company").toLowerCase()}-price-report-${stamp}.xlsx`
        : `mmps-market-report-${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export Excel");
    }
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";
  const actionBtn =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-black uppercase tracking-wide text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-[8.5rem]";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CalendarRange className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Report filters</p>
              <p className="text-[12px] font-medium text-slate-500">
                {companyView
                  ? "Pick dates to filter, or leave blank for full history — then Search Report"
                  : "Choose dates and filters, then Search Report to load live database records"}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2",
              forcedSector ? "xl:grid-cols-4" : "xl:grid-cols-4"
            )}
          >
            {!forcedSector ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Market category
                </span>
                <select
                  value={sector}
                  onChange={(e) => {
                    setSector(e.target.value as SectorFilter);
                    setCompanyKey("");
                    setSectionId("ALL");
                  }}
                  className={fieldClass}
                  aria-label="Filter by sector"
                >
                  <option value="ALL">All market categories</option>
                  <option value="Livestock">Livestock</option>
                  <option value="Water">Water</option>
                  <option value="Electricity">Electricity</option>
                </select>
              </label>
            ) : null}
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t(F.from.en, F.from.so)}
              </span>
              <DateInput
                value={dateFrom}
                min={REPORT_DATE_MIN}
                max={dateTo && dateTo < REPORT_DATE_MAX ? dateTo : REPORT_DATE_MAX}
                onChange={(e) => setRangeFrom(e.target.value)}
                className={fieldClass}
                aria-label="From date"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t(F.to.en, F.to.so)}
              </span>
              <DateInput
                value={dateTo}
                min={dateFrom && dateFrom > REPORT_DATE_MIN ? dateFrom : REPORT_DATE_MIN}
                max={REPORT_DATE_MAX}
                onChange={(e) => setRangeTo(e.target.value)}
                className={fieldClass}
                aria-label="To date"
              />
            </label>
            {!forcedSector ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Status
                </span>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]["key"])
                  }
                  className={fieldClass}
                  aria-label="Filter by status"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Filter
              </span>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                className={fieldClass}
                aria-label="Filter by price"
              >
                <option value="none">All prices</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
                <option value="gt">Greater than</option>
                <option value="lt">Smaller than</option>
                <option value="between">Between</option>
              </select>
            </label>
            {priceFilter === "gt" || priceFilter === "lt" ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Amount
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder={priceFilter === "gt" ? "e.g. 0.40" : "e.g. 0.35"}
                  className={fieldClass}
                  aria-label="Price amount"
                />
              </label>
            ) : null}
            {priceFilter === "between" ? (
              <>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Min
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className={fieldClass}
                    aria-label="Minimum price"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Max
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className={fieldClass}
                    aria-label="Maximum price"
                  />
                </label>
              </>
            ) : null}
            {lockedUnit ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Unit
                </span>
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800">
                  {lockedUnit === "m³" ? "Meter cubic (m³)" : "Kilowatt (kWh)"}
                </div>
              </label>
            ) : forcedSector !== "Livestock" ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Kilowatt / m³
                </span>
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value as UnitFilter)}
                  className={fieldClass}
                  aria-label="Filter by unit"
                >
                  <option value="ALL">All units</option>
                  <option value="kWh">Kilowatt (kWh)</option>
                  <option value="m³">Meter cubic (m³)</option>
                </select>
              </label>
            ) : null}
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              forcedSector ? "xl:grid-cols-[1fr_auto]" : "xl:grid-cols-[minmax(0,1fr)_auto]"
            )}
          >
            {!forcedSector ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Market
                  </span>
                  <select
                    value={sectionId === "ALL" ? "ALL" : String(sectionId)}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSectionId(next === "ALL" ? "ALL" : Number(next));
                      setCompanyKey("");
                    }}
                    className={fieldClass}
                    aria-label="Filter by market"
                  >
                    <option value="ALL">All markets</option>
                    {visibleSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.marketName} · {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Company
                  </span>
                  <select
                    value={companyKey}
                    onChange={(e) => setCompanyKey(e.target.value)}
                    className={fieldClass}
                    aria-label="Filter by company"
                  >
                    <option value="">All companies</option>
                    {visibleCompanies.map((c) => (
                      <option key={c.id} value={c.slug || c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => loadReport({ action: "FILTER" })}
                disabled={isPending}
                className={cn(actionBtn, "bg-emerald-700 hover:bg-emerald-800 sm:w-[11.5rem]")}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" strokeWidth={2.5} />
                )}
                Search Report
              </button>
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={!hasSearched || displayedRows.length === 0}
                className={cn(actionBtn, "bg-rose-600 hover:bg-rose-700")}
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => exportExcel()}
                disabled={!hasSearched || displayedRows.length === 0}
                className={cn(actionBtn, "bg-emerald-600 hover:bg-emerald-700")}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>

      {!hasSearched ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Report rows</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Records between the selected From and To dates
            </p>
          </div>
          <div className="px-5 py-14 text-center">
            {isPending ? (
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            ) : (
              <>
                <Search className="mx-auto h-8 w-8 text-slate-300" strokeWidth={2} />
                <p className="mt-3 text-sm font-bold text-slate-600">No report loaded yet</p>
                <p className="mt-1 text-[13px] font-medium text-slate-400">
                  Choose From / To dates, then click Search Report.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <PriceHistoryTable
          companyView={companyView}
          forcedSector={forcedSector}
          dateFrom={dateFrom}
          dateTo={dateTo}
          rows={displayedRows}
        />
      )}
    </div>
  );
}

function PriceHistoryTable({
  companyView,
  forcedSector,
  dateFrom,
  dateTo,
  rows,
}: {
  companyView: boolean;
  forcedSector: LockedSector | null;
  dateFrom: string;
  dateTo: string;
  rows: ReportRow[];
}) {
  return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black text-slate-900">
          {companyView ? "Price change history" : "Report rows"}
        </h3>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
          {companyView
            ? !dateFrom && !dateTo
              ? `Your company ${forcedSector} updates + yearly price history`
              : `${forcedSector} price history for ${dateFrom || "…"} → ${dateTo || "…"}`
            : dateFrom || dateTo
              ? `${rows.length} rows between ${dateFrom || "…"} and ${dateTo || "…"}`
              : "Filtered market prices from the report engine"}
          </p>
        </div>
        <div className="max-h-[min(62vh,36rem)] overflow-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {!companyView ? <th className="px-4 py-3">Sector</th> : null}
              {!companyView ? <th className="px-4 py-3">Section</th> : null}
              {!companyView ? <th className="px-4 py-3">Item</th> : null}
              {companyView ? (
                <th className="px-4 py-3">
                  {forcedSector === "Electricity" ? "Band" : "Rate type"}
                </th>
              ) : null}
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Price</th>
              {!companyView ? (
                <th className="px-4 py-3 text-center">Status</th>
              ) : null}
              <th className="px-4 py-3">
                {companyView ? "Changed by" : "Submitted by"}
              </th>
              <th className="px-4 py-3">
                {companyView ? "Date & time" : "Date"}
              </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                  colSpan={companyView ? 5 : 8}
                    className="px-4 py-12 text-center text-sm font-semibold text-slate-400"
                  >
                  {companyView
                    ? "No price changes found for this date range."
                    : "No rows match the current filters."}
                  </td>
                </tr>
              ) : (
              rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 text-[12px] hover:bg-slate-50/80"
                  >
                  {!companyView ? (
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {r.sector}
                    </td>
                  ) : null}
                  {!companyView ? (
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {r.section || "—"}
                    </td>
                  ) : null}
                  {!companyView ? (
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {formatLabel(r.item)}
                    </td>
                  ) : (
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {r.item &&
                      r.item !== "Professionals" &&
                      r.item !== "Price History"
                        ? r.item
                        : "Standard rate"}
                    </td>
                  )}
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                      {r.provider}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black tabular-nums text-slate-900">
                      ${r.price.toFixed(2)}
                    {r.unit ? (
                      <span className="ml-1 text-[10px] font-semibold text-slate-400">
                        {r.unit.replace(/^per\s+/i, "/")}
                      </span>
                    ) : null}
                    </td>
                  {!companyView ? (
                    <td className="px-4 py-2.5 text-center">
                      <StatusChip status={r.status} />
                    </td>
                  ) : null}
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {r.submittedBy || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                    {companyView && String(r.id).startsWith("YH-")
                      ? String(new Date(r.dateRecorded).getUTCFullYear())
                      : companyView
                        ? formatChangeWhen(r.dateRecorded)
                        : new Date(r.dateRecorded).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "REJECTED"
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : status === "PENDING"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-slate-50 text-slate-600 ring-slate-100";
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1",
        tone
      )}
    >
      {status}
    </span>
  );
}
