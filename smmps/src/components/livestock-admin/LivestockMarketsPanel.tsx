"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Mail, Pencil, Phone, Plus, Search, Store, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { Modal, Field } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import {
  LIVESTOCK_PHOTO_URLS,
  adminLivestockName,
  isLivestockCategorySlug,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { animalTypeFromCategory, formatUsd, type NamedPriceField } from "@/lib/livestock-section-prices";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";

type AnimalTypeRow = {
  id: number;
  name: string;
  nameSomali?: string | null;
  slug?: string;
};
type Category = {
  id: number;
  name: string;
  nameSomali?: string | null;
  slug?: string;
  imageUrl?: string | null;
  animalTypes?: AnimalTypeRow[];
};
type AssignedBroker = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  profilePicture: string | null;
};
type Market = {
  id: number;
  name: string;
  code: string | null;
  location: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  categories: Category[];
  assignedBrokers: AssignedBroker[];
  _count: { livestockPrices: number };
};

const fieldCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function categoryTone(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) return "text-orange-700";
  if (upper.includes("SHEEP") || upper.includes("GOAT") || upper.includes("ARI")) {
    return "text-violet-700";
  }
  if (upper.includes("CATTLE") || upper.includes("LODA") || upper.includes("COW")) {
    return "text-teal-700";
  }
  return "text-slate-700";
}

function categoryChipClass(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }
  if (upper.includes("SHEEP") || upper.includes("GOAT") || upper.includes("ARI")) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (upper.includes("CATTLE") || upper.includes("LODA") || upper.includes("COW")) {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function categoryRank(name: string, slug?: string) {
  const hay = `${slug || ""} ${name}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return 0;
  if (hay.includes("loda") || hay.includes("cattle")) return 1;
  if (hay.includes("arri") || hay.includes("goat") || hay.includes("sheep")) return 2;
  return 3;
}

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

function slugFromCategory(category: Category): LivestockCategorySlug | null {
  if (category.slug && isLivestockCategorySlug(category.slug)) return category.slug;
  const hay = `${category.slug || ""} ${category.name}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return "geel";
  if (hay.includes("arri") || hay.includes("goat") || hay.includes("sheep")) return "arri";
  if (hay.includes("loda") || hay.includes("cattle")) return "loda";
  return null;
}

function categoryDisplayName(category: Category, lang: "en" | "so") {
  return adminLivestockName(category.name, category.nameSomali, lang);
}

function categoryTypes(category: Category): AnimalTypeRow[] {
  return Array.isArray(category.animalTypes) ? category.animalTypes : [];
}

function typeDisplayName(type: AnimalTypeRow, lang: "en" | "so") {
  return adminLivestockName(type.name, type.nameSomali, lang);
}

function MarketContents({ category }: { category: Category }) {
  const { lang } = useLang();
  const types = categoryTypes(category);
  const [live, setLive] = useState<NamedPriceField[]>([]);

  useEffect(() => {
    const builtin = slugFromCategory(category);
    if (!builtin) {
      setLive([]);
      return;
    }
    const animalType = animalTypeFromCategory(builtin);
    void fetch(`/api/livestock/section-prices?animalType=${animalType}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.fields)) setLive(data.fields);
      })
      .catch(() => setLive([]));
  }, [category]);

  const liveByName = new Map(
    live
      .filter((f) => f.season === "birimo")
      .map((f) => [f.name.trim().toLowerCase(), f.price] as const)
  );

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            In this market
          </p>
          <h4 className="mt-0.5 text-[15px] font-black text-slate-900">
            {categoryDisplayName(category, lang)}
            <span className="ml-1.5 font-semibold text-slate-400">
              · {types.length} {types.length === 1 ? "type" : "types"}
            </span>
          </h4>
        </div>
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">USD</p>
      </div>
      {types.length ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {types.map((row, i) => {
            const so = (row.nameSomali || "").trim().toLowerCase();
            const price =
              liveByName.get(row.name.trim().toLowerCase()) ??
              (so ? liveByName.get(so) : undefined);
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-3.5 shadow-sm"
              >
                <span className="mb-3 inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-[10px] font-black text-slate-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] font-black tracking-tight text-slate-900">
                  {typeDisplayName(row, lang)}
                </p>
                <p className="mt-3 text-[17px] font-black tabular-nums tracking-tight text-slate-800">
                  {price != null && price > 0 ? formatUsd(price) : "—"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[13px] font-medium text-slate-500">
          No animal types in this category yet.
        </p>
      )}
    </section>
  );
}

export function LivestockMarketsPanel() {
  const { lang } = useLang();
  const { confirm, dialog } = useConfirmDialog();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Market | null>(null);
  const [viewCategoryId, setViewCategoryId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    status: "ACTIVE",
  });
  const [message, setMessage] = useActionMessage(2500);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/livestock/markets", { cache: "no-store" }),
        fetch("/api/livestock/catalog", { cache: "no-store" }),
      ]);
      const mJson = await mRes.json().catch(() => ({}));
      const cJson = await cRes.json().catch(() => ({}));
      if (!mRes.ok) throw new Error(mJson.error || "Could not load markets");
      const catalogRows: Category[] = (cJson.categories || []).map((c: Category) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        animalTypes: c.animalTypes || [],
      }));
      setCatalog(catalogRows);
      const typeByCat = new Map(catalogRows.map((c) => [c.id, c.animalTypes || []]));
      setMarkets(
        (mJson.markets || [])
          .filter((m: Market) => !isPlaceholderMarketName(m.name))
          .map((m: Market) => ({
            ...m,
            categories: (m.categories || []).map((c) => ({
              ...c,
              animalTypes: c.animalTypes?.length ? c.animalTypes : typeByCat.get(c.id) || [],
            })),
          }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = markets.filter((market) => {
    if (!q) return true;
    const hay = `${market.name} ${market.code || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  useEffect(() => {
    const t = setTimeout(() => setQ(searchDraft.trim()), 280);
    return () => clearTimeout(t);
  }, [searchDraft]);

  function openCreate() {
    setEditId(null);
    setForm({
      name: "",
      status: "ACTIVE",
    });
    setOpen(true);
  }

  function openEdit(market: Market) {
    setEditId(market.id);
    setForm({
      name: market.name,
      status: market.status,
    });
    setOpen(true);
  }

  function openView(market: Market) {
    setViewing(market);
    setViewCategoryId(market.categories[0]?.id ?? null);
  }

  async function save() {
    const savedName = form.name.trim();
    const wasEdit = Boolean(editId);
    if (!savedName) {
      setMessage({ type: "error", text: "Enter a new market name." });
      return;
    }
    const duplicate = markets.some(
      (m) => m.id !== editId && m.name.trim().toLowerCase() === savedName.toLowerCase()
    );
    if (duplicate) {
      setMessage({ type: "error", text: `${savedName} is already in livestock markets.` });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/livestock/markets", {
        method: wasEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: savedName,
          location: null,
          description: "",
          status: form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setOpen(false);
      setEditId(null);
      setForm({
        name: "",
        status: "ACTIVE",
      });
      setMessage({
        type: "ok",
        text: wasEdit ? `${savedName} updated.` : `${savedName} added to livestock markets.`,
      });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function removeMarket(market: Market) {
    const ok = await confirm({
      title: "Delete market?",
      description: `${market.name} will be removed from livestock markets. Existing prices stay in the database but this suuq will no longer appear.`,
      confirmLabel: "Delete market",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/livestock/markets?id=${market.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Delete failed" });
      return;
    }
    setMessage({ type: "ok", text: `${market.name} deleted.` });
    if (viewing?.id === market.id) setViewing(null);
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <AdminPageHeader
        title="Livestock Markets"
        subtitle="Create livestock markets. Brokers pick their livestock type when they register."
        icon={Store}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add Market
          </button>
        }
      />

      {message && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {message.text}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3 shadow-sm ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQ(searchDraft.trim())}
              placeholder="SEARCH"
              className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:uppercase placeholder:tracking-wide placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setQ(searchDraft.trim())}
            className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-3 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden min-[400px]:inline">Search</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[20vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <p className="text-[14px] font-bold text-slate-800">Livestock markets</p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {visible.length} {visible.length === 1 ? "market" : "markets"} shown
              </p>
            </div>
          </div>
          <div className="mmps-table-fit">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-[1%] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-center">#</th>
                  <th className="border-b border-slate-100 px-4 py-3">Market</th>
                  <th className="border-b border-slate-100 px-4 py-3">Categories</th>
                  <th className="w-[1%] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-center">Status</th>
                  <th className="w-[1%] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!visible.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      No livestock markets yet. Click Add Market to create the first suuq.
                    </td>
                  </tr>
                ) : (
                  visible.map((market, i) => {
                    const orderedCategories = [...market.categories].sort(
                      (a, b) => categoryRank(a.name, a.slug) - categoryRank(b.name, b.slug)
                    );
                    return (
                      <tr key={market.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3.5 text-center text-[12px] font-bold tabular-nums text-slate-500">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] font-bold text-slate-900">
                            {livestockMarketDisplayName(market.name, lang).trim() || market.name}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-2">
                            {orderedCategories.length ? (
                              orderedCategories.map((c) => {
                                const types = categoryTypes(c);
                                return (
                                  <div key={c.id} className="min-w-0">
                                    <span
                                      className={cn("text-[12px] font-semibold", categoryTone(c.name))}
                                    >
                                      {categoryDisplayName(c, lang)}
                                    </span>
                                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">
                                      {types.length
                                        ? types.map((t) => typeDisplayName(t, lang)).join(" · ")
                                        : "No types"}
                                    </p>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-[12px] text-slate-400">None</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <StatusBadge status={market.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="View market"
                              aria-label={`View ${market.name}`}
                              onClick={() => openView(market)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <Eye className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                            <button
                              type="button"
                              title="Edit market"
                              aria-label={`Edit ${market.name}`}
                              onClick={() => openEdit(market)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                            <button
                              type="button"
                              title="Delete market"
                              aria-label={`Delete ${market.name}`}
                              onClick={() => void removeMarket(market)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
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
        </div>
      )}

      <Modal
        open={Boolean(viewing)}
        title={viewing ? viewing.name : "Market"}
        onClose={() => setViewing(null)}
        wide
      >
        {viewing ? (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Market data
              </p>
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LIVESTOCK_PHOTO_URLS.marketHero}
                  alt=""
                  className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-black tracking-tight text-slate-900">{viewing.name}</h4>
                    <StatusBadge status={viewing.status} />
                  </div>
                  <div className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-hidden">
                    {[...viewing.categories]
                      .sort((a, b) => categoryRank(a.name, a.slug) - categoryRank(b.name, b.slug))
                      .map((c) => (
                        <span
                          key={c.id}
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                            categoryChipClass(c.name)
                          )}
                        >
                          {categoryDisplayName(c, lang)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                User data
              </p>
              {viewing.assignedBrokers.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {viewing.assignedBrokers.map((broker) => (
                    <div
                      key={broker.id}
                      className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm"
                    >
                      <p className="text-[14px] font-black text-slate-900">{broker.name}</p>
                      <div className="mt-2 space-y-1.5">
                        <p className="flex items-center gap-2 truncate text-[12px] font-medium text-slate-600">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.25} />
                          {broker.email || "—"}
                        </p>
                        <p className="flex items-center gap-2 truncate text-[12px] font-medium text-slate-600">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.25} />
                          {broker.phone || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] font-medium text-slate-400">No brokers assigned to this market.</p>
              )}
            </section>

            {viewing.categories.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {viewing.categories.map((c) => {
                  const active = viewCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setViewCategoryId(c.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                        active
                          ? categoryChipClass(c.name)
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {categoryDisplayName(c, lang)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {viewing.categories.length ? (
              <MarketContents
                category={
                  viewing.categories.find((c) => c.id === viewCategoryId) ||
                  viewing.categories[0]
                }
              />
            ) : (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[13px] font-medium text-slate-500">
                No livestock categories assigned to this market.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={open}
        title={editId ? "Edit market" : "Create new market"}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-[13px] font-semibold leading-relaxed text-slate-700">
            Enter a market name. Livestock types are chosen by the broker at registration.
          </p>
          <Field label="Market *">
            <input
              autoFocus
              className={fieldCls}
              placeholder="Enter market name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select className={fieldCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <AdminSaveButton
            saving={saving}
            label={editId ? "Save changes" : "Create market"}
            onClick={() => void save()}
          />
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
