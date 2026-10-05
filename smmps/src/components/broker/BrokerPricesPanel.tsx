"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, Modal, Field, inputCls } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import {
  displaySeasonLabel,
  PRICE_SEASON_LABELS,
  publicSeasonLabelEn,
  publicSeasonLabelSo,
} from "@/lib/livestock-section-prices";
import { DateInput } from "@/components/ui/DateInput";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { adminLivestockName } from "@/lib/livestock-data";
import { ageClassLabel } from "@/lib/livestock-listing-meta";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";

type Price = {
  id: number;
  animalType: string;
  category: string | null;
  marketLocation: string;
  price: string;
  currency: string;
  description: string | null;
  dateRecorded: string;
  status: string;
  rejectionReason: string | null;
  market?: { id: number; name: string } | null;
  livestockType?: { id: number; name: string; nameSomali: string | null } | null;
  ageClass?: string | null;
};

type Scope = {
  markets: { id: number; name: string }[];
};

type Props = {
  allowedTypes?: string[];
  defaultType?: string;
};

export function BrokerPricesPanel({
  allowedTypes = ["CAMEL", "CATTLE", "GOAT"],
  defaultType = "CAMEL",
}: Props) {
  const { confirm, dialog } = useConfirmDialog();
  const { lang, t } = useLang();
  const B = TRANSLATIONS.brokerPortal;
  const types = allowedTypes.length ? allowedTypes : ["CAMEL", "CATTLE", "GOAT"];
  const typeKey = types.join(",");
  const initialType = types.includes(defaultType) ? defaultType : types[0]!;

  const empty = {
    animalType: initialType,
    category: "Birimo",
    marketId: "",
    marketLocation: "",
    price: "",
    currency: "USD",
    date: "",
    description: "",
    ageClass: "",
  };

  const [prices, setPrices] = useState<Price[]>([]);
  const [scope, setScope] = useState<Scope | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Price | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [marketId, setMarketId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [priceRes, scopeRes] = await Promise.all([
        fetch(`/api/livestock-prices?mine=1&status=APPROVED${q ? `&q=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/livestock/my-scope", { cache: "no-store" }),
      ]);
      const priceData = await priceRes.json().catch(() => ({}));
      const scopeData = await scopeRes.json().catch(() => ({}));
      if (!priceRes.ok) {
        setLoadError(priceData.error || t("Could not load price history", "Taariikhda qiimaha lama soo dejin"));
        setPrices([]);
      } else {
        setPrices(
          (Array.isArray(priceData.prices) ? priceData.prices : []).filter(
            (p: Price) =>
              Number(p.price) > 0 &&
              types.includes(p.animalType) &&
              String(p.status).toUpperCase() === "APPROVED"
          )
        );
      }
      if (scopeRes.ok && scopeData.scope) {
        setScope(scopeData.scope);
      }
    } catch {
      setLoadError(t("Could not load price history", "Taariikhda qiimaha lama soo dejin"));
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, [q, typeKey, t, types]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const markets = scope?.markets || [];
    if (!markets.length) return;
    if (marketId == null || !markets.some((m) => m.id === marketId)) {
      setMarketId(markets[0].id);
    }
  }, [scope, marketId]);

  function openEdit(p: Price) {
    const marketId = p.market?.id ? String(p.market.id) : scope?.markets[0] ? String(scope.markets[0].id) : "";
    setEditing(p);
    setForm({
      animalType: types.includes(p.animalType) ? p.animalType : initialType,
      category: displaySeasonLabel(p.category),
      marketId,
      marketLocation:
        livestockMarketDisplayName(p.market?.name || p.marketLocation, lang) ||
        p.market?.name ||
        p.marketLocation,
      price: String(p.price),
      currency: p.currency,
      date: p.dateRecorded.slice(0, 10),
      description: p.description || "",
      ageClass: ageClassLabel(p.ageClass, lang) || p.ageClass || "",
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        animalType: types.length === 1 ? types[0] : form.animalType,
        category: form.category,
        season: form.category,
        marketId: form.marketId ? Number(form.marketId) : undefined,
        marketLocation: form.marketLocation,
        price: form.price,
        currency: "USD",
        date: form.date,
        description:
          editing?.livestockType?.nameSomali ||
          editing?.livestockType?.name ||
          editing?.description ||
          form.description,
        ageClass: form.ageClass,
      };
      const res = await fetch("/api/livestock-prices", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setOpen(false);
      setNotice(
        data.queued
          ? t(
              "The price was updated and is now Pending. Admin will review it.",
              "Qiimaha waa la saxay oo Pending ayuu aaday. Admin ayaa aqbalaya."
            )
          : ""
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: t("Delete price?", "Tirtir qiimaha?"),
      description: t(
        "Permanently delete this price record. This cannot be undone.",
        "Si joogto ah uga tirtir diiwaankan qiimaha. Lama soo celin karo."
      ),
      confirmLabel: t("Delete price", "Tirtir qiimaha"),
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/livestock-prices?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {B.priceHistory[lang]}
          </h1>
        </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      ) : null}

      {scope?.markets && scope.markets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {scope.markets.map((market) => {
            const on = market.id === marketId;
            const label = livestockMarketDisplayName(market.name, lang).trim() || market.name;
            return (
              <button
                key={market.id}
                type="button"
                onClick={() => setMarketId(market.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition",
                  on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {(() => {
        const managed = scope?.markets || [];
        const selected = managed.find((m) => m.id === marketId) || managed[0];
        const selectedName = selected
          ? livestockMarketDisplayName(selected.name, lang).trim() || selected.name
          : "";
        const rows = selected
          ? prices.filter((row) => {
              if (row.market?.id === selected.id) return true;
              const label =
                livestockMarketDisplayName(row.market?.name || row.marketLocation, lang).trim() ||
                row.market?.name ||
                row.marketLocation;
              return label === selectedName;
            })
          : prices;
        return (
          <section className="space-y-2">
            {selectedName ? (
              <h2 className="text-sm font-black tracking-tight text-emerald-900">{selectedName}</h2>
            ) : null}
            <DataTable
              searchable
              onSearch={setQ}
              onRefresh={load}
              rows={rows}
              emptyText={loading ? B.loading[lang] : B.noLivePrices[lang]}
              columns={[
                {
                  key: "type",
                  header: lang === "so" ? "Magaca" : "Name",
                  render: (p) =>
                    adminLivestockName(p.livestockType?.name, p.livestockType?.nameSomali, lang) ||
                    p.description ||
                    p.animalType,
                },
                {
                  key: "ageClass",
                  header: lang === "so" ? "Da'da" : "Age",
                  render: (p) => ageClassLabel(p.ageClass, lang) || "—",
                },
                {
                  key: "category",
                  header: lang === "so" ? "Nooca" : "Type",
                  render: (p) =>
                    lang === "so"
                      ? publicSeasonLabelSo(p.category || "")
                      : publicSeasonLabelEn(p.category || ""),
                },
                {
                  key: "price",
                  header: lang === "so" ? "Qiimaha" : "Price",
                  render: (p) => `${p.price} ${p.currency}`,
                },
                {
                  key: "dateRecorded",
                  header: lang === "so" ? "Taariikhda" : "Date",
                  render: (p) => new Date(p.dateRecorded).toLocaleDateString(),
                },
              ]}
              actions={(p) => (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          </section>
        );
      })()}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("Edit price", "Sax qiimaha") : t("New price", "Qiimo cusub")}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              {t("Cancel", "Jooji")}
            </button>
            <AdminSaveButton
              label={t("Save", "Kaydi")}
              saving={saving}
              onClick={save}
              className="!min-w-[12rem]"
            />
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {t("Market", "Suuqa")}
            </p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900">
              {livestockMarketDisplayName(form.marketLocation, lang) || form.marketLocation || "—"}
            </p>
          </div>
          <Field label={t("Type", "Nooca")}>
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {PRICE_SEASON_LABELS.map((season) => (
                <option key={season} value={season}>
                  {lang === "so"
                    ? publicSeasonLabelSo(season)
                    : publicSeasonLabelEn(season)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Age", "Da'da")}>
            <input
              className={inputCls}
              value={ageClassLabel(form.ageClass, lang) || form.ageClass}
              placeholder={t("Example: 4 years", "Tusaale: 4 jir")}
              onChange={(e) => setForm({ ...form, ageClass: e.target.value })}
            />
          </Field>
          <Field label={t("Price", "Qiimaha")}>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Notes (optional)", "Faahfaahin (ikhtiyaar)")}>
              <textarea
                className={inputCls}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
