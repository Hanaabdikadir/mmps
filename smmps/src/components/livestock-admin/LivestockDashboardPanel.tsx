"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beef,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  Store,
  Users,
} from "lucide-react";
import { AdminPageHeader, KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { LIVESTOCK_PHOTO_URLS, adminLivestockName } from "@/lib/livestock-data";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { livestockSectionTitle, livestockSpeciesLabel } from "@/lib/register-flow";
import { useLang } from "@/lib/language-context";

type DashView = "brokers" | "markets" | "geel" | "loda" | "arri";
type SortOrder = "newest" | "oldest" | "name";

type DashboardData = {
  kpis: {
    totalBrokers: number;
    totalMarkets: number;
    categoryBrokers: Record<string, number>;
  };
};

type Option = { id: number; name: string; slug?: string };
type Broker = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  livestockFocus?: string | null;
  markets: Option[];
  categories: Option[];
};
type Market = {
  id: number;
  name: string;
  location: string | null;
  status: string;
  createdAt?: string;
  categories: Option[];
  assignedBrokers: { id: number; name: string }[];
};

const filterSelectClass =
  "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

function categoryTone(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) return "text-orange-700";
  if (upper.includes("SHEEP") || upper.includes("GOAT") || upper.includes("ARI")) {
    return "text-violet-700";
  }
  return "text-emerald-700";
}

function categoryRank(name: string, slug?: string) {
  const hay = `${slug || ""} ${name}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return 0;
  if (hay.includes("loda") || hay.includes("cattle")) return 1;
  return 2;
}

function CategoryLine({ categories }: { categories: Option[] }) {
  const { lang } = useLang();
  if (!categories.length) {
    return <span className="text-[12px] font-medium text-slate-400">None</span>;
  }
  const ordered = [...categories].sort(
    (a, b) => categoryRank(a.name, a.slug) - categoryRank(b.name, b.slug)
  );
  return (
    <div className="flex flex-nowrap items-center justify-center gap-2 overflow-hidden">
      {ordered.map((c) => (
        <span key={c.id} className={cn("shrink-0 text-[12px] font-semibold", categoryTone(c.name))}>
          {adminLivestockName(c.name, undefined, lang)}
        </span>
      ))}
    </div>
  );
}

function brokerSectionCategories(broker: Broker): Option[] {
  if (broker.categories.length) return broker.categories;
  const species = livestockSpeciesLabel(broker.livestockFocus, broker.name);
  const title = livestockSectionTitle(species);
  if (!title) return [];
  const slug =
    species === "Camel" ? "geel" : species === "Cattle" ? "loda" : "arri";
  return [{ id: 0, name: title, slug }];
}

function marketLine(markets: Option[], lang: "en" | "so") {
  const names = markets
    .map((m) => livestockMarketDisplayName(m.name, lang).trim() || m.name)
    .filter(Boolean);
  if (!names.length) {
    return <span className="text-[12px] text-slate-400">None</span>;
  }
  return (
    <div className="flex flex-nowrap items-center justify-center gap-2 overflow-hidden">
      {names.map((name) => (
        <span key={name} className="shrink-0 text-[12px] font-semibold text-slate-700">
          {name}
        </span>
      ))}
    </div>
  );
}

function matchesSlug(haystack: string, slug: "geel" | "loda" | "arri") {
  const hay = haystack.toLowerCase();
  if (slug === "geel") return hay.includes("geel") || hay.includes("camel");
  if (slug === "loda") return hay.includes("loda") || hay.includes("cattle");
  return hay.includes("arri") || hay.includes("goat") || hay.includes("sheep") || hay.includes("ari");
}

function brokerHasSlug(broker: Broker, slug: "geel" | "loda" | "arri") {
  if (broker.categories.some((c) => matchesSlug(`${c.slug || ""} ${c.name}`, slug))) {
    return true;
  }
  return matchesSlug(`${broker.livestockFocus || ""} ${broker.name}`, slug);
}

function animalPhoto(broker: Broker) {
  const hay = `${broker.livestockFocus || ""} ${broker.name} ${broker.categories.map((c) => `${c.slug || ""} ${c.name}`).join(" ")}`.toLowerCase();
  if (matchesSlug(hay, "geel")) return LIVESTOCK_PHOTO_URLS.geel;
  if (matchesSlug(hay, "arri")) return LIVESTOCK_PHOTO_URLS.arri;
  if (matchesSlug(hay, "loda")) return LIVESTOCK_PHOTO_URLS.loda;
  return LIVESTOCK_PHOTO_URLS.marketHero;
}

function stamp(iso?: string) {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

const VIEW_META: Record<DashView, { title: string; noun: [string, string] }> = {
  brokers: { title: "Livestock brokers", noun: ["broker", "brokers"] },
  markets: { title: "Livestock markets", noun: ["market", "markets"] },
  geel: { title: "Geelka brokers", noun: ["broker", "brokers"] },
  loda: { title: "Lo'da brokers", noun: ["broker", "brokers"] },
  arri: { title: "Arriga brokers", noun: ["broker", "brokers"] },
};

export function LivestockDashboardPanel() {
  const { lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<DashView>("brokers");
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [dashRes, brokerRes, marketRes] = await Promise.all([
        fetch("/api/livestock/dashboard", { cache: "no-store" }),
        fetch("/api/livestock/brokers", { cache: "no-store" }),
        fetch("/api/livestock/markets", { cache: "no-store" }),
      ]);
      const dashJson = await dashRes.json().catch(() => null);
      const brokerJson = await brokerRes.json().catch(() => null);
      const marketJson = await marketRes.json().catch(() => null);
      const failed = [dashRes, brokerRes, marketRes].filter((r) => !r.ok);
      if (failed.length) {
        setLoadError(
          dashJson?.error ||
            brokerJson?.error ||
            marketJson?.error ||
            "Could not load livestock data from the database."
        );
      }
      if (dashRes.ok && dashJson) setData(dashJson);
      if (brokerRes.ok) setBrokers(brokerJson.brokers || []);
      if (marketRes.ok) {
        setMarkets(
          (marketJson.markets || []).filter((m: Market) => !isPlaceholderMarketName(m.name))
        );
      }
    } catch {
      setLoadError("Could not load livestock data from the database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = () => {
    setQ(searchDraft.trim());
    setPage(0);
  };

  const selectView = (next: DashView) => {
    setView(next);
    setPage(0);
    setStatusFilter("ALL");
  };

  const kpis = data?.kpis;
  const meta = VIEW_META[view];
  const isBrokerView = view !== "markets";

  const filteredBrokers = useMemo(() => {
    const query = q.toLowerCase();
    return brokers
      .filter((b) => {
        if (view === "geel" || view === "loda" || view === "arri") {
          if (!brokerHasSlug(b, view)) return false;
        }
        if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
        if (!query) return true;
        return `${b.name} ${b.email || ""} ${b.phone || ""} ${b.markets.map((m) => m.name).join(" ")}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sortOrder === "name") return a.name.localeCompare(b.name);
        const diff = stamp(a.createdAt) - stamp(b.createdAt);
        return sortOrder === "oldest" ? diff : -diff;
      });
  }, [brokers, q, sortOrder, statusFilter, view]);

  const filteredMarkets = useMemo(() => {
    const query = q.toLowerCase();
    return markets
      .filter((m) => {
        if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
        if (!query) return true;
        return m.name.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sortOrder === "name") return a.name.localeCompare(b.name);
        const diff = stamp(a.createdAt) - stamp(b.createdAt);
        return sortOrder === "oldest" ? diff : -diff;
      });
  }, [markets, q, sortOrder, statusFilter]);

  const rows = view === "markets" ? filteredMarkets : filteredBrokers;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * perPage, safePage * perPage + perPage);
  const showingFrom = rows.length === 0 ? 0 : safePage * perPage + 1;
  const showingTo = Math.min(rows.length, (safePage + 1) * perPage);

  return (
    <div className="relative mx-auto w-full max-w-none space-y-4 overflow-x-hidden">
      <AdminPageHeader
        title="Livestock Dashboard"
        subtitle="Click a card to review brokers or markets below."
        icon={Beef}
      />

      {loadError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {loadError}
        </p>
      ) : null}

      <div className="flex w-full flex-wrap gap-2 sm:gap-3 xl:flex-nowrap">
        <div className="min-w-[9.5rem] flex-1">
          <KpiCard
            label="Total Brokers"
            value={kpis?.totalBrokers ?? 0}
            hint="All brokers"
            icon={Users}
            tone="emerald"
            selected={view === "brokers"}
            onClick={() => selectView("brokers")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1">
          <KpiCard
            label="Livestock Markets"
            value={kpis?.totalMarkets ?? 0}
            hint="Assigned markets"
            icon={Store}
            tone="amber"
            selected={view === "markets"}
            onClick={() => selectView("markets")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1">
          <KpiCard
            label="Geelka Brokers"
            value={kpis?.categoryBrokers?.geel ?? 0}
            hint="Geel"
            icon={Beef}
            tone="orange"
            selected={view === "geel"}
            onClick={() => selectView("geel")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1">
          <KpiCard
            label="Lo'da Brokers"
            value={kpis?.categoryBrokers?.loda ?? 0}
            hint="Lo'"
            icon={Beef}
            tone="emerald"
            selected={view === "loda"}
            onClick={() => selectView("loda")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1">
          <KpiCard
            label="Arriga Brokers"
            value={kpis?.categoryBrokers?.arri ?? 0}
            hint="Ari"
            icon={Beef}
            tone="cyan"
            selected={view === "arri"}
            onClick={() => selectView("arri")}
          />
        </div>
      </div>

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5">
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 w-full flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="SEARCH"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-3 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden min-[400px]:inline">Search</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:flex lg:shrink-0">
            <div className="relative w-full lg:w-[10rem]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className={filterSelectClass}
                aria-label="Filter by status"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                style={{ right: 5 }}
                strokeWidth={2.25}
              />
            </div>
            <div className="relative w-full lg:w-[10rem]">
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as SortOrder);
                  setPage(0);
                }}
                className={filterSelectClass}
                aria-label="Sort records"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                style={{ right: 5 }}
                strokeWidth={2.25}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">{meta.title}</p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {rows.length} {rows.length === 1 ? meta.noun[0] : meta.noun[1]} shown
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                viewMode === "list" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                viewMode === "grid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="grid min-h-[22vh] place-items-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          </div>
        ) : viewMode === "grid" ? (
          <DashboardGrid
            view={view}
            brokers={isBrokerView ? (pageRows as Broker[]) : []}
            markets={view === "markets" ? (pageRows as Market[]) : []}
            emptyLabel={`No ${meta.noun[1]} match the current filters.`}
          />
        ) : (
          <DashboardTable
            view={view}
            brokers={isBrokerView ? (pageRows as Broker[]) : []}
            markets={view === "markets" ? (pageRows as Market[]) : []}
            emptyLabel={`No ${meta.noun[1]} match the current filters.`}
            startIndex={showingFrom}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p className="text-[12px] font-medium text-slate-500">
            Showing {showingFrom} to {showingTo} of {rows.length} results
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
                  safePage === i ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50"
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
            {[7, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function DashboardTable({
  view,
  brokers,
  markets,
  emptyLabel,
  startIndex,
}: {
  view: DashView;
  brokers: Broker[];
  markets: Market[];
  emptyLabel: string;
  startIndex: number;
}) {
  const { lang } = useLang();
  if (view === "markets") {
    return (
      <div className="mmps-table-fit">
        <table className="w-full table-fixed border-collapse text-center">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[34%]" />
            <col className="w-[34%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="border-b border-slate-100 px-3 py-3.5">#</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Market</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Categories</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Brokers</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.length === 0 ? (
              <EmptyRow cols={5} label={emptyLabel} />
            ) : (
              markets.map((market, i) => (
                <tr key={market.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-3.5 text-[12px] font-bold tabular-nums text-slate-500">
                    {String(startIndex + i).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {livestockMarketDisplayName(market.name, lang).trim() || market.name}
                    </p>
                  </td>
                  <td className="px-3 py-3.5">
                    <CategoryLine categories={market.categories} />
                  </td>
                  <td className="px-3 py-3.5 text-[13px] font-semibold text-slate-700">
                    {market.assignedBrokers.length}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={market.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mmps-table-fit">
        <table className="w-full table-fixed border-collapse text-center">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[30%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="border-b border-slate-100 px-3 py-3.5">#</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Broker</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Markets</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Categories</th>
              <th className="border-b border-slate-100 px-3 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {brokers.length === 0 ? (
              <EmptyRow cols={5} label={emptyLabel} />
            ) : (
              brokers.map((broker, i) => (
                <tr key={broker.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-3.5 text-[12px] font-bold tabular-nums text-slate-500">
                    {String(startIndex + i).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="inline-flex max-w-full items-center gap-3 text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={animalPhoto(broker)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">{broker.name}</p>
                        <p className="truncate text-[11px] font-medium text-slate-500">
                          {broker.email || "No email"}
                        </p>
                        <p className="truncate text-[11px] font-medium text-slate-400">
                          {broker.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    {marketLine(broker.markets, lang)}
                  </td>
                  <td className="px-3 py-3.5">
                    <CategoryLine categories={brokerSectionCategories(broker)} />
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={broker.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </div>
  );
}

function DashboardGrid({
  view,
  brokers,
  markets,
  emptyLabel,
}: {
  view: DashView;
  brokers: Broker[];
  markets: Market[];
  emptyLabel: string;
}) {
  const { lang } = useLang();
  const empty = view === "markets" ? !markets.length : !brokers.length;
  if (empty) {
    return <p className="px-6 py-12 text-center text-sm font-semibold text-slate-400">{emptyLabel}</p>;
  }

  if (view === "markets") {
    return (
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {markets.map((market) => (
          <article key={market.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[14px] font-bold text-slate-900">
                {livestockMarketDisplayName(market.name, lang).trim() || market.name}
              </p>
              <StatusBadge status={market.status} />
            </div>
            <div className="mt-3">
              <CategoryLine categories={market.categories} />
            </div>
            <p className="mt-3 text-[12px] font-medium text-slate-500">
              {market.assignedBrokers.length} brokers
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {brokers.map((broker) => (
        <article key={broker.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={animalPhoto(broker)}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-emerald-100"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[14px] font-bold text-slate-900">{broker.name}</p>
                <StatusBadge status={broker.status} />
              </div>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">{broker.email || "No email"}</p>
              <div className="mt-2">{marketLine(broker.markets, lang)}</div>
              <div className="mt-1.5">
                <CategoryLine categories={brokerSectionCategories(broker)} />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
        {label}
      </td>
    </tr>
  );
}
