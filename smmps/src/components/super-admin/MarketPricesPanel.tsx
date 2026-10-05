"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Search,
  Download,
  Beef,
  Droplets,
  Zap,
  Building2,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type {
  CompanyRecord,
  MarketPriceStats,
  PriceRow,
} from "@/lib/super-admin-service";
import {
  AdminPageHeader,
  KpiCard,
} from "@/components/super-admin/AdminPagePrimitives";
import { LivestockLogo } from "@/components/super-admin/LivestockLogo";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import { formatLabel, cn } from "@/lib/utils";
import { providerMetaForSlug } from "@/lib/company-scope";

const SECTOR_META = {
  Livestock: {
    chip: "bg-violet-50/80 text-violet-800 ring-1 ring-violet-100",
    icon: Beef,
    iconBg: "from-violet-500 to-purple-600",
  },
  Water: {
    chip: "bg-sky-50/80 text-sky-800 ring-1 ring-sky-100",
    icon: Droplets,
    iconBg: "from-sky-500 to-cyan-600",
  },
  Electricity: {
    chip: "bg-amber-50/80 text-amber-800 ring-1 ring-amber-100",
    icon: Zap,
    iconBg: "from-amber-500 to-orange-500",
  },
} as const;

type Sector = keyof typeof SECTOR_META;

function trendForRow(
  row: PriceRow,
  all: PriceRow[]
): { pct: number; direction: "up" | "down" | "flat" } {
  const prior = all.find(
    (r) =>
      r.id !== row.id &&
      r.sector === row.sector &&
      r.item === row.item &&
      r.provider === row.provider &&
      r.dateRecorded < row.dateRecorded
  );
  if (!prior || prior.price <= 0) return { pct: 0, direction: "flat" };
  const pct = ((row.price - prior.price) / prior.price) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, direction: "flat" };
  return {
    pct: Math.round(pct * 10) / 10,
    direction: pct > 0 ? "up" : "down",
  };
}

function matchCompany(
  provider: string,
  companies: CompanyRecord[],
  sector?: PriceRow["sector"]
): CompanyRecord | null {
  const p = provider.trim().toLowerCase();
  if (!p) return null;

  const pool = sector
    ? companies.filter((c) => c.sector === sector)
    : companies;

  const exact = pool.find(
    (c) => c.name.toLowerCase() === p || c.acronym.toLowerCase() === p
  );
  if (exact) return exact;

  if (
    sector === "Livestock" ||
    p.includes("livestock") ||
    p === "mogadishu market"
  ) {
    return (
      companies.find((c) => c.id === "livestock-market") ?? null
    );
  }

  return (
    pool.find((c) => {
      const name = c.name.toLowerCase();
      const acr = c.acronym.toLowerCase();
      return (
        name.includes(p) ||
        p.includes(name) ||
        (acr.length >= 3 && (p.includes(acr) || acr.includes(p)))
      );
    }) ?? null
  );
}

function itemServiceLabel(row: PriceRow): string {
  if (row.sector === "Water") return "Boreholes";
  if (row.sector === "Electricity") return "Grid Electricity & Solar Power";
  if (row.sector === "Livestock") {
    switch (row.item.toUpperCase()) {
      case "CAMEL":
        return "Camel";
      case "CATTLE":
      case "COW":
        return "Cattle";
      case "GOAT":
        return "Goat";
      case "SHEEP":
        return "Sheep";
      default:
        return formatLabel(row.item);
    }
  }
  return formatLabel(row.item);
}

function isDisplayedPriceRow(row: PriceRow): boolean {
  return row.sector === "Livestock";
}

export function MarketPricesPanel({
  rows,
  companies,
  stats,
}: {
  rows: PriceRow[];
  companies: CompanyRecord[];
  stats: MarketPriceStats;
}) {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [sector] = useState<Sector | "ALL">("Livestock");
  const [animal, setAnimal] = useState<"ALL" | "CAMEL" | "CATTLE" | "GOAT">("ALL");
  const [company, setCompany] = useState("ALL");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const companyOptions = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (!isDisplayedPriceRow(r)) return false;
      if (sector !== "ALL" && r.sector !== sector) return false;
      if (animal !== "ALL") {
        const item = r.item.toUpperCase();
        if (animal === "CATTLE") {
          if (item !== "CATTLE" && item !== "COW") return false;
        } else if (item !== animal) {
          return false;
        }
      }
      if (company !== "ALL") {
        const rowCompany = matchCompany(r.provider, companies, r.sector);
        if (!rowCompany || rowCompany.id !== company) return false;
      }
      if (!q) return true;
      const serviceLabel = itemServiceLabel(r).toLowerCase();
      return (
        serviceLabel.includes(q) ||
        r.item.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q) ||
        (matchCompany(r.provider, companies, r.sector)?.acronym
          .toLowerCase()
          .includes(q) ?? false)
      );
    });
  }, [rows, appliedQuery, sector, animal, company, companies]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * perPage,
    safePage * perPage + perPage
  );
  const showingFrom = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const showingTo = Math.min(filtered.length, (safePage + 1) * perPage);

  const kpi = useMemo(
    () => ({
      totalCompanies: companies.filter((c) => c.sector === "Livestock").length,
      totalUpdates: rows.filter((r) => r.sector === "Livestock").length,
      livestockCategories: stats.livestockCategories,
    }),
    [companies, rows, stats]
  );

  function applySearch() {
    setAppliedQuery(query);
    setPage(0);
  }

  function exportCsv() {
    const header = [
      "Company",
      "Item / Service",
      "Category",
      "Unit",
      "Price",
      "Date",
    ];
    const lines = filtered.map((r) =>
      [
        matchCompany(r.provider, companies, r.sector)?.acronym ?? r.provider,
        itemServiceLabel(r),
        r.sector,
        r.unit,
        r.price.toFixed(2),
        r.dateRecorded.slice(0, 10),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filterSelectClass =
    "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <AdminPageHeader
        title="Market Prices"
        subtitle="Approved livestock prices. Super Admin must accept broker submissions before they appear here."
        icon={CircleDollarSign}
      />

      {/* KPI cards — padding so hover shadows are not clipped at the edges */}
      <div className="-mx-1 px-1 py-1">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <KpiCard
          label="Total Companies"
          value={kpi.totalCompanies}
          hint="Registered companies"
          icon={Building2}
          tone="indigo"
        />
        <KpiCard
          label="Total Price Updates"
          value={kpi.totalUpdates}
          hint="Across all sectors"
          icon={CircleDollarSign}
          tone="amber"
        />
        <KpiCard
          label="Livestock Prices"
          value={kpi.livestockCategories}
          hint="Categories"
          icon={Beef}
          tone="emerald"
        />
        </div>
      </div>

      {/* Filters — same style as Pending Approvals */}
      <div className="w-full rounded-2xl border border-blue-100/80 bg-gradient-to-br from-white via-white to-blue-50/40 p-3  ring-1 ring-blue-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 xl:flex-nowrap">
          <div className="flex min-w-0 w-full flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-600/15 xl:w-auto">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-700" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="SEARCH"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-blue-700 px-4 text-[13px] font-bold text-white transition hover:bg-blue-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          <div className="relative w-full shrink-0 sm:w-[9rem] lg:w-[10rem]">
            <select
              value={animal}
              onChange={(e) => {
                setAnimal(e.target.value as "ALL" | "CAMEL" | "CATTLE" | "GOAT");
                setPage(0);
              }}
              className={filterSelectClass}
              aria-label="Filter by livestock type"
            >
              <option value="ALL">All types</option>
              <option value="CAMEL">Camel</option>
              <option value="CATTLE">Cattle</option>
              <option value="GOAT">Goat</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>

          <div className="relative w-full shrink-0 sm:w-[9.5rem] lg:w-[10.5rem]">
            <select
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setPage(0);
              }}
              className={filterSelectClass}
              aria-label="Filter by company"
            >
              <option value="ALL">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 sm:w-auto"
          >
            <Download className="h-4 w-4" strokeWidth={2.25} />
            Export
          </button>
        </div>
      </div>

      {/* Latest prices */}
      <section
        id="all-prices"
        className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white "
      >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-slate-800">
                Livestock Prices
              </h3>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                Published after Super Admin approval
              </p>
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 p-0.5">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  view === "table"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  view === "cards"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {pageRows.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm font-semibold text-slate-400">
              No approved livestock prices yet. Broker submissions appear here after Super Admin accepts them.
            </p>
          ) : view === "table" ? (
            <div className="mmps-table-scroll">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-2 py-3.5 text-center">#</th>
                  <th className="px-3 py-3.5 text-left sm:px-4">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      <span className="h-14 w-14 shrink-0" aria-hidden />
                      <span>Company</span>
                    </div>
                  </th>
                  <th className="px-2 py-3.5 text-center">Item / Service</th>
                  <th className="px-2 py-3.5 text-center">Price (USD)</th>
                  <th className="px-2 py-3.5 text-center">Date</th>
                  <th className="px-2 py-3.5 text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((r, rowIndex) => {
                  const co = matchCompany(r.provider, companies, r.sector);
                  const t = trendForRow(r, rows);
                  const rowNumber = safePage * perPage + rowIndex + 1;
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50/50">
                      <td className="px-2 py-4 text-center sm:px-3">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-[12px] font-bold tabular-nums text-slate-600">
                          {rowNumber}
                        </span>
                      </td>
                      <td className="px-3 py-4 sm:px-4">
                        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                          {co ? (
                            <CompanyLogo company={co} />
                          ) : (
                            <CompanyLogoPlaceholder sector={r.sector} />
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-[13px] font-bold leading-snug text-slate-900">
                              {co?.acronym ?? r.provider}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <p className="truncate text-sm font-black text-slate-800">
                          {itemServiceLabel(r)}
                        </p>
                        <p className="truncate text-[10px] font-semibold text-slate-400">
                          {r.sector}
                        </p>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <p className="text-sm font-black text-blue-700">
                          ${r.price.toFixed(2)}
                        </p>
                        <p className="truncate text-[10px] font-semibold text-slate-400">
                          {r.unit}
                        </p>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <p className="text-xs font-black text-slate-700">
                          {new Date(r.dateRecorded).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {new Date(r.dateRecorded).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex justify-center">
                          <TrendBadge {...t} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div
              id="by-category"
              className="grid gap-3 p-4 sm:grid-cols-2"
            >
              {pageRows.map((r) => {
                const co = matchCompany(r.provider, companies, r.sector);
                const t = trendForRow(r, rows);
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SectorBadge sector={r.sector} />
                      <TrendBadge {...t} />
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-900">
                      {itemServiceLabel(r)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {co?.acronym ?? r.provider}
                    </p>
                    <p className="mt-3 text-xl font-black text-blue-700">
                      ${r.price.toFixed(2)}
                      <span className="ml-1 text-[11px] font-bold text-slate-400">
                        {r.unit}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 px-4 py-3">
            <p className="text-[12px] font-medium text-slate-500">
              Showing {showingFrom} to {showingTo} of {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold",
                    safePage === i
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 rounded-lg border border-slate-200 px-2 text-[12px] font-medium text-slate-600"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </section>
    </div>
  );
}

function resolveCompanyImage(company: CompanyRecord): string | null {
  if (company.image?.trim()) return company.image.trim();
  if (company.sector === "Livestock" || company.id === "livestock-market") {
    return LIVESTOCK_MARKET_LOGO;
  }
  const meta =
    providerMetaForSlug(company.id) ??
    (company.href
      ? providerMetaForSlug(company.href.split("/").filter(Boolean).pop() || "")
      : null);
  return meta?.image?.trim() || null;
}

function CompanyLogo({ company }: { company: CompanyRecord }) {
  const image = resolveCompanyImage(company);

  if (image) {
    return (
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
        <Image
          src={image}
          alt={company.acronym}
          width={112}
          height={112}
          quality={100}
          unoptimized={image.startsWith("/")}
          className="h-full w-full object-contain object-center"
        />
      </span>
    );
  }

  return <CompanyLogoPlaceholder sector={company.sector} />;
}

function CompanyLogoPlaceholder({ sector }: { sector: Sector }) {
  if (sector === "Livestock") {
    return <LivestockLogo size="lg" alt="Livestock" />;
  }
  const Icon = sector === "Water" ? Droplets : Zap;
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function SectorBadge({ sector }: { sector: Sector }) {
  if (sector === "Livestock") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-violet-50/80 px-2 py-1.5 ring-1 ring-violet-100">
        <LivestockLogo size="sm" alt="Livestock" />
        <span className="pr-0.5 text-[11px] font-bold tracking-tight text-violet-800">
          Livestock
        </span>
      </span>
    );
  }
  const meta = SECTOR_META[sector];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-2 py-1.5",
        meta.chip
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
          meta.iconBg
        )}
      >
        <meta.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="pr-0.5 text-[11px] font-bold tracking-tight">
        {sector}
      </span>
    </span>
  );
}

function TrendBadge({
  pct,
  direction,
}: {
  pct: number;
  direction: "up" | "down" | "flat";
}) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const up = direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
        up ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}
