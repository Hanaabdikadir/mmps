"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import type {
  CompanyRecord,
  CompanySector,
  CompanyStatus,
  RegistrationApprovalStats,
} from "@/lib/super-admin-service";
import { compareByCompanySystemOrder } from "@/lib/company-system-order";
import { providerMetaForSlug } from "@/lib/company-scope";
import { realEmail, realPhone } from "@/lib/contact-display";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import type { DeletedRequestRecord } from "@/lib/company-overrides-types";
import { cn } from "@/lib/utils";
import {
  docsFor,
  formatDate,
  formatDateTime,
  isApplicantUploadedAsset,
  profileFor,
  SECTOR_META,
  statusChip,
  statusLabel,
  statusBadgeBox,
  type DisplayStatus,
  type ReviewOverlayStatus,
} from "@/components/super-admin/approval-helpers";
import { ApprovalReviewDrawer } from "@/components/super-admin/ApprovalReviewDrawer";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "DELETED";

type Toast = { id: number; title: string; detail: string; tone: "ok" | "warn" | "err" | "info" };

function selectedPlanLine(company: CompanyRecord) {
  const docs = company.registrationDocuments;
  const name = docs?.plan_name?.trim();
  if (!name) return null;
  const price = docs?.plan_price?.trim();
  return price ? `${name} · $${price}` : name;
}

const EMPTY_STATS: RegistrationApprovalStats = {
  registered: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  deleted: 0,
};

export function PendingApprovalsPanel({
  initialCompanies,
  initialDeletedRequests = [],
  initialStats = EMPTY_STATS,
  hideHeader = false,
}: {
  initialCompanies: CompanyRecord[];
  initialDeletedRequests?: DeletedRequestRecord[];
  initialStats?: RegistrationApprovalStats;
  /** When embedded in ApprovalsWorkspace tabs */
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [companies, setCompanies] = useState(initialCompanies);
  const [deletedRequests, setDeletedRequests] = useState(initialDeletedRequests);
  const [kpis, setKpis] = useState(initialStats);
  const [overlays, setOverlays] = useState<Record<string, ReviewOverlayStatus>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<CompanySector | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name">("newest");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toastsMounted, setToastsMounted] = useState(false);
  const [rejectFor, setRejectFor] = useState<CompanyRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [editReasonFor, setEditReasonFor] = useState<CompanyRecord | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [reasonHistory, setReasonHistory] = useState<
    Array<{
      id: number;
      previousReason: string | null;
      newReason: string;
      changedByName: string;
      createdAt: string;
    }>
  >([]);

  useEffect(() => {
    setToastsMounted(true);
  }, []);

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    setDeletedRequests(initialDeletedRequests);
  }, [initialDeletedRequests]);

  useEffect(() => {
    setKpis(initialStats);
  }, [initialStats]);

  // Keep Pending Approvals live so new register requests appear for Super Admin
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (!menuOpenId) return;
    function onDocClick() {
      setMenuOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenId]);

  function pushToast(title: string, detail: string, tone: Toast["tone"] = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, title, detail, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2000);
  }

  function dismissToast(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function displayStatusFor(c: CompanyRecord): DisplayStatus {
    const o = overlays[c.id];
    if (o) return o;
    return c.status;
  }

  const stats = useMemo(
    () => ({
      total: kpis.registered,
      pending: kpis.pending,
      approved: kpis.approved,
      rejected: kpis.rejected,
      deleted: Math.max(kpis.deleted, deletedRequests.length),
    }),
    [kpis, deletedRequests.length]
  );

  const filteredDeleted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...deletedRequests];
    if (sectorFilter !== "ALL") {
      list = list.filter((r) => r.sector === sectorFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.acronym.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (sortOrder === "name") return a.acronym.localeCompare(b.acronym);
      return sortOrder === "newest"
        ? b.deletedAt.localeCompare(a.deletedAt)
        : a.deletedAt.localeCompare(b.deletedAt);
    });
  }, [deletedRequests, query, sectorFilter, sortOrder]);

  const filtered = useMemo(() => {
    if (statusFilter === "DELETED") return [];

    const q = query.trim().toLowerCase();

    const list = companies.filter((c) => {
      const status = displayStatusFor(c);
      const profile = profileFor(c);

      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (sectorFilter !== "ALL" && c.sector !== sectorFilter) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.acronym.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        profile.contactPerson.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      const bySystem = compareByCompanySystemOrder(a.id, b.id);
      if (bySystem !== 0) return bySystem;
      if (sortOrder === "name") return a.acronym.localeCompare(b.acronym);
      return sortOrder === "newest"
        ? b.registeredOn.localeCompare(a.registeredOn)
        : a.registeredOn.localeCompare(b.registeredOn);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, overlays, query, sectorFilter, statusFilter, sortOrder]);

  const showingDeleted = statusFilter === "DELETED";
  const activeRows = showingDeleted ? filteredDeleted : filtered;
  const pageCount = Math.max(1, Math.ceil(activeRows.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = showingDeleted
    ? []
    : filtered.slice(safePage * perPage, safePage * perPage + perPage);
  const pageDeletedRows = showingDeleted
    ? filteredDeleted.slice(safePage * perPage, safePage * perPage + perPage)
    : [];
  const showingFrom = activeRows.length === 0 ? 0 : safePage * perPage + 1;
  const showingTo = Math.min(activeRows.length, (safePage + 1) * perPage);
  const active = companies.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [query, sectorFilter, statusFilter, sortOrder, perPage]);

  function applySearch() {
    setQuery(searchDraft.trim());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearOverlay(ids: string[]) {
    setOverlays((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  }

  async function decide(
    ids: string[],
    status: CompanyStatus,
    message?: string,
    rejectionReason?: string
  ) {
    const sample = companies.find((c) => ids.includes(c.id));
    try {
      await Promise.all(
        ids.map(async (id) => {
          const row = companies.find((c) => c.id === id);
          const res = await fetch("/api/super-admin/companies", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              status,
              email: row?.email,
              ...(status === "REJECTED"
                ? { rejectionReason: rejectionReason?.trim() || "" }
                : {}),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to update applicant");
        })
      );
    } catch (e) {
      pushToast(
        "Update failed",
        e instanceof Error ? e.message : "Could not save applicant status.",
        "err"
      );
      return false;
    }

    const rejectedAt = new Date().toISOString();
    const pendingBefore = ids.filter(
      (id) =>
        displayStatusFor(companies.find((c) => c.id === id)!) === "PENDING"
    ).length;
    const rejectedBefore = ids.filter(
      (id) =>
        displayStatusFor(companies.find((c) => c.id === id)!) === "REJECTED"
    ).length;
    const approvedBefore = ids.filter(
      (id) =>
        displayStatusFor(companies.find((c) => c.id === id)!) === "APPROVED"
    ).length;

    setCompanies((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? {
              ...c,
              status,
              verification:
                status === "APPROVED"
                  ? "VERIFIED"
                  : status === "PENDING"
                    ? "UNDER_REVIEW"
                    : "NOT_VERIFIED",
              ...(status === "REJECTED"
                ? {
                    rejectionReason: rejectionReason?.trim() || null,
                    rejectedAt,
                    rejectedByName: "Super Admin",
                  }
                : {}),
            }
          : c
      )
    );
    clearOverlay(ids);
    setSelected(new Set());

    if (status === "APPROVED") {
      setKpis((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - pendingBefore),
        rejected: Math.max(0, prev.rejected - rejectedBefore),
        approved: prev.approved + pendingBefore + rejectedBefore,
      }));
      pushToast(
        "Application approved",
        message ||
          `${sample?.acronym ?? "Applicant"} can sign in. Open Approved on this page to view them.`,
        "ok"
      );
    } else if (status === "REJECTED") {
      setKpis((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - pendingBefore),
        approved: Math.max(0, prev.approved - approvedBefore),
        rejected: prev.rejected + pendingBefore + approvedBefore,
      }));
      pushToast(
        "Application rejected",
        message ||
          `${sample?.acronym ?? "Company"} was rejected. The reason is visible on their track dashboard.`,
        "err"
      );
    }

    if (activeId && ids.includes(activeId) && status !== "PENDING") {
      setActiveId(null);
    }
    router.refresh();
    return true;
  }

  async function deleteApplicants(ids: string[]) {
    const sample = companies.find((c) => ids.includes(c.id));
    const ok = await confirm({
      title: ids.length > 1 ? "Delete applicants?" : "Delete applicant?",
      description: `Permanently delete ${
        ids.length > 1
          ? `${ids.length} applicants`
          : sample
            ? `${sample.acronym} (${sample.email})`
            : "this applicant"
      } from the database. This cannot be undone.`,
      confirmLabel: ids.length > 1 ? "Delete applicants" : "Delete applicant",
      tone: "danger",
    });
    if (!ok) return;
    const removed = companies.filter((c) => ids.includes(c.id));

    // Kill focus first — browser focus rings show as a black horizontal flash on delete
    setMenuOpenId(null);
    if (typeof document !== "undefined") {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) activeEl.blur();
    }

    const pendingRemoved = removed.filter(
      (c) => displayStatusFor(c) === "PENDING"
    ).length;
    const rejectedRemoved = removed.filter(
      (c) => displayStatusFor(c) === "REJECTED"
    ).length;
    const approvedRemoved = removed.filter(
      (c) => displayStatusFor(c) === "APPROVED"
    ).length;
    const kpiSnapshot = {
      pendingRemoved,
      rejectedRemoved,
      approvedRemoved,
      total: ids.length,
    };
    setKpis((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - pendingRemoved),
      rejected: Math.max(0, prev.rejected - rejectedRemoved),
      approved: Math.max(0, prev.approved - approvedRemoved),
      deleted: prev.deleted + ids.length,
      registered: Math.max(0, prev.registered - ids.length),
    }));
    setCompanies((prev) => prev.filter((c) => !ids.includes(c.id)));
    setDeletedRequests((prev) => {
      const now = new Date().toISOString();
      const added = removed.map((c) => ({
        id: c.id,
        name: c.name,
        acronym: c.acronym,
        email: c.email,
        phone: c.phone,
        sector: c.sector,
        companyType: c.companyType,
        deletedAt: now,
      }));
      const keys = new Set(added.map((a) => a.email.toLowerCase()));
      return [
        ...added,
        ...prev.filter((p) => !keys.has(p.email.toLowerCase()) && !ids.includes(p.id)),
      ];
    });
    setOverlays((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (activeId && ids.includes(activeId)) setActiveId(null);

    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch("/api/super-admin/companies", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              email: removed.find((c) => c.id === id)?.email,
              name: removed.find((c) => c.id === id)?.name,
              acronym: removed.find((c) => c.id === id)?.acronym,
              phone: removed.find((c) => c.id === id)?.phone,
              sector: removed.find((c) => c.id === id)?.sector,
              companyType: removed.find((c) => c.id === id)?.companyType,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to delete applicant");
        })
      );
      pushToast(
        "Applicant deleted",
        `${sample?.acronym ?? "Applicant"} removed from MMPS applicants.`,
        "info"
      );
      router.refresh();
    } catch (e) {
      setCompanies((prev) =>
        [...prev, ...removed].sort((a, b) =>
          b.registeredOn.localeCompare(a.registeredOn)
        )
      );
      setKpis((prev) => ({
        ...prev,
        pending: prev.pending + kpiSnapshot.pendingRemoved,
        rejected: prev.rejected + kpiSnapshot.rejectedRemoved,
        approved: prev.approved + kpiSnapshot.approvedRemoved,
        deleted: Math.max(0, prev.deleted - kpiSnapshot.total),
        registered: prev.registered + kpiSnapshot.total,
      }));
      pushToast(
        "Delete failed",
        e instanceof Error ? e.message : "Could not delete applicant.",
        "err"
      );
    }
  }

  const filterSelectClass =
    "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="relative mx-auto w-full max-w-none space-y-4 overflow-x-hidden">
      {/* Toasts — bottom-right (does not cover table / header) */}
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
                  "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 ring-1 ring-slate-900/[0.04] animate-fade-in-up",
                  t.tone === "ok" && "border-emerald-200/80",
                  t.tone === "err" && "border-rose-200/80",
                  t.tone === "warn" && "border-amber-200/80",
                  t.tone === "info" && "border-slate-200"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    t.tone === "ok" && "bg-emerald-50 text-emerald-600",
                    t.tone === "err" && "bg-rose-50 text-rose-600",
                    t.tone === "warn" && "bg-amber-50 text-amber-600",
                    t.tone === "info" && "bg-sky-50 text-sky-600"
                  )}
                >
                  {t.tone === "ok" ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
                  ) : t.tone === "err" ? (
                    <ShieldX className="h-4 w-4" strokeWidth={2.25} />
                  ) : t.tone === "warn" ? (
                    <Clock3 className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    <FileText className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-bold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium leading-snug text-slate-500">
                    {t.detail}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismissToast(t.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Header — subtitle aligns under title letter (same as Companies Management) */}
      {!hideHeader && (
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
            <ClipboardCheck className="h-6 w-6 text-white" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Pending Approvals
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Review MMPS applicants, check documents, then approve, reject, or
              delete.
            </p>
          </div>
        </div>
      )}

      {/* Card 1 — Stats (same full width as filter + table) */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        <KpiCard
          label="Registered"
          value={stats.total}
          hint="All applications"
          icon={Building2}
          tone="sky"
          onClick={() => setStatusFilter("ALL")}
        />
        <KpiCard
          label="Pending"
          value={stats.pending}
          hint="Awaiting review"
          icon={Clock3}
          tone="amber"
          onClick={() => setStatusFilter("PENDING")}
        />
        <KpiCard
          label="Approved"
          value={stats.approved}
          hint="Accepted applications"
          icon={ShieldCheck}
          tone="emerald"
          onClick={() => setStatusFilter("APPROVED")}
        />
        <KpiCard
          label="Rejected"
          value={stats.rejected}
          hint="Blocked login"
          icon={ShieldX}
          tone="rose"
          onClick={() => setStatusFilter("REJECTED")}
        />
        <KpiCard
          label="Deleted"
          value={stats.deleted}
          hint="Delete requests"
          icon={Trash2}
          tone="violet"
          onClick={() => setStatusFilter("DELETED")}
        />
      </div>

      {/* Card 2 — Search + filters */}
      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3 ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 w-full flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
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

          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 lg:flex lg:shrink-0">
          <div className="relative w-full lg:w-[10rem]">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as CompanySector | "ALL")}
              className={filterSelectClass}
              aria-label="Filter by sector"
            >
              <option value="ALL">All Sectors</option>
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Livestock">Livestock</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>
          <div className="relative w-full lg:w-[10rem]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={filterSelectClass}
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
              <option value="DELETED">Deleted</option>
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
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className={filterSelectClass}
              aria-label="Sort applications"
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

      {/* Card 3 — Table (same full width) */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">
              {showingDeleted ? "Deleted requests" : "Applicants of MMPS"}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {activeRows.length}{" "}
              {showingDeleted
                ? activeRows.length === 1
                  ? "deleted request"
                  : "deleted requests"
                : activeRows.length === 1
                  ? "applicant"
                  : "applicants"}{" "}
              shown
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  viewMode === "list" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  viewMode === "grid" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {showingDeleted ? (
          pageDeletedRows.length === 0 ? (
            <div className="mmps-table-fit">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-100 px-4 py-3.5">Company</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Sector</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Email</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Phone</th>
                    <th className="border-b border-slate-100 px-3 py-3.5 text-center">Deleted</th>
                    <th className="border-b border-slate-100 px-3 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      No deleted requests yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mmps-table-fit">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-100 px-4 py-3.5">Company</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Sector</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Email</th>
                    <th className="border-b border-slate-100 px-3 py-3.5">Phone</th>
                    <th className="border-b border-slate-100 px-3 py-3.5 text-center">Deleted</th>
                    <th className="border-b border-slate-100 px-3 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageDeletedRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3.5">
                        <p className="truncate text-[13px] font-bold text-slate-900">{r.acronym}</p>
                        <p className="truncate text-[11px] text-slate-400">{r.name}</p>
                      </td>
                      <td className="px-3 py-3.5 text-[12px] font-semibold text-slate-600">
                        {r.sector}
                      </td>
                      <td className="px-3 py-3.5 truncate text-[12px] text-slate-600">{r.email}</td>
                      <td className="px-3 py-3.5 truncate text-[12px] text-slate-600">{r.phone}</td>
                      <td className="px-3 py-3.5 text-center text-[12px] text-slate-500">
                        {formatDateTime(r.deletedAt)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                          <Trash2 className="h-3 w-3" />
                          Deleted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : viewMode === "grid" ? (
          pageRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
              No applicants match the current filters.
            </div>
          ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((c) => {
              const status = displayStatusFor(c);
              const docs = docsFor(c);
              const profile = profileFor(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <RowAvatar company={c} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{c.acronym}</p>
                      <p className="truncate text-xs text-slate-600">{c.name}</p>
                      {selectedPlanLine(c) ? (
                        <p className="truncate text-[11px] font-bold text-emerald-700">
                          {selectedPlanLine(c)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", SECTOR_META[c.sector].chip)}>
                      {c.sector}
                    </span>
                    <span className={cn(statusBadgeBox, statusChip(status))}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {profile.contactPerson} · {docs.length} docs · {formatDate(c.registeredOn)}
                  </p>
                </button>
              );
            })}
          </div>
          )
        ) : (
          <>
          <div className="lg:hidden">
            {pageRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                {companies.length === 0
                  ? "No applicants yet. New registrations will appear here."
                  : "No applicants match the current filters."}
              </div>
            ) : (
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                {pageRows.map((c) => {
                  const status = displayStatusFor(c);
                  const docs = docsFor(c);
                  const profile = profileFor(c);
                  const meta = SECTOR_META[c.sector];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <RowAvatar company={c} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{c.acronym}</p>
                          <p className="truncate text-xs text-slate-600">{c.name}</p>
                          {selectedPlanLine(c) ? (
                            <p className="truncate text-[11px] font-bold text-emerald-700">
                              {selectedPlanLine(c)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.chip)}>
                          <meta.icon className="h-3 w-3" />
                          {c.sector}
                        </span>
                        <span className={cn(statusBadgeBox, statusChip(status))}>
                          {statusLabel(status)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {profile.district || "—"} · {docs.length} docs · {formatDate(c.registeredOn)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mmps-table-fit hidden outline-none lg:block [&_button]:outline-none [&_button]:ring-0 [&_td]:outline-none [&_tr]:outline-none">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[14%]" />
                <col className="w-[7%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">#</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-left sm:px-4">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      <span className="h-14 w-14 shrink-0" aria-hidden />
                      <span>Company</span>
                    </div>
                  </th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Sector</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">District</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Registered</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Docs</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Status</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      {companies.length === 0
                        ? "No applicants yet. New registrations will appear here."
                        : "No applicants match the current filters."}
                    </td>
                  </tr>
                ) : (
                pageRows.map((c, rowIndex) => {
                  const status = displayStatusFor(c);
                  const docs = docsFor(c);
                  const profile = profileFor(c);
                  const meta = SECTOR_META[c.sector];
                  const isActive = active?.id === c.id;
                  const rowNumber = safePage * perPage + rowIndex + 1;
                  const isChecked = selected.has(c.id);
                  const homeContact = homeContactFor(c);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 last:border-b-0 outline-none transition-colors [-webkit-tap-highlight-color:transparent]",
                        isActive ? "bg-slate-100" : "hover:bg-slate-100"
                      )}
                    >
                      <td
                        className="px-2 py-4 text-center sm:px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => toggleOne(c.id)}
                          className={cn(
                            "mx-auto flex h-8 w-8 items-center justify-center rounded-lg border text-[12px] font-bold tabular-nums transition",
                            isChecked
                              ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                          )}
                          aria-label={`Select row ${rowNumber}`}
                        >
                          {rowNumber}
                        </button>
                      </td>
                      <td className="px-3 py-4 sm:px-4">
                        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                          <RowAvatar company={c} />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate text-[13px] font-bold leading-snug text-slate-900">
                              {c.acronym}
                            </p>
                            <p className="truncate text-[11px] leading-snug text-slate-600">
                              {homeContact.name}
                            </p>
                            <p className="truncate text-[11px] leading-snug text-slate-500">
                              {homeContact.email}
                            </p>
                            <p className="truncate text-[11px] leading-snug text-slate-400">
                              {homeContact.phone}
                            </p>
                            {selectedPlanLine(c) ? (
                              <p className="truncate text-[11px] font-bold leading-snug text-emerald-700">
                                {selectedPlanLine(c)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            meta.chip
                          )}
                        >
                          <meta.icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.sector}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center text-[12px] font-medium text-slate-600">
                        <span className="break-words">{profile.district || "—"}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center text-[12px] font-medium leading-snug text-slate-600">
                        <span className="block truncate">{formatDateTime(c.registeredOn)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center">
                          <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-50 px-2 text-[11px] font-bold text-sky-700">
                            <FileText className="h-3.5 w-3.5" />
                            {docs.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={cn(statusBadgeBox, statusChip(status))}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td
                        className="px-3 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="View"
                            onClick={() => {
                              setMenuOpenId(null);
                              setActiveId(c.id);
                            }}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 transition hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                          >
                            <Eye className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <RowActionsMenu
                            open={menuOpenId === c.id}
                            onOpenChange={(open) => setMenuOpenId(open ? c.id : null)}
                            onApprove={() => {
                              decide([c.id], "APPROVED");
                              setMenuOpenId(null);
                            }}
                            onReject={() => {
                              setRejectReason("");
                              setRejectFor(c);
                              setMenuOpenId(null);
                            }}
                            onDelete={() => {
                              deleteApplicants([c.id]);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 px-4 py-3">
          <p className="text-[12px] font-medium text-slate-500">
            Showing {showingFrom} to {showingTo} of {activeRows.length} results
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
            onChange={(e) => setPerPage(Number(e.target.value))}
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

      {active && (
        <ApprovalReviewDrawer
          company={active}
          displayStatus={displayStatusFor(active)}
          onClose={() => setActiveId(null)}
          onEditRejectionReason={
            displayStatusFor(active) === "REJECTED"
              ? async () => {
                  setEditReason(active.rejectionReason || "");
                  setEditReasonFor(active);
                  if (/^\d+$/.test(active.id)) {
                    try {
                      const res = await fetch(
                        `/api/super-admin/users/${active.id}/rejection-reason`
                      );
                      const json = await res.json().catch(() => ({}));
                      if (res.ok) {
                        if (json.rejection?.reason) {
                          setEditReason(json.rejection.reason);
                        }
                        setReasonHistory(json.history || []);
                        setCompanies((prev) =>
                          prev.map((c) =>
                            c.id === active.id
                              ? {
                                  ...c,
                                  rejectionReason: json.rejection?.reason ?? c.rejectionReason,
                                  rejectedAt: json.rejection?.rejectedAt ?? c.rejectedAt,
                                  rejectedByName:
                                    json.rejection?.rejectedByName ?? c.rejectedByName,
                                }
                              : c
                          )
                        );
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                }
              : undefined
          }
        />
      )}

      <Modal
        open={!!rejectFor}
        onClose={() => {
          if (rejectBusy) return;
          setRejectFor(null);
          setRejectReason("");
        }}
        title="Reject Application"
        footer={
          <>
            <button
              type="button"
              disabled={rejectBusy}
              onClick={() => {
                setRejectFor(null);
                setRejectReason("");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejectBusy || !rejectReason.trim()}
              onClick={async () => {
                if (!rejectFor || !rejectReason.trim()) return;
                setRejectBusy(true);
                const ok = await decide(
                  [rejectFor.id],
                  "REJECTED",
                  undefined,
                  rejectReason.trim()
                );
                setRejectBusy(false);
                if (ok) {
                  setRejectFor(null);
                  setRejectReason("");
                }
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {rejectBusy ? "Rejecting…" : "Confirm Rejection"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Rejecting{" "}
          <span className="font-semibold text-slate-900">
            {rejectFor?.name || rejectFor?.acronym}
          </span>
          . A reason is required and will appear on the applicant track dashboard.
        </p>
        <Field label="Reason" hint="Required — explain why this application is rejected.">
          <textarea
            className={cn(inputCls, "min-h-[110px] resize-y")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={!!editReasonFor}
        onClose={() => {
          if (editBusy) return;
          setEditReasonFor(null);
          setEditReason("");
          setReasonHistory([]);
        }}
        title="Edit Rejection Reason"
        footer={
          <>
            <button
              type="button"
              disabled={editBusy}
              onClick={() => {
                setEditReasonFor(null);
                setEditReason("");
                setReasonHistory([]);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editBusy || !editReason.trim()}
              onClick={async () => {
                if (!editReasonFor || !editReason.trim()) return;
                const ok = await confirm({
                  title: "Update rejection reason?",
                  description:
                    "Are you sure you want to update this rejection reason?",
                  confirmLabel: "Update reason",
                  tone: "danger",
                });
                if (!ok) return;
                if (!/^\d+$/.test(editReasonFor.id)) {
                  pushToast("Update failed", "Invalid applicant id.", "err");
                  return;
                }
                setEditBusy(true);
                try {
                  const res = await fetch(
                    `/api/super-admin/users/${editReasonFor.id}/rejection-reason`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: editReason.trim() }),
                    }
                  );
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(json.error || "Could not update reason");
                  }
                  setCompanies((prev) =>
                    prev.map((c) =>
                      c.id === editReasonFor.id
                        ? {
                            ...c,
                            rejectionReason:
                              json.rejection?.reason ?? editReason.trim(),
                            rejectedAt: json.rejection?.rejectedAt ?? c.rejectedAt,
                            rejectedByName:
                              json.rejection?.rejectedByName ?? c.rejectedByName,
                          }
                        : c
                    )
                  );
                  setReasonHistory(json.history || []);
                  pushToast(
                    "Reason updated",
                    json.message || "Rejection reason updated successfully.",
                    "ok"
                  );
                  setEditReasonFor(null);
                  setEditReason("");
                } catch (e) {
                  pushToast(
                    "Update failed",
                    e instanceof Error ? e.message : "Could not update reason.",
                    "err"
                  );
                } finally {
                  setEditBusy(false);
                }
              }}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {editBusy ? "Saving…" : "Save Reason"}
            </button>
          </>
        }
      >
        <Field label="Rejection reason">
          <textarea
            className={cn(inputCls, "min-h-[110px] resize-y")}
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Enter rejection reason..."
          />
        </Field>
        {reasonHistory.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Reason History
            </p>
            <ul className="mt-2 space-y-3">
              {reasonHistory.map((h) => (
                <li key={h.id} className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{h.newReason}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Changed by {h.changedByName} · {formatDateTime(h.createdAt)}
                  </p>
                  {h.previousReason ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Previous: {h.previousReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {dialog}
    </div>
  );
}

function resolveApplicantImage(company: CompanyRecord): string | null {
  if (isApplicantUploadedAsset(company.image)) return company.image!.trim();

  const slug =
    company.companySlug?.trim() ||
    providerMetaForSlug(company.id)?.slug ||
    company.href?.split("/").filter(Boolean).pop() ||
    null;

  // Don't treat sector routes (/water, /electricity) as company slugs
  if (slug && slug !== "water" && slug !== "electricity" && slug !== "livestock") {
    const metaImage = providerMetaForSlug(slug)?.image?.trim();
    if (metaImage) return metaImage;
  }

  // Seed Livestock Market company only — never every livestock applicant.
  if (
    company.id === "livestock-market" ||
    company.companySlug === "livestock-market"
  ) {
    return LIVESTOCK_MARKET_LOGO;
  }
  return null;
}

/** Home-page public contact (email + phone) for list rows. */
function homeContactFor(company: CompanyRecord): {
  email: string;
  phone: string;
  name: string;
} {
  const slug =
    company.companySlug?.trim() ||
    (company.href?.split("/").filter(Boolean).pop() &&
    !["water", "electricity", "livestock"].includes(
      company.href.split("/").filter(Boolean).pop()!
    )
      ? company.href.split("/").filter(Boolean).pop()!
      : null);

  const meta = slug ? providerMetaForSlug(slug) : null;
  return {
    name: company.name?.trim() || company.acronym,
    email: realEmail(company.companyEmail, company.email, meta?.email),
    phone: realPhone(company.phone, meta?.phone),
  };
}

function RowAvatar({ company }: { company: CompanyRecord }) {
  const meta = SECTOR_META[company.sector];
  const image = resolveApplicantImage(company);
  if (image) {
    return (
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
        <Image
          src={image}
          alt={`${company.name} logo`}
          width={112}
          height={112}
          quality={100}
          unoptimized={image.startsWith("/uploads/")}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <meta.icon className="h-5 w-5" />
    </span>
  );
}

function RowActionsMenu({
  open,
  onOpenChange,
  onApprove,
  onReject,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setCoords(null);
      return;
    }

    function place() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = 200;
      const menuH = 168;
      const gap = 8;
      const openUp = window.innerHeight - rect.bottom < menuH + gap + 12;
      const top = openUp ? rect.top - gap : rect.bottom + gap;
      const left = Math.max(12, Math.min(rect.right - menuW, window.innerWidth - menuW - 12));
      setCoords({ top, left, openUp });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const menu =
    open &&
    coords &&
    createPortal(
      <div
        className={cn(
          "fixed z-[200] w-[200px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 ring-1 ring-slate-900/[0.04]",
          coords.openUp ? "-translate-y-full" : ""
        )}
        style={{ top: coords.top, left: coords.left }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onApprove}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-emerald-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-800 focus:bg-emerald-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Approve
        </button>
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReject}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-amber-700 outline-none transition hover:bg-amber-50 hover:text-amber-800 focus:bg-amber-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldX className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Reject
        </button>
        <div className="my-1 h-px bg-slate-100" />
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDelete}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-rose-700 outline-none transition hover:bg-rose-50 hover:text-rose-800 focus:bg-rose-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Delete
        </button>
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Actions"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={cn(
          "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition",
          open
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {menu}
    </>
  );
}
