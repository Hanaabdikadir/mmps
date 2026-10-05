"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileBarChart2, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrintButton } from "@/components/ui/PrintButton";
import { cn } from "@/lib/utils";
import {
  LIVESTOCK_COLUMNS,
  adminLivestockName,
  isLivestockCategorySlug,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { formatUsd } from "@/lib/livestock-section-prices";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { inMogadishuDateRange } from "@/lib/mogadishu-time";
import { loadReportLogoJpeg } from "@/lib/report-logo";
import { DateInput } from "@/components/ui/DateInput";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { SYSTEM_NAME } from "@/lib/home-content";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { authPortalHeaders } from "@/lib/auth-portal";
import { ageClassLabel, originPlaceLabel } from "@/lib/livestock-listing-meta";

type LivestockFilter = string;
type BrokerReportKind = "history" | "high_low" | "activity" | "age_origin";
type Option = { id: number; name: string; slug?: string; nameSomali?: string | null };
type BrokerUser = { fullName: string; email: string; phone?: string | null };
type PriceRow = {
  id: number;
  price: number;
  currency: string;
  status: string;
  rejectionReason?: string | null;
  dateRecorded: string;
  description: string | null;
  marketLocation: string;
  broker: {
    id: number;
    name: string;
    email?: string | null;
    location?: string | null;
    users?: BrokerUser[];
    categories?: Option[];
    market?: { id: number; name: string; location?: string | null } | null;
    assignedMarkets?: { market?: { id: number; name: string; location?: string | null } | null }[];
  } | null;
  market: { id: number; name: string; location?: string | null } | null;
  category: { id: number; name: string; slug?: string } | null;
  animalType: { id: number; name: string; nameSomali?: string | null } | null;
  fallbackCategory: string | null;
  animalTypeEnum: string;
  ageClass?: string | null;
  originPlace?: string | null;
  catalogOnly?: boolean;
};

const selectCls =
  "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

function isSectionLeadEmail(email?: string | null) {
  return (email || "").toLowerCase().endsWith("@livestock.so");
}

function livestockFromHay(hay: string): LivestockCategorySlug | "other" {
  const t = hay.toLowerCase();
  if (t.includes("geel") || t.includes("camel")) return "geel";
  if (t.includes("loda") || t.includes("cattle")) return "loda";
  if (t.includes("arri") || t.includes("goat") || t.includes("sheep") || t.includes("ari")) {
    return "arri";
  }
  return "other";
}

function displayBrokerName(broker: PriceRow["broker"]) {
  if (!broker) return "—";
  const person =
    (broker.users || []).find(
      (u) => u.fullName.trim() && !isSectionLeadEmail(u.email)
    ) || (broker.users || [])[0];
  return person?.fullName.trim() || broker.name || "—";
}

function displayBrokerMarket(row: PriceRow, lang: "en" | "so") {
  const assigned = row.broker?.assignedMarkets?.map((link) => link.market?.name) || [];
  const candidates = [
    row.market?.name,
    row.broker?.market?.name,
    ...assigned,
    row.broker?.location,
    row.marketLocation,
    row.market?.location,
    row.broker?.market?.location,
  ];
  for (const value of candidates) {
    const labeled = livestockMarketDisplayName(value, lang).trim();
    if (labeled && !isPlaceholderMarketName(labeled) && !isPlaceholderMarketName(value)) {
      return labeled;
    }
  }
  return "—";
}

function rowSlug(row: PriceRow): string {
  const slug = (row.category?.slug || "").trim().toLowerCase();
  if (slug) return slug;
  const fromCats = livestockFromHay(
    (row.broker?.categories || []).map((c) => `${c.slug || ""} ${c.name}`).join(" ")
  );
  if (fromCats !== "other") return fromCats;
  const t = (row.animalTypeEnum || "").toUpperCase();
  if (t === "CAMEL") return "geel";
  if (t === "CATTLE") return "loda";
  if (t === "GOAT" || t === "SHEEP") return "arri";
  return "other";
}

function typeLabel(row: PriceRow, lang: "en" | "so") {
  return (
    adminLivestockName(row.animalType?.name, row.animalType?.nameSomali, lang) ||
    row.description ||
    row.animalTypeEnum ||
    "—"
  );
}

function seasonLabel(row: PriceRow) {
  const hay = `${row.fallbackCategory || ""} ${row.description || ""}`.toLowerCase();
  if (hay.includes("sugunto")) return "Sugunto";
  return "Birimo";
}

function ageLabel(row: PriceRow, lang: "en" | "so") {
  if (row.catalogOnly) return "—";
  return ageClassLabel(row.ageClass, lang) || "—";
}

function originLabel(row: PriceRow) {
  if (row.catalogOnly) return "—";
  return originPlaceLabel(row.originPlace) || "—";
}

function formatReportDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function livestockKind(slug: LivestockFilter, categories: Option[], lang: "en" | "so") {
  if (slug === "all") return lang === "so" ? "Dhammaan xoolaha" : "All livestock";
  const cat = categories.find((c) => c.slug === slug);
  if (cat) return adminLivestockName(cat.name, cat.nameSomali, lang) || cat.name;
  if (isLivestockCategorySlug(slug)) {
    return lang === "so" ? LIVESTOCK_COLUMNS[slug].somali : LIVESTOCK_COLUMNS[slug].english;
  }
  return slug;
}

const TAB_TONES: Record<string, { active: string; idle: string }> = {
  all: {
    active: "border-slate-800 bg-slate-800 text-white",
    idle: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  },
  geel: {
    active: "border-orange-500 bg-orange-500 text-white",
    idle: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100",
  },
  loda: {
    active: "border-teal-600 bg-teal-600 text-white",
    idle: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100",
  },
  arri: {
    active: "border-violet-600 bg-violet-600 text-white",
    idle: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  },
};

function tabTone(key: string) {
  return (
    TAB_TONES[key] || {
      active: "border-emerald-700 bg-emerald-700 text-white",
      idle: "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50",
    }
  );
}

function printLivestockReport() {
  const root = document.documentElement;
  root.classList.add("livestock-report-printing");
  let pageStyle = document.getElementById("livestock-print-page-size");
  if (!pageStyle) {
    pageStyle = document.createElement("style");
    pageStyle.id = "livestock-print-page-size";
    pageStyle.textContent = "@page { size: A4 landscape; margin: 0.6cm; }";
    document.head.appendChild(pageStyle);
  }
  const cleanup = () => {
    root.classList.remove("livestock-report-printing");
    pageStyle?.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.setTimeout(() => window.print(), 80);
}

export function LivestockPriceReportsPanel({
  scoped = false,
}: {
  scoped?: boolean;
}) {
  const { t, lang } = useLang();
  const F = TRANSLATIONS.filters;
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [markets, setMarkets] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [marketId, setMarketId] = useState("");
  const [slug, setSlug] = useState<LivestockFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(
    "ALL"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [focusSlugs, setFocusSlugs] = useState<string[]>([]);
  const [brandName, setBrandName] = useState("Livestock broker");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandAddress, setBrandAddress] = useState("");
  const [brokerReportKind, setBrokerReportKind] = useState<BrokerReportKind>("history");
  const [seasonFilter, setSeasonFilter] = useState<"all" | "birimo" | "sugunto">("all");
  const [rateSort, setRateSort] = useState<"high" | "low">("high");

  const loadMeta = useCallback(async () => {
    if (scoped) return;
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/livestock/markets", { cache: "no-store" }),
        fetch("/api/livestock/catalog", { cache: "no-store" }),
      ]);
      const mJson = await mRes.json().catch(() => ({} as { markets?: Option[] }));
      const cJson = await cRes.json().catch(() => ({} as { categories?: Option[] }));
      if (mRes.ok) {
        setMarkets(
          (mJson.markets || [])
            .map((m: Option) => ({ id: m.id, name: m.name }))
            .filter((m: Option) => !isPlaceholderMarketName(m.name))
        );
      }
      if (cRes.ok) setCategories(cJson.categories || []);
    } catch {
      /* keep empty filters */
    }
  }, [scoped]);

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (scoped) params.set("mine", "1");
    if (q && !scoped) params.set("q", q);
    if (marketId) params.set("marketId", marketId);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    try {
      const res = await fetch(`/api/livestock/price-reports?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load reports");
      setRows(json.prices || []);
      if (Array.isArray(json.categories) && json.categories.length) {
        setCategories(json.categories);
      }
      const nextSlugs = Array.isArray(json.focusSlugs)
        ? json.focusSlugs.map((s: unknown) => String(s || "").trim()).filter(Boolean)
        : isLivestockCategorySlug(json.focusSlug)
          ? [json.focusSlug]
          : [];
      if (nextSlugs.length) {
        setFocusSlugs(nextSlugs);
        setSlug((prev) => {
          if (nextSlugs.length === 1) return nextSlugs[0];
          if (prev === "all" || nextSlugs.includes(prev)) return prev;
          return "all";
        });
      } else if (scoped) {
        setFocusSlugs([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [q, marketId, statusFilter, dateFrom, dateTo, scoped]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchDraft.trim()), 280);
    return () => clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!scoped) {
      setBrandName(SYSTEM_NAME);
      setBrandLogo(SYSTEM_LOGO_SRC);
      setBrandAddress("");
      return;
    }
    void fetch("/api/livestock/my-scope", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const brand = d.reportBrand as
          | { name?: string; logoUrl?: string | null; address?: string | null }
          | undefined;
        if (brand?.name?.trim()) setBrandName(brand.name.trim());
        setBrandLogo(brand?.logoUrl?.trim() || null);
        setBrandAddress(brand?.address?.trim() || "");
      })
      .catch(() => setBrandLogo(null));
  }, [scoped]);

  const reportRows = useMemo(() => {
    const kind = scoped ? brokerReportKind : "history";
    let list = rows.filter((row) => {
      if (row.catalogOnly && (dateFrom || dateTo || marketId)) return false;
      if (row.catalogOnly && kind !== "history") return false;
      if (scoped) {
        const st = String(row.status).toUpperCase();
        if (kind === "activity") {
          if (row.catalogOnly) return false;
        } else if (st !== "APPROVED" && !row.catalogOnly) {
          return false;
        }
      }
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (dateFrom || dateTo) {
        if (!inMogadishuDateRange(row.dateRecorded, dateFrom || null, dateTo || null)) {
          return false;
        }
      }
      if (slug !== "all" && rowSlug(row) !== slug) return false;
      if (scoped && (kind === "high_low" || kind === "age_origin") && seasonFilter !== "all") {
        if (seasonLabel(row).toLowerCase() !== seasonFilter) return false;
      }
      if (scoped && q) {
        const needle = q.toLowerCase();
        const hay = [
          typeLabel(row, lang),
          typeLabel(row, "en"),
          typeLabel(row, "so"),
          livestockKind(rowSlug(row), categories, lang),
          livestockKind(rowSlug(row), categories, "en"),
          livestockKind(rowSlug(row), categories, "so"),
          seasonLabel(row),
          displayBrokerMarket(row, lang),
          displayBrokerMarket(row, "en"),
          displayBrokerMarket(row, "so"),
          displayBrokerName(row.broker),
          row.marketLocation,
          row.description,
          row.status,
          row.rejectionReason,
          row.catalogOnly ? "" : String(row.price),
          row.catalogOnly ? "" : formatUsd(row.price),
          row.catalogOnly ? "" : formatReportDate(row.dateRecorded),
          ageClassLabel(row.ageClass, "en"),
          ageClassLabel(row.ageClass, "so"),
          row.ageClass,
          originPlaceLabel(row.originPlace),
          row.originPlace,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    if (scoped && kind === "high_low") {
      list = [...list]
        .filter((r) => !r.catalogOnly)
        .sort((a, b) =>
          rateSort === "high" ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)
        );
    }
    return list;
  }, [
    rows,
    slug,
    statusFilter,
    scoped,
    dateFrom,
    dateTo,
    marketId,
    brokerReportKind,
    seasonFilter,
    rateSort,
    q,
    lang,
    categories,
  ]);

  const activityStats = useMemo(() => {
    if (!scoped || brokerReportKind !== "activity") return null;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const row of reportRows) {
      const st = String(row.status).toUpperCase();
      if (st === "APPROVED") approved += 1;
      else if (st === "PENDING") pending += 1;
      else if (st === "REJECTED") rejected += 1;
    }
    return {
      total: reportRows.length,
      approved,
      pending,
      rejected,
    };
  }, [scoped, brokerReportKind, reportRows]);

  const reportTitle = useMemo(() => {
    if (!scoped) return t("Livestock Price Reports", "Warbixinnada Qiimaha Xoolaha");
    if (brokerReportKind === "high_low") {
      return t("Highest / lowest prices", "Qiimaha ugu sarreeya / ugu hooseeya");
    }
    if (brokerReportKind === "activity") {
      return t("Broker activity", "Dhaqdhaqaaqa broker-ka");
    }
    if (brokerReportKind === "age_origin") {
      return t("Age and origin", "Da'da iyo meesha");
    }
    return t("Livestock Price Reports", "Warbixinnada Qiimaha Xoolaha");
  }, [scoped, brokerReportKind, t]);

  const selectedMarket = markets.find((m) => String(m.id) === marketId);

  const [generatedAt, setGeneratedAt] = useState("");

  useEffect(() => {
    setGeneratedAt(
      new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  async function downloadPdf() {
    if (!reportRows.length) return;
    const createdStamp =
      generatedAt ||
      new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    const createdAt = createdStamp;
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableMod.default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const footerH = 36;
    const logoSrc = scoped ? brandLogo : SYSTEM_LOGO_SRC;
    const logoData = await loadReportLogoJpeg(logoSrc);
    const orgName = scoped ? brandName || SYSTEM_NAME : SYSTEM_NAME;
    const orgAddress = scoped ? brandAddress.trim() : "";
    const headerH = 108;
    const title = scoped
      ? brokerReportKind === "high_low"
        ? rateSort === "high"
          ? "Highest Prices"
          : "Lowest Prices"
        : brokerReportKind === "activity"
          ? "Broker Activity"
          : brokerReportKind === "age_origin"
            ? "Age and Origin"
            : "Livestock Price Report"
      : "Livestock Price Report";
    let createdBy = scoped ? brandName || "Broker" : "Super Admin";
    try {
      const meRes = await fetch("/api/auth/me", {
        credentials: "include",
        headers: authPortalHeaders(scoped ? "broker" : "super"),
      });
      const meData = await meRes.json().catch(() => ({}));
      const name = String(meData?.user?.fullName || "").trim();
      if (name) createdBy = name;
    } catch {
      /* keep fallback */
    }

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
            /* skip */
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
        doc.text(`Created ${createdStamp}`, margin, pageHeight - 14);
        if (orgAddress) {
          doc.text(orgAddress, pageWidth / 2, pageHeight - 14, { align: "center" });
        }
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 14, {
          align: "right",
        });
      }
    };

    const head =
      scoped && brokerReportKind === "activity"
        ? [["#", "Type", "Age", "Livestock", "Category", "Market", "Price", "Status", "Date"]]
        : scoped && brokerReportKind === "age_origin"
          ? [["#", "Type", "Age", "Origin", "Livestock", "Category", "Market", "Price", "Date"]]
          : scoped && brokerReportKind === "high_low"
            ? [["#", "Type", "Age", "Livestock", "Category", "Market", "Price", "Date"]]
            : scoped
              ? [["#", "Type", "Age", "Livestock", "Category", "Market", "Price", "Broker", "Date"]]
              : [["#", "Type", "Livestock", "Category", "Market", "Price", "Broker", "Status", "Date"]];
    const body = reportRows.map((row, i) => {
      const typeName =
        adminLivestockName(row.animalType?.name, row.animalType?.nameSomali, lang) ||
        row.animalTypeEnum ||
        "—";
      if (scoped && brokerReportKind === "activity") {
        return [
          String(i + 1),
          typeName,
          ageLabel(row, lang),
          livestockKind(rowSlug(row), categories, lang),
          seasonLabel(row),
          displayBrokerMarket(row, lang),
          formatUsd(row.price),
          row.status,
          formatReportDate(row.dateRecorded),
        ];
      }
      if (scoped && brokerReportKind === "age_origin") {
        return [
          String(i + 1),
          typeName,
          ageLabel(row, lang),
          originLabel(row),
          livestockKind(rowSlug(row), categories, lang),
          seasonLabel(row),
          displayBrokerMarket(row, lang),
          formatUsd(row.price),
          formatReportDate(row.dateRecorded),
        ];
      }
      if (scoped && brokerReportKind === "high_low") {
        return [
          String(i + 1),
          typeName,
          ageLabel(row, lang),
          livestockKind(rowSlug(row), categories, lang),
          seasonLabel(row),
          displayBrokerMarket(row, lang),
          formatUsd(row.price),
          formatReportDate(row.dateRecorded),
        ];
      }
      if (scoped) {
        return [
          String(i + 1),
          typeName,
          ageLabel(row, lang),
          livestockKind(rowSlug(row), categories, lang),
          seasonLabel(row),
          displayBrokerMarket(row, lang),
          row.catalogOnly ? "—" : formatUsd(row.price),
          displayBrokerName(row.broker),
          row.catalogOnly ? "—" : formatReportDate(row.dateRecorded),
        ];
      }
      return [
        String(i + 1),
        typeName,
        livestockKind(rowSlug(row), categories, lang),
        seasonLabel(row),
        displayBrokerMarket(row, lang),
        row.catalogOnly ? "—" : formatUsd(row.price),
        displayBrokerName(row.broker),
        row.catalogOnly ? "Registered" : row.status,
        row.catalogOnly ? "—" : formatReportDate(row.dateRecorded),
      ];
    });

    autoTable(doc, {
      head,
      body: body.length ? body : [["No records found"]],
      startY: headerH + 14,
      margin: { top: margin, left: margin, right: margin, bottom: footerH + 8 },
      tableWidth: "auto",
      horizontalPageBreak: false,
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
      didDrawPage: (data) => drawChrome(data.pageNumber, doc.getNumberOfPages()),
    });
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      drawChrome(i, total);
    }
    doc.save(`livestock-price-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4 overflow-x-hidden">
      <AdminPageHeader
        title={reportTitle}
        subtitle={
          scoped
            ? brokerReportKind === "high_low"
              ? t(
                  "Your approved prices ranked highest or lowest.",
                  "Qiimahaaga la aqbalay oo la kala saaray sare ama hoose."
                )
              : brokerReportKind === "activity"
                ? t(
                    "How many prices you submitted, approved, pending, or rejected.",
                    "Immisa qiimo aad gelisay, la aqbalay, sugaya, ama la diiday."
                  )
                : brokerReportKind === "age_origin"
                  ? t(
                      "Prices by livestock age and origin place.",
                      "Qiimaha da'da iyo meesha xoolaha."
                    )
                  : t(
                      "Your approved prices. If admin rejects one, fix it from Notifications.",
                      "Qiimahaaga la aqbalay. Haddii admin diido, Notifications ka sax."
                    )
            : t(
                "Approved, pending, and rejected livestock prices by market.",
                "Qiimaha la aqbalay, sugaya, iyo la diiday ee suuqyada."
              )
        }
        icon={FileBarChart2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={!reportRows.length}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0a5240] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#083f31] disabled:opacity-50"
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              PDF
            </button>
            <PrintButton onClick={printLivestockReport} />
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 print:hidden">
        {scoped ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t("Report", "Warbixin")}
              </span>
              <span className="relative block">
                <select
                  value={brokerReportKind}
                  onChange={(e) => {
                    setBrokerReportKind(e.target.value as BrokerReportKind);
                    setSeasonFilter("all");
                  }}
                  className={selectCls}
                  aria-label="Broker report type"
                >
                  <option value="history">{t("Price history", "Taariikhda qiimaha")}</option>
                  <option value="high_low">{t("Highest / lowest", "Sarreeya / hooseeya")}</option>
                  <option value="activity">{t("My activity", "Dhaqdhaqaaqayga")}</option>
                  <option value="age_origin">{t("Age and origin", "Da'da iyo meesha")}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.25} />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t(F.from.en, F.from.so)}
              </span>
              <DateInput
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  setDateFrom(next);
                  if (next && dateTo && next > dateTo) setDateTo(next);
                }}
                className={selectCls}
                aria-label="From date"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t(F.to.en, F.to.so)}
              </span>
              <DateInput
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  setDateTo(next);
                  if (next && dateFrom && dateFrom > next) setDateFrom(next);
                }}
                className={selectCls}
                aria-label="To date"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t(F.search.en, F.search.so)}
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <input
                  value={searchDraft}
                  onChange={(e) => {
                    setSearchDraft(e.target.value);
                    setQ(e.target.value.trim());
                  }}
                  placeholder={t("Type, market, age…", "Nooc, suuq, da'…")}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                />
              </span>
            </label>
            {brokerReportKind === "high_low" || brokerReportKind === "age_origin" ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t("Class", "Heer")}
                </span>
                <span className="relative block">
                  <select
                    value={seasonFilter}
                    onChange={(e) => setSeasonFilter(e.target.value as "all" | "birimo" | "sugunto")}
                    className={selectCls}
                  >
                    <option value="all">{t("All classes", "Dhammaan")}</option>
                    <option value="birimo">{t("First Class", "Birimo")}</option>
                    <option value="sugunto">{t("Second Class", "Sugunto")}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.25} />
                </span>
              </label>
            ) : null}
            {brokerReportKind === "high_low" ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t("Sort", "Kala saar")}
                </span>
                <span className="relative block">
                  <select
                    value={rateSort}
                    onChange={(e) => setRateSort(e.target.value as "high" | "low")}
                    className={selectCls}
                  >
                    <option value="high">{t("Highest", "Ugu sarreeya")}</option>
                    <option value="low">{t("Lowest", "Ugu hooseeya")}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.25} />
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
        {!scoped ? (
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div
            className={cn(
              "flex min-w-0 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15",
              scoped
                ? "order-last ml-auto w-full max-w-md flex-none sm:w-[22rem]"
                : "w-full flex-1"
            )}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQ(searchDraft.trim())}
                placeholder={
                  scoped
                    ? t("Search age, origin, type, market…", "Raadi da'da, meesha, nooc, suuq…")
                    : t("Search market or type…", "Raadi suuq ama nooc…")
                }
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setQ(searchDraft.trim())}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              {t(F.search.en, F.search.so)}
            </button>
          </div>
          <div className="relative w-full min-w-0 sm:w-[13rem]">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {t(F.from.en, F.from.so)}
            </label>
            <DateInput
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                const next = e.target.value;
                setDateFrom(next);
                if (next && dateTo && next > dateTo) setDateTo(next);
              }}
              className={selectCls}
              aria-label="From date"
            />
          </div>
          <div className="relative w-full min-w-0 sm:w-[13rem]">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {t(F.to.en, F.to.so)}
            </label>
            <DateInput
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                const next = e.target.value;
                setDateTo(next);
                if (next && dateFrom && dateFrom > next) setDateFrom(next);
              }}
              className={selectCls}
              aria-label="To date"
            />
          </div>
          {!scoped ? (
          <div className="relative w-full min-w-0 sm:w-[13rem]">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className={selectCls}
              aria-label="Filter by status"
            >
              <option value="ALL">{t(F.allStatuses.en, F.allStatuses.so)}</option>
              <option value="PENDING">{t(F.pending.en, F.pending.so)}</option>
              <option value="APPROVED">{t(F.approved.en, F.approved.so)}</option>
              <option value="REJECTED">{t(F.rejected.en, F.rejected.so)}</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2.25}
            />
          </div>
          ) : null}
          {!scoped && (
            <>
              <div className="relative w-full min-w-0 sm:w-[15rem]">
                <select
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  className={selectCls}
                  aria-label="Filter by market"
                  title={selectedMarket?.name || "All markets"}
                >
                  <option value="">{t(F.allMarkets.en, F.allMarkets.so)}</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {livestockMarketDisplayName(m.name, lang).trim() || m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.25}
                />
              </div>
              <div className="relative w-full shrink-0 sm:w-[15rem]">
                <select
                  value=""
                  onChange={() => undefined}
                  className={selectCls}
                  aria-label="All brokers"
                  title="All brokers"
                >
                  <option value="">{t(F.allBrokers.en, F.allBrokers.so)}</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.25}
                />
              </div>
            </>
          )}
        </div>
        ) : null}
      </div>

      <div className="flex h-9 flex-nowrap items-center gap-1.5 overflow-x-auto print:hidden">
        {(scoped
          ? focusSlugs.length > 1
            ? ["all", ...focusSlugs]
            : focusSlugs.length === 1
              ? focusSlugs
              : ["all"]
          : [
              "all",
              ...categories
                .map((c) => c.slug)
                .filter((s): s is string => Boolean(s)),
            ]
        ).map((key) => {
          const label =
            key === "all" ? "All livestock" : livestockKind(key, categories, lang);
          const active = slug === key;
          const tone = tabTone(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSlug(key)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-[12px] font-bold transition",
                active ? tone.active : tone.idle
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        id="livestock-price-report"
        className="w-full min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div className="livestock-price-report-sheet">
          <header className="livestock-print-letterhead hidden border-b border-emerald-100 px-6 pb-4 pt-5">
            <div className="flex items-center justify-center gap-4">
              {brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandLogo}
                  alt=""
                  className="h-14 w-14 rounded-xl border border-emerald-100 bg-white object-contain p-1"
                />
              ) : null}
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  {scoped ? brandName : SYSTEM_NAME}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Livestock Price Report
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-slate-600">
                  {livestockKind(slug, categories, lang)} · {selectedMarket?.name || "All markets"}
                  {scoped ? "" : " · All brokers"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {scoped ? `${brandName} figures` : "Official admin figures"}
                  {generatedAt ? ` · Created ${generatedAt}` : ""}
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 print:hidden">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-slate-800">
                {scoped ? reportTitle : `${livestockKind(slug, categories, lang)} price report`}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {reportRows.length}{" "}
                {reportRows.length === 1 ? "record" : "records"} shown
              </p>
            </div>
          </div>

          {scoped && activityStats ? (
            <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-4 print:hidden">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t("Total", "Wadarta")}
                </p>
                <p className="text-lg font-black tabular-nums text-slate-900">{activityStats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {t("Approved", "La aqbalay")}
                </p>
                <p className="text-lg font-black tabular-nums text-emerald-900">
                  {activityStats.approved}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  {t("Pending", "Sugaya")}
                </p>
                <p className="text-lg font-black tabular-nums text-amber-900">
                  {activityStats.pending}
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                  {t("Rejected", "La diiday")}
                </p>
                <p className="text-lg font-black tabular-nums text-rose-900">
                  {activityStats.rejected}
                </p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="grid min-h-[22rem] place-items-center print:hidden">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            </div>
          ) : (
            <div className="mmps-table-fit min-h-[22rem]">
              <table className="w-full table-auto border-collapse text-left">
                <colgroup className="print:hidden">
                  <col className="w-[6%]" />
                  <col className="w-[14%]" />
                  {scoped ? <col className="w-[10%]" /> : null}
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                  {!scoped ? <col className="w-[10%]" /> : null}
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-100 px-3 py-3 text-center">#</th>
                    <th className="border-b border-slate-100 px-3 py-3">Type</th>
                    {scoped ? (
                      <th className="border-b border-slate-100 px-3 py-3">Age</th>
                    ) : null}
                    {scoped && brokerReportKind === "age_origin" ? (
                      <th className="border-b border-slate-100 px-3 py-3">
                        {t("Origin", "Meesha")}
                      </th>
                    ) : null}
                    <th className="border-b border-slate-100 px-3 py-3">Livestock</th>
                    <th className="border-b border-slate-100 px-3 py-3">Category</th>
                    <th className="border-b border-slate-100 px-3 py-3">Market</th>
                    <th className="border-b border-slate-100 px-3 py-3">Price</th>
                    {scoped && brokerReportKind === "activity" ? (
                      <th className="border-b border-slate-100 px-3 py-3">Status</th>
                    ) : scoped &&
                      (brokerReportKind === "high_low" || brokerReportKind === "age_origin") ? null : (
                      <th className="border-b border-slate-100 px-3 py-3">Broker</th>
                    )}
                    {!scoped ? (
                      <th className="border-b border-slate-100 px-3 py-3">Status</th>
                    ) : null}
                    <th className="border-b border-slate-100 px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-12 text-center text-sm font-semibold text-slate-400"
                      >
                        No {livestockKind(slug, categories, lang).toLowerCase()} prices in this report.
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((row, i) => (
                      <tr key={`${row.catalogOnly ? "type" : "price"}-${row.id}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-center text-[12px] font-bold tabular-nums text-slate-500">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="whitespace-normal break-words text-[13px] font-bold text-slate-900">
                            {typeLabel(row, lang)}
                          </p>
                        </td>
                        {scoped ? (
                          <td className="whitespace-normal break-words px-3 py-3 align-top text-[13px] font-semibold text-slate-700">
                            {ageLabel(row, lang)}
                          </td>
                        ) : null}
                        {scoped && brokerReportKind === "age_origin" ? (
                          <td className="whitespace-normal break-words px-3 py-3 align-top text-[13px] font-semibold text-slate-700">
                            {originLabel(row)}
                          </td>
                        ) : null}
                        <td className="px-3 py-3 align-top">
                          <p className="whitespace-normal break-words text-[13px] font-semibold text-slate-700">
                            {livestockKind(rowSlug(row), categories, lang)}
                          </p>
                        </td>
                        <td className="whitespace-normal break-words px-3 py-3 align-top text-[13px] font-semibold text-slate-700">
                          {seasonLabel(row)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="whitespace-normal break-words text-[13px] font-semibold text-slate-700">
                            {displayBrokerMarket(row, lang)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top text-[13px] font-black tabular-nums text-slate-900">
                          {row.catalogOnly
                            ? "—"
                            : row.currency === "USD"
                              ? formatUsd(row.price)
                              : `${row.currency} ${row.price.toLocaleString()}`}
                        </td>
                        {scoped && brokerReportKind === "activity" ? (
                          <td className="px-3 py-3 align-top">
                            <StatusBadge status={row.status} />
                            {row.status === "REJECTED" && row.rejectionReason ? (
                              <p className="mt-1 max-w-[14rem] whitespace-normal break-words text-[11px] font-semibold text-rose-600">
                                {row.rejectionReason}
                              </p>
                            ) : null}
                          </td>
                        ) : scoped &&
                          (brokerReportKind === "high_low" ||
                            brokerReportKind === "age_origin") ? null : (
                          <td className="px-3 py-3 align-top">
                            <p className="whitespace-normal break-words text-[13px] font-medium text-slate-600">
                              {displayBrokerName(row.broker)}
                            </p>
                          </td>
                        )}
                        {!scoped ? (
                        <td className="px-3 py-3 align-top">
                          <StatusBadge status={row.status} />
                          {row.status === "REJECTED" && row.rejectionReason ? (
                            <p className="mt-1 max-w-[14rem] whitespace-normal break-words text-[11px] font-semibold text-rose-600">
                              {row.rejectionReason}
                            </p>
                          ) : null}
                        </td>
                        ) : null}
                        <td className="whitespace-nowrap px-3 py-3 align-top text-[12px] font-medium text-slate-500">
                          {row.catalogOnly ? "—" : formatReportDate(row.dateRecorded)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <footer className="livestock-print-letterhead hidden border-t border-emerald-100 px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Muqdishu Market Price System · Confidential official report
          </footer>
        </div>
      </div>
    </div>
  );
}
