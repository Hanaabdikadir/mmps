"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Search,
  RefreshCw,
  Store,
  Droplets,
  Zap,
  LayoutGrid,
  Building2,
  UserRoundX,
  UserCheck,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { cn } from "@/lib/utils";
import { CompanyLogoUpload } from "@/components/auth/CompanyLogoUpload";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { REGISTRATION_COMPANY_LOGO_FIELD } from "@/lib/registration-requirements";
import { adminMarketImageUrl } from "@/lib/market-logo-url";

type MarketCompany = {
  id: number;
  name: string;
  slug: string;
  type: string;
  location?: string | null;
  logoFileName?: string | null;
};

type Market = {
  id: number;
  name: string;
  location: string | null;
  marketType: string;
  description: string | null;
  status: string;
  createdAt: string;
  logoFileName?: string | null;
  companies?: MarketCompany[];
  _count: { sections: number; companies: number; brokers: number };
};

function companyLogoSrc(fileName?: string | null) {
  const f = fileName?.trim();
  if (!f) return "";
  if (f.startsWith("/") || f.startsWith("http")) return f;
  return `/uploads/${f}`;
}

function CompanyChip({ company }: { company: MarketCompany }) {
  const src = companyLogoSrc(company.logoFileName);
  return (
    <li className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 shadow-sm">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full border border-slate-100 bg-slate-50 object-contain"
        />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Building2 className="h-3 w-3" />
        </span>
      )}
      <span className="truncate pr-1.5 text-[12px] font-semibold text-slate-800">
        {company.name}
      </span>
    </li>
  );
}

const PREVIEW_COMPANIES = 4;

type TypeFilter = "ALL" | "WATER" | "ELECTRICITY";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

const EMPTY = {
  name: "",
  location: "",
  marketType: "WATER",
  description: "",
  status: "ACTIVE",
};

const filterSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function typeMeta(type: string): {
  icon: LucideIcon;
  tone: string;
  badge: string;
  label: string;
} {
  const key = type.toUpperCase();
  if (key === "WATER") {
    return {
      icon: Droplets,
      tone: "bg-cyan-600 text-white ring-cyan-700/30",
      badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
      label: "Water",
    };
  }
  if (key === "ELECTRICITY") {
    return {
      icon: Zap,
      tone: "bg-amber-500 text-white ring-amber-600/30",
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      label: "Electricity",
    };
  }
  return {
    icon: LayoutGrid,
    tone: "bg-slate-600 text-white ring-slate-700/30",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    label: key || "Other",
  };
}

function StatusChip({ status }: { status: string }) {
  const active = status === "ACTIVE";
  const suspended = status === "SUSPENDED";
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : suspended
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-100 text-slate-700"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function MarketsManager() {
  const { confirm, dialog } = useConfirmDialog();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Market | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [companiesMarketId, setCompaniesMarketId] = useState<number | null>(
    null
  );
  const [companyQuery, setCompanyQuery] = useState("");
  const [actionMessage, setActionMessage] = useActionMessage(2000);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoPreviewUrl = useFileObjectUrl(logoFile);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(
        `/api/markets${params.toString() ? `?${params}` : ""}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to load markets.",
        });
        setMarkets([]);
        return;
      }
      setMarkets(
        (data.markets || []).filter((m: Market) => {
          const t = m.marketType?.toUpperCase();
          return t === "WATER" || t === "ELECTRICITY";
        })
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: markets.length,
      water: markets.filter((m) => m.marketType === "WATER").length,
      electricity: markets.filter((m) => m.marketType === "ELECTRICITY").length,
    }),
    [markets]
  );

  const statusOptions = useMemo(() => {
    const labels: Record<string, string> = {
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      INACTIVE: "Inactive",
    };
    const present = new Set(markets.map((m) => m.status.toUpperCase()));
    return (["ACTIVE", "SUSPENDED", "INACTIVE"] as const).filter((status) =>
      present.has(status)
    ).map((status) => ({ value: status, label: labels[status] }));
  }, [markets]);

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      if (typeFilter !== "ALL" && m.marketType !== typeFilter) return false;
      if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
      return true;
    });
  }, [markets, typeFilter, statusFilter]);

  const companiesMarket =
    markets.find((m) => m.id === companiesMarketId) ?? null;
  const modalCompanies = useMemo(() => {
    const list = companiesMarket?.companies ?? [];
    const q = companyQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [companiesMarket, companyQuery]);

  function openCompanies(market: Market) {
    setCompaniesMarketId(market.id);
    setCompanyQuery("");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Market name is required");
      return;
    }
    if (!editing && !logoFile) {
      setError("Please upload a company logo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      payload.set("name", form.name.trim());
      payload.set("location", form.location);
      payload.set("marketType", form.marketType);
      payload.set("description", form.description);
      payload.set("status", form.status);
      if (editing) payload.set("id", String(editing.id));
      if (logoFile) payload.append(REGISTRATION_COMPANY_LOGO_FIELD, logoFile);
      const res = await fetch("/api/markets", {
        method: editing ? "PATCH" : "POST",
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save market");
        return;
      }
      setOpen(false);
      setLogoFile(null);
      setActionMessage({
        type: "ok",
        text: editing
          ? `${form.name.trim()} updated.`
          : `${form.name.trim()} created.`,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(m: Market) {
    const next = m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const ok = await confirm(
      next === "SUSPENDED"
        ? {
            title: "Suspend market?",
            description: `${m.name} will be suspended until it is activated again.`,
            confirmLabel: "Suspend",
            tone: "warning",
          }
        : {
            title: "Activate market?",
            description: `${m.name} will be active again.`,
            confirmLabel: "Activate",
            tone: "primary",
          }
    );
    if (!ok) return;
    setActionBusyId(m.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/markets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || `Could not ${next === "SUSPENDED" ? "suspend" : "activate"} market.`,
        });
        return;
      }
      setMarkets((prev) =>
        prev.map((row) => (row.id === m.id ? { ...row, status: next } : row))
      );
      setActionMessage({
        type: "ok",
        text:
          next === "SUSPENDED"
            ? `${m.name} suspended.`
            : `${m.name} activated.`,
      });
    } finally {
      setActionBusyId(null);
    }
  }

  async function remove(m: Market) {
    const ok = await confirm({
      title: "Delete market?",
      description: `Permanently delete ${m.name}? This removes related sections, prices, assigned companies/livestock, and their users from the database.`,
      confirmLabel: "Delete market",
      tone: "danger",
    });
    if (!ok) return;
    setActionBusyId(m.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/markets?id=${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Could not delete market.",
        });
        return;
      }
      setMarkets((prev) => prev.filter((row) => row.id !== m.id));
      setActionMessage({
        type: "ok",
        text: `${m.name} and related data deleted.`,
      });
    } finally {
      setActionBusyId(null);
    }
  }

  function applySearch() {
    setQuery(searchDraft.trim());
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
            <Store className="h-6 w-6 text-white" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Markets
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Water and electricity locations only. Livestock markets are under Livestock.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:gap-3 lg:overflow-visible">
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Total"
            value={stats.total}
            hint="All markets"
            icon={Store}
            tone="indigo"
            onClick={() => {
              setTypeFilter("ALL");
              setStatusFilter("ALL");
            }}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Water"
            value={stats.water}
            hint="Water markets"
            icon={Droplets}
            tone="cyan"
            onClick={() => setTypeFilter("WATER")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Electricity"
            value={stats.electricity}
            hint="Power markets"
            icon={Zap}
            tone="amber"
            onClick={() => setTypeFilter("ELECTRICITY")}
          />
        </div>
      </div>

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search market or location…"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          <div className="relative w-full sm:w-[10.5rem]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className={filterSelectClass}
              aria-label="Filter by market type"
            >
              <option value="ALL">All Types</option>
              <option value="WATER">Water</option>
              <option value="ELECTRICITY">Electricity</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2.25}
            />
          </div>

          <div className="relative w-full sm:w-[10rem]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={filterSelectClass}
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2.25}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              setQuery("");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
              void load();
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </button>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">System markets</p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {filtered.length} {filtered.length === 1 ? "market" : "markets"}{" "}
              shown
            </p>
          </div>
          {actionMessage ? (
            <p
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                actionMessage.type === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {actionMessage.text}
            </p>
          ) : null}
        </div>

        <div>
          {loading ? (
            <p className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
              Loading markets…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
              No markets match the current filters.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const meta = typeMeta(m.marketType);
                const TypeIcon = meta.icon;
                const logoSrc = m.logoFileName
                  ? adminMarketImageUrl(m.logoFileName, "")
                  : "";
                const companies = m.companies ?? [];
                return (
                  <li
                    key={m.id}
                    className="px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {logoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoSrc}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-0.5"
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                              meta.tone
                            )}
                          >
                            <TypeIcon
                              className="h-[18px] w-[18px]"
                              strokeWidth={2.25}
                            />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-slate-900">
                            {m.name}
                          </p>
                          <p className="truncate text-[12px] font-medium text-slate-500">
                            {m.description || m.location || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                            meta.badge
                          )}
                        >
                          <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                          {meta.label}
                        </span>
                        <StatusChip status={m.status} />
                        <button
                          type="button"
                          disabled={actionBusyId === m.id}
                          onClick={() => void toggleStatus(m)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            m.status === "ACTIVE"
                              ? "Suspend market"
                              : "Activate market"
                          }
                          aria-label={
                            m.status === "ACTIVE"
                              ? "Suspend market"
                              : "Activate market"
                          }
                        >
                          {m.status === "ACTIVE" ? (
                            <UserRoundX className="h-4 w-4" strokeWidth={2.25} />
                          ) : (
                            <UserCheck className="h-4 w-4" strokeWidth={2.25} />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusyId === m.id}
                          onClick={() => void remove(m)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete market"
                          aria-label="Delete market"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:pl-[3.25rem]">
                      <button
                        type="button"
                        disabled={companies.length === 0}
                        onClick={() => openCompanies(m)}
                        className="inline-flex h-7 items-center gap-1 rounded-full bg-sky-50 px-2.5 text-[11px] font-bold text-sky-800 transition hover:bg-sky-100 disabled:cursor-default"
                        title={
                          companies.length > 0
                            ? "View all companies"
                            : "No companies yet"
                        }
                      >
                        <Building2 className="h-3.5 w-3.5 text-sky-600" />
                        {m._count.companies}
                      </button>
                      {companies.length > 0 ? (
                        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                          {companies.slice(0, PREVIEW_COMPANIES).map((company) => (
                            <CompanyChip key={company.id} company={company} />
                          ))}
                          {companies.length > PREVIEW_COMPANIES ? (
                            <li>
                              <button
                                type="button"
                                onClick={() => openCompanies(m)}
                                className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                              >
                                +{companies.length - PREVIEW_COMPANIES} more
                              </button>
                            </li>
                          ) : companies.length > 1 ? (
                            <li>
                              <button
                                type="button"
                                onClick={() => openCompanies(m)}
                                className="text-[11px] font-bold text-sky-700 hover:underline"
                              >
                                View all
                              </button>
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="text-[12px] font-medium text-slate-400">
                          No companies yet
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Market" : "New Market"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label="Save"
              saving={saving}
              savingLabel="Saving…"
              onClick={save}
              className="!min-w-[8.5rem]"
            />
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <Field label="Market name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location">
              <input
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Field label="Market type">
              <select
                className={inputCls}
                value={form.marketType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    marketType: e.target.value,
                  })
                }
              >
                <option value="WATER">Water</option>
                <option value="ELECTRICITY">Electricity</option>
              </select>
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Company logo
            </span>
            {editing?.logoFileName && !logoFile ? (
              <p className="mb-2 text-[12px] font-semibold text-slate-500">
                Current logo is saved. Upload a new file to replace it.
              </p>
            ) : null}
            <CompanyLogoUpload
              file={logoFile}
              previewUrl={
                logoPreviewUrl ||
                (editing?.logoFileName
                  ? adminMarketImageUrl(editing.logoFileName, "")
                  : null)
              }
              onChange={setLogoFile}
            />
          </div>
          <Field label="Description">
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(companiesMarket)}
        onClose={() => setCompaniesMarketId(null)}
        title={
          companiesMarket
            ? `${companiesMarket.name} · ${companiesMarket.companies?.length ?? 0} companies`
            : "Companies"
        }
        wide
        footer={
          <button
            type="button"
            onClick={() => setCompaniesMarketId(null)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              placeholder="Search company…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
          {modalCompanies.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-slate-400">
              {companyQuery.trim()
                ? "No companies match that search."
                : "No companies yet"}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {modalCompanies.map((company) => {
                const src = companyLogoSrc(company.logoFileName);
                return (
                  <li
                    key={company.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                        <Building2 className="h-4 w-4" />
                      </span>
                    )}
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
                      {company.name}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
