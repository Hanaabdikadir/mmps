"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Beef,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  UserRoundX,
  XCircle,
} from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { CompanyLogoUpload } from "@/components/auth/CompanyLogoUpload";
import { RegistrationDocumentsStep } from "@/components/auth/RegisterRequirements";
import { RegisterFormSelect } from "@/components/auth/RegisterFormSelect";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { BANADIR_DISTRICTS } from "@/lib/banadir-districts";
import {
  REGISTRATION_COMPANY_LOGO_FIELD,
  REGISTRATION_DOCUMENT_FORM_PREFIX,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import { cn } from "@/lib/utils";
import { formatRoleLabel } from "@/lib/role-labels";
import { formatMmpsStamp } from "@/lib/mogadishu-time";
import { formatBrokerDisplayName } from "@/lib/broker-display-name";
import { LIVESTOCK_MANAGER_EMAIL } from "@/lib/livestock-manager-broker";
import { sanitizePhoneInput, phoneWriteError, validatePhoneField } from "@/lib/register-validation";

type BrokerUser = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  accountStatus?: string;
  companyType?: string | null;
  companyName?: string | null;
  companyDistrict?: string | null;
  createdAt: string;
};

type RecentPrice = {
  id: number;
  animalType: string;
  price: string;
  currency: string;
  marketLocation: string;
  status: string;
  createdAt: string;
  rejectionReason?: string | null;
};

type Props = {
  /** Controls header copy for /broker vs /broker/users. */
  mode?: "overview" | "users";
  sectionLabel: string;
  sectionFocus: string | null;
  isManager?: boolean;
  canManageUsers: boolean;
  canApproveLivestockPrices?: boolean;
  canApproveBrokers?: boolean;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    users: number;
  };
  initialUsers: BrokerUser[];
  recentPrices: RecentPrice[];
  subscriptionLabel: string | null;
};

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  companyDistrict: "",
  companyAddress: "",
  companyEmail: "",
};

function StatusChip({ status }: { status: string }) {
  const key = status.toUpperCase();
  const ok = key === "APPROVED" || key === "ACTIVE";
  const pending = key === "PENDING";
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : pending
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function BrokerDashboardPanel({
  mode = "users",
  sectionLabel,
  sectionFocus,
  isManager = false,
  canManageUsers,
  canApproveLivestockPrices,
  canApproveBrokers,
  stats,
  initialUsers,
  recentPrices,
  subscriptionLabel,
}: Props) {
  const { confirm, dialog } = useConfirmDialog();
  const [users, setUsers] = useState(initialUsers);
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BrokerUser | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    companyName: "",
    companyDistrict: "",
  });
  const [form, setForm] = useState(EMPTY);
  const [sectionEmail, setSectionEmail] = useState("cattle@livestock.so");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<
    Partial<Record<RegistrationDocumentId, File | null>>
  >({});
  const logoPreviewUrl = useFileObjectUrl(logoFile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/broker/users");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setUsers(data.users || []);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (u.email.toLowerCase() === LIVESTOCK_MANAGER_EMAIL) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.companyName || "").toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  function resetCreate() {
    setForm(EMPTY);
    setLogoFile(null);
    setDocuments({});
    setError("");
  }

  function openEdit(u: BrokerUser) {
    setEditing(u);
    setEditForm({
      fullName: u.fullName,
      phone: u.phone || "",
      companyName: u.companyName || u.fullName,
      companyDistrict: u.companyDistrict || "",
    });
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/broker/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...editForm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update broker");
        return;
      }
      setEditing(null);
      setActionMessage({ type: "ok", text: `${editForm.fullName} updated.` });
      await loadUsers();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: BrokerUser) {
    const next =
      (u.accountStatus || u.status) === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const ok = await confirm({
      title: next === "SUSPENDED" ? "Suspend broker?" : "Activate broker?",
      description:
        next === "SUSPENDED"
          ? `${u.fullName} will be suspended until activated again.`
          : `${u.fullName} will be active again.`,
      confirmLabel: next === "SUSPENDED" ? "Suspend" : "Activate",
      tone: next === "SUSPENDED" ? "danger" : "primary",
    });
    if (!ok) return;
    const res = await fetch("/api/broker/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, accountStatus: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage({
        type: "error",
        text: data.error || "Could not update status",
      });
      return;
    }
    setActionMessage({
      type: "ok",
      text:
        next === "SUSPENDED"
          ? `${u.fullName} suspended.`
          : `${u.fullName} activated.`,
    });
    await loadUsers();
  }

  async function removeUser(u: BrokerUser) {
    const ok = await confirm({
      title: "Delete broker?",
      description: `${u.fullName} will be removed from broker accounts.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/broker/users?id=${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage({
        type: "error",
        text: data.error || "Could not delete broker",
      });
      return;
    }
    setActionMessage({ type: "ok", text: `${u.fullName} deleted.` });
    await loadUsers();
  }

  async function createBroker() {
    setSaving(true);
    setError("");
    setActionMessage(null);
    try {
      if (!form.fullName.trim() || !form.email.trim()) {
        setError("Full name and email are required");
        return;
      }
      const phoneErr = phoneWriteError(form.phone, true);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!form.companyName.trim()) {
        setError("Broker / market name is required");
        return;
      }
      if (!form.companyDistrict.trim()) {
        setError("Select a Banadir district");
        return;
      }

      const payload = new FormData();
      payload.append("fullName", form.fullName.trim());
      payload.append("email", form.email.trim());
      payload.append("password", form.password);
      payload.append("confirmPassword", form.confirmPassword);
      payload.append("phone", form.phone.trim());
      payload.append("companyName", form.companyName.trim());
      payload.append("companyDistrict", form.companyDistrict.trim());
      payload.append("companyAddress", form.companyAddress.trim());
      payload.append("companyEmail", form.companyEmail.trim());
      if (isManager) payload.append("sectionEmail", sectionEmail);
      if (logoFile) payload.append(REGISTRATION_COMPANY_LOGO_FIELD, logoFile);
      for (const [id, file] of Object.entries(documents)) {
        if (file) payload.append(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`, file);
      }

      const res = await fetch("/api/broker/users", {
        method: "POST",
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create broker");
        return;
      }
      setCreateOpen(false);
      resetCreate();
      setActionMessage({
        type: "ok",
        text: `${form.companyName || form.fullName} was created and can sign in.`,
      });
      await loadUsers();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
            <Beef className="h-6 w-6 text-white" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {mode === "overview" ? "Overview" : "Users & Roles"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {mode === "overview"
                ? isManager
                  ? "Quick view of broker portal accounts"
                  : `${sectionLabel}${sectionFocus ? ` · ${sectionFocus}` : ""} — broker accounts overview`
                : isManager
                  ? "Manage Camel, Cattle, and Goat broker accounts"
                  : `${sectionLabel}${sectionFocus ? ` · ${sectionFocus}` : ""} — manage broker accounts`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subscriptionLabel ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
              {subscriptionLabel}
            </span>
          ) : null}
          {canManageUsers ? (
            <button
              type="button"
              onClick={() => {
                resetCreate();
                setCreateOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New Broker
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:gap-3 lg:overflow-visible">
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="My Prices"
            value={stats.total}
            hint="All submissions"
            icon={Beef}
            tone="indigo"
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Pending"
            value={stats.pending}
            hint="Awaiting review"
            icon={Clock}
            tone="amber"
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Approved"
            value={stats.approved}
            hint="Live on home"
            icon={CheckCircle2}
            tone="emerald"
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Rejected"
            value={stats.rejected}
            hint="Needs update"
            icon={XCircle}
            tone="rose"
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Brokers"
            value={stats.users}
            hint="Section accounts"
            icon={UserRound}
            tone="teal"
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
                onKeyDown={(e) =>
                  e.key === "Enter" && setQuery(searchDraft.trim())
                }
                placeholder="Search broker name or email…"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuery(searchDraft.trim())}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              setQuery("");
              void loadUsers();
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </button>
          <Link
            href="/broker/prices"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <Beef className="h-4 w-4" strokeWidth={2.25} />
            Prices
          </Link>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">
              Broker accounts
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {filtered.length}{" "}
              {filtered.length === 1 ? "broker" : "brokers"} shown · register-style
              accounts for this section
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

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-100 px-4 py-3.5">Broker</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Focus</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Role</th>
                <th className="border-b border-slate-100 px-3 py-3.5 text-center">
                  Status
                </th>
                <th className="border-b border-slate-100 px-3 py-3.5">Joined</th>
                {canManageUsers ? (
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageUsers ? 6 : 5}
                    className="px-6 py-14 text-center text-sm font-semibold text-slate-400"
                  >
                    No broker accounts yet. Use New Broker to add one with the
                    registration form.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                          <Beef className="h-5 w-5" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {(u.companyName || u.fullName)
                              .replace(/\bbanadir\b/gi, "")
                              .replace(/\s+/g, " ")
                              .trim() || u.fullName}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {u.email}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-400">
                            {u.companyDistrict || u.phone || "Mogadishu"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <span className="inline-flex whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-900">
                        {formatBrokerDisplayName(
                          null,
                          u.companyType || sectionFocus
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-[12px] font-semibold text-slate-600">
                      {formatRoleLabel(u.role)}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-center">
                      <StatusChip status={u.accountStatus || u.status} />
                    </td>
                    <td className="px-3 py-3.5 align-middle text-[12px] font-medium text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {canManageUsers ? (
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void toggleStatus(u)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                            title={
                              (u.accountStatus || u.status) === "SUSPENDED"
                                ? "Activate broker"
                                : "Suspend broker"
                            }
                            aria-label={
                              (u.accountStatus || u.status) === "SUSPENDED"
                                ? "Activate broker"
                                : "Suspend broker"
                            }
                          >
                            {(u.accountStatus || u.status) === "SUSPENDED" ? (
                              <UserCheck className="h-4 w-4" strokeWidth={2.25} />
                            ) : (
                              <UserRoundX className="h-4 w-4" strokeWidth={2.25} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                            title="Edit broker"
                            aria-label="Edit broker"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeUser(u)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:border-rose-200 hover:bg-rose-100"
                            title="Delete broker"
                            aria-label="Delete broker"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="border-b border-slate-100 px-4 py-3.5">
          <p className="text-[14px] font-bold text-slate-800">
            Recent submissions
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">
            Latest livestock prices for this section
          </p>
        </div>
        {recentPrices.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
            No prices submitted yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 px-4">
            {recentPrices.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {p.animalType} · {p.price} {p.currency} · {p.marketLocation}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatMmpsStamp(p.createdAt)}
                    {p.rejectionReason
                      ? ` · Rejected: ${p.rejectionReason}`
                      : ""}
                  </p>
                </div>
                <StatusChip status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Broker"
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label="Create broker"
              saving={saving}
              onClick={() => void createBroker()}
              className="!min-w-[10rem]"
            />
          </>
        }
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 scrollbar-none">
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <p className="text-sm text-slate-500">
            Same fields as public registration. New accounts join{" "}
            <span className="font-semibold text-slate-700">{sectionLabel}</span>
            {sectionFocus ? ` (${sectionFocus})` : ""} and can sign in to submit
            prices.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  placeholder="Contact person"
                />
              </div>
            </Field>
            <Field label="Phone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
                  placeholder="+252 61 xxx xxxx"
                />
              </div>
            </Field>
            <Field label="Login email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="broker@market.so"
                />
              </div>
            </Field>
            <Field label="Market section">
              {isManager ? (
                <RegisterFormSelect
                  id="manager-section-email"
                  value={sectionEmail}
                  onChange={setSectionEmail}
                  placeholder="Select section"
                  panelTitle="Livestock section"
                  compact
                  options={[
                    { value: "camel@livestock.so", label: "Camel" },
                    { value: "cattle@livestock.so", label: "Cattle" },
                    { value: "goat@livestock.so", label: "Goat" },
                  ]}
                />
              ) : (
                <input
                  className={cn(inputCls, "bg-slate-50")}
                  value={sectionFocus || sectionLabel}
                  readOnly
                />
              )}
            </Field>
            <Field label="Password (min 8 chars)">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  type="password"
                  value={form.confirmPassword}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                />
              </div>
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Market details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Broker / market name">
                <input
                  className={inputCls}
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                  placeholder="Livestock Broker"
                />
              </Field>
              <Field label="Banadir district">
                <RegisterFormSelect
                  id="broker-dash-district"
                  compact
                  theme="district"
                  showValueIconInTrigger={false}
                  placeholder="Select district"
                  panelTitle="Banadir district"
                  value={form.companyDistrict}
                  onChange={(v) => setForm({ ...form, companyDistrict: v })}
                  options={BANADIR_DISTRICTS.map((d) => ({
                    value: d,
                    label: d,
                  }))}
                />
              </Field>
              <Field label="Company email">
                <input
                  className={inputCls}
                  type="email"
                  value={form.companyEmail}
                  onChange={(e) =>
                    setForm({ ...form, companyEmail: e.target.value })
                  }
                  placeholder="Same as login if empty"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input
                    className={inputCls}
                    value={form.companyAddress}
                    onChange={(e) =>
                      setForm({ ...form, companyAddress: e.target.value })
                    }
                    placeholder="Street, building, area"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Market logo
            </p>
            <CompanyLogoUpload
              file={logoFile}
              previewUrl={logoPreviewUrl}
              onChange={setLogoFile}
            />
          </div>

          <RegistrationDocumentsStep
            sector="livestock"
            documents={documents}
            onDocumentChange={(id, file) =>
              setDocuments((prev) => ({ ...prev, [id]: file }))
            }
            companyLogoUploaded={Boolean(logoFile)}
            documentsRequired={false}
          />
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit broker"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label="Save"
              saving={saving}
              onClick={() => void saveEdit()}
              className="!min-w-[8.5rem]"
            />
          </>
        }
      >
        <div className="space-y-3">
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <Field label="Name">
            <input
              className={inputCls}
              value={editForm.fullName}
              onChange={(e) =>
                setEditForm({ ...editForm, fullName: e.target.value })
              }
            />
          </Field>
          <Field label="Broker / market name">
            <input
              className={inputCls}
              value={editForm.companyName}
              onChange={(e) =>
                setEditForm({ ...editForm, companyName: e.target.value })
              }
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: sanitizePhoneInput(e.target.value) })
              }
            />
          </Field>
          <Field label="District">
            <RegisterFormSelect
              id="broker-edit-district"
              compact
              theme="district"
              showValueIconInTrigger={false}
              placeholder="Select district"
              panelTitle="Banadir district"
              value={editForm.companyDistrict}
              onChange={(v) =>
                setEditForm({ ...editForm, companyDistrict: v })
              }
              options={BANADIR_DISTRICTS.map((d) => ({
                value: d,
                label: d,
              }))}
            />
          </Field>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
