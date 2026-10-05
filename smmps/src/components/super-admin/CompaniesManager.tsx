"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Building2 } from "lucide-react";
import { DataTable, Modal, Field, inputCls } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { sanitizePhoneInput, phoneWriteError } from "@/lib/register-validation";

type Company = {
  id: number;
  name: string;
  slug: string;
  type: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  status: string;
  market: { id: number; name: string } | null;
  _count: { users: number; marketPrices: number; documents: number };
  subscriptions: { id: number; status: string; expiryDate: string; plan: { name: string } }[];
};

const EMPTY = {
  name: "",
  type: "OTHER",
  email: "",
  phone: "",
  location: "",
  registrationNumber: "",
  description: "",
  status: "ACTIVE",
  marketId: "",
};

export function CompaniesManager() {
  const { confirm, dialog } = useConfirmDialog();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [markets, setMarkets] = useState<{ id: number; name: string; marketType: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, mRes] = await Promise.all([
        fetch(`/api/companies${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/markets"),
      ]);
      const c = await cRes.json();
      const m = await mRes.json();
      setCompanies(c.companies || []);
      setMarkets(
        (m.markets || []).map((x: { id: number; name: string; marketType?: string }) => ({
          id: x.id,
          name: x.name,
          marketType: String(x.marketType || "").toUpperCase(),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(c: Company) {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type,
      email: c.email || "",
      phone: c.phone || "",
      location: c.location || "",
      registrationNumber: "",
      description: "",
      // Companies only use Active / Inactive (legacy Suspended → Inactive)
      status: c.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      marketId: c.market ? String(c.market.id) : "",
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const phoneErr = phoneWriteError(form.phone, false);
      if (phoneErr) {
        setError(phoneErr);
        setSaving(false);
        return;
      }
      const payload = {
        ...form,
        marketId: form.marketId ? Number(form.marketId) : null,
      };
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to save");
        return;
      }
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: "Delete company?",
      description: "Users keep their accounts but lose the company link. This cannot be undone.",
      confirmLabel: "Delete company",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/companies?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleStatus(c: Company) {
    const next = c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const ok = await confirm(
      next === "INACTIVE"
        ? {
            title: "Set company inactive?",
            description: `${c.name} will be hidden from the public and login will be blocked until it is activated again.`,
            confirmLabel: "Set inactive",
            tone: "warning",
          }
        : {
            title: "Activate company?",
            description: `${c.name} will be active again.`,
            confirmLabel: "Activate",
            tone: "primary",
          }
    );
    if (!ok) return;
    await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, status: next }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Companies</h2>
          <p className="text-sm text-slate-500">
            Companies register themselves. Approve them under Pending.
          </p>
        </div>
      </div>

      <DataTable
        searchable
        onSearch={setQ}
        onRefresh={load}
        rows={companies}
        emptyText={loading ? "Loading..." : "No companies yet."}
        columns={[
          {
            key: "name",
            header: "Company",
            render: (c) => (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.slug}</p>
                </div>
              </div>
            ),
          },
          { key: "type", header: "Type", render: (c) => <StatusBadge status={c.type} /> },
          {
            key: "location",
            header: "Location",
            className: "max-w-[12rem]",
            render: (c) => (
              <span className="line-clamp-2 text-[12px] font-medium text-slate-600">
                {c.location || "—"}
              </span>
            ),
          },
          {
            key: "subscription",
            header: "Subscription",
            className: "whitespace-nowrap",
            render: (c) => {
              const sub = c.subscriptions?.[0];
              if (!sub) {
                return <span className="text-xs font-semibold text-slate-400">No plan</span>;
              }
              return (
                <div className="space-y-1">
                  <p className="text-[12px] font-bold text-slate-800">{sub.plan?.name || "Plan"}</p>
                  <StatusBadge status={sub.status} />
                </div>
              );
            },
          },
          { key: "status", header: "Status", render: (c) => (
            <StatusBadge status={c.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"} />
          ) },
        ]}
        actions={(c) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleStatus(c)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              {c.status === "ACTIVE" ? "Inactive" : "Activate"}
            </button>
            <button type="button" onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Company"
        wide
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <AdminSaveButton
              label="Save"
              saving={saving}
              onClick={save}
              className="!min-w-[8.5rem]"
            />
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p>
          )}
          <Field label="Company name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Company type">
            <p className={inputCls}>
              {form.type === "WATER_SUPPLY"
                ? "Water Supply"
                : form.type === "ELECTRICITY"
                  ? "Electricity"
                  : form.type}
            </p>
          </Field>
          <Field label="Email">
            <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })
              }
            />
          </Field>
          <Field label="Location">
            <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Registration number">
            <input className={inputCls} value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
          </Field>
          <Field label="Market">
            <p className={inputCls}>
              {markets.find((item) => String(item.id) === form.marketId)?.name || "—"}
            </p>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
