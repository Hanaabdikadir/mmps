"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Beef,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Droplets,
  Eye,
  FileText,
  Search,
  ShieldCheck,
  ShieldX,
  X,
  Zap,
} from "lucide-react";
import type {
  PendingMarketPrice,
  PendingPriceSector,
} from "@/lib/super-admin-service";
import { formatCurrency, formatLabel, cn } from "@/lib/utils";
import { formatDateTime } from "@/components/super-admin/approval-helpers";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";

type Toast = {
  id: string;
  title: string;
  detail: string;
  tone: "ok" | "warn" | "err" | "info";
};

const SECTOR_META: Record<
  PendingPriceSector,
  { chip: string; icon: typeof Droplets }
> = {
  Water: {
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    icon: Droplets,
  },
  Electricity: {
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    icon: Zap,
  },
  Livestock: {
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    icon: Beef,
  },
};

export function PendingPricesPanel({
  initialPrices,
  livestockOnly = false,
}: {
  initialPrices: PendingMarketPrice[];
  livestockOnly?: boolean;
}) {
  const router = useRouter();
  const [prices, setPrices] = useState(initialPrices);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastsMounted, setToastsMounted] = useState(false);

  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<PendingPriceSector | "ALL">(
    livestockOnly ? "Livestock" : "ALL"
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "price">(
    "newest"
  );
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingMarketPrice | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => setToastsMounted(true), []);
  useEffect(() => setPrices(initialPrices), [initialPrices]);

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(id);
  }, [router]);

  function pushToast(title: string, detail: string, tone: Toast["tone"] = "info") {
    const id = crypto.randomUUID();
    setToasts((t) => [...t.slice(-2), { id, title, detail, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2000);
  }

  const stats = useMemo(() => {
    const livestock = prices.filter((p) => p.sector === "Livestock").length;
    return {
      total: prices.length,
      livestock,
    };
  }, [prices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = prices.filter((p) => {
      if (sectorFilter !== "ALL" && p.sector !== sectorFilter) return false;
      if (!q) return true;
      return (
        p.provider.toLowerCase().includes(q) ||
        p.submittedBy.toLowerCase().includes(q) ||
        p.item.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortOrder === "price") return b.price - a.price;
      return sortOrder === "newest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });
    return list;
  }, [prices, query, sectorFilter, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * perPage, safePage * perPage + perPage);
  const showingFrom = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const showingTo = Math.min(filtered.length, (safePage + 1) * perPage);

  const active = prices.find((p) => p.id === activeId) ?? null;

  async function decide(
    row: PendingMarketPrice,
    action: "APPROVED" | "REJECTED",
    rejectionReason?: string
  ) {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/super-admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.recordId,
          type: row.type,
          action,
          rejectionReason: rejectionReason ?? undefined,
          target: "price",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update price");

      setPrices((prev) => prev.filter((p) => p.id !== row.id));
      if (activeId === row.id) setActiveId(null);
      setRejectTarget(null);
      setRejectReason("");

      pushToast(
        action === "APPROVED" ? "Price approved" : "Price rejected",
        action === "APPROVED"
          ? `${row.provider} · ${formatLabel(row.item)} is now live.`
          : `${row.provider} · ${formatLabel(row.item)} was rejected.`,
        action === "APPROVED" ? "ok" : "err"
      );
      router.refresh();
    } catch (e) {
      pushToast(
        "Update failed",
        e instanceof Error ? e.message : "Could not save price decision.",
        "err"
      );
    } finally {
      setBusyId(null);
    }
  }

  const filterSelectClass =
    "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="relative space-y-4">
      {toastsMounted &&
        createPortal(
          <div
            className="pointer-events-none fixed bottom-6 right-6 z-[300] flex w-[min(calc(100vw-2rem),22rem)] flex-col-reverse gap-2.5"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 ",
                  t.tone === "ok" && "border-emerald-200/80",
                  t.tone === "err" && "border-rose-200/80",
                  t.tone === "info" && "border-slate-200"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    t.tone === "ok" && "bg-emerald-50 text-emerald-600",
                    t.tone === "err" && "bg-rose-50 text-rose-600",
                    t.tone === "info" && "bg-sky-50 text-sky-600"
                  )}
                >
                  {t.tone === "ok" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : t.tone === "err" ? (
                    <ShieldX className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-bold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                    {t.detail}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}

      <div className="grid w-full grid-cols-2 gap-2 sm:gap-3">
        <KpiCard
          label="Pending"
          value={stats.total}
          hint="Awaiting review"
          icon={Clock3}
          tone="amber"
          onClick={() => setSectorFilter("ALL")}
        />
        <KpiCard
          label="Livestock"
          value={stats.livestock}
          hint="Broker prices"
          icon={Beef}
          tone="violet"
          onClick={() => setSectorFilter("Livestock")}
        />
      </div>

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQuery(searchDraft)}
                placeholder="Search provider, submitter, item…"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery(searchDraft);
                setPage(0);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          {livestockOnly ? null : (
          <div className="relative w-full sm:w-[10rem]">
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value as PendingPriceSector | "ALL");
                setPage(0);
              }}
              className={filterSelectClass}
              aria-label="Filter by sector"
            >
              <option value="ALL">All Sectors</option>
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Livestock">Livestock</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          )}

          <div className="relative w-full sm:w-[10rem]">
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as typeof sortOrder)
              }
              className={filterSelectClass}
              aria-label="Sort prices"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="price">Sort: Price</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Provider</th>
                <th className="px-4 py-3.5 text-center">Sector</th>
                <th className="px-4 py-3.5">Item</th>
                <th className="px-4 py-3.5 text-right">Price</th>
                <th className="px-4 py-3.5">Submitted by</th>
                <th className="px-4 py-3.5 text-center">Date</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <CircleDollarSign className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      No pending market prices
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      New submissions from Company Admins and Livestock Brokers
                      will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const meta = SECTOR_META[row.sector];
                  const Icon = meta.icon;
                  const rowNumber = safePage * perPage + idx + 1;
                  const busy = busyId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 transition hover:bg-emerald-50/30"
                    >
                      <td className="px-4 py-3.5 text-[12px] font-bold tabular-nums text-slate-500">
                        {rowNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-bold text-slate-900">
                          {row.provider}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          {row.location}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            meta.chip
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {row.sector}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] font-semibold text-slate-700">
                        {formatLabel(row.item)}
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                          {row.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] font-black tabular-nums text-slate-900">
                        {formatCurrency(row.price)}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] font-medium text-slate-600">
                        {row.submittedBy}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[12px] font-medium text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.date)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="View details"
                            disabled={busy}
                            onClick={() => setActiveId(row.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 transition hover:bg-sky-100 disabled:opacity-50"
                          >
                            <Eye className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            title="Approve"
                            disabled={busy}
                            onClick={() => decide(row, "APPROVED")}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            disabled={busy}
                            onClick={() => {
                              setRejectTarget(row);
                              setRejectReason("");
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            <ShieldX className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
            {[7, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Details drawer */}
      {active && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setActiveId(null)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl animate-fade-in-up">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Market price review
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  {active.provider}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {formatLabel(active.item)} · {active.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <DetailRow label="Sector" value={active.sector} />
              <DetailRow
                label="Price"
                value={formatCurrency(active.price)}
              />
              <DetailRow label="Location" value={active.location} />
              <DetailRow label="Submitted by" value={active.submittedBy} />
              <DetailRow label="Date" value={formatDateTime(active.date)} />
              <DetailRow label="Status" value="Pending review" />
              <DetailRow label="Record ID" value={`${active.type}-${active.recordId}`} />
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
              <button
                type="button"
                disabled={busyId === active.id}
                onClick={() => decide(active, "APPROVED")}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                disabled={busyId === active.id}
                onClick={() => {
                  setRejectTarget(active);
                  setRejectReason("");
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[13px] font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
              >
                <ShieldX className="h-4 w-4" />
                Reject
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Reject reason dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            disabled={busyId === rejectTarget.id}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={() => {
              if (busyId !== rejectTarget.id) {
                setRejectTarget(null);
                setRejectReason("");
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white "
          >
            <div className="border-b border-slate-100 px-5 pb-4 pt-5">
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <ShieldX className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-[15px] font-black text-slate-900">
                    Reject market price
                  </h2>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-500">
                    Provide a clear rejection reason for{" "}
                    <span className="font-bold text-slate-700">
                      {rejectTarget.provider}
                    </span>{" "}
                    ({formatLabel(rejectTarget.item)}).
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
                Rejection reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="e.g. Price is outside the accepted tariff range…"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] font-medium text-slate-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 bg-slate-50/80 px-5 py-4">
              <button
                type="button"
                disabled={busyId === rejectTarget.id}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  busyId === rejectTarget.id || rejectReason.trim().length < 3
                }
                onClick={() =>
                  decide(rejectTarget, "REJECTED", rejectReason.trim())
                }
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                {busyId === rejectTarget.id ? "Working…" : "Reject price"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}
