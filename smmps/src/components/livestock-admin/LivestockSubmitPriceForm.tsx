"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, PanelCard } from "@/components/super-admin/AdminPagePrimitives";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { Field, inputCls } from "@/components/ui/DataTable";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { OwnerSelectCard } from "@/components/broker/OwnerSelectCard";
import { adminLivestockName } from "@/lib/livestock-data";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { PRICE_SEASON_LABELS, livestockPriceError } from "@/lib/livestock-section-prices";
import { DateInput } from "@/components/ui/DateInput";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

type Scope = {
  markets: { id: number; name: string }[];
  categories: { id: number; name: string; nameSomali: string | null }[];
  animalTypes: { id: number; categoryId: number; name: string; nameSomali: string | null; unit: string | null }[];
};

export function LivestockSubmitPriceForm() {
  const { lang, t } = useLang();
  const [scope, setScope] = useState<Scope | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useActionMessage(2800);
  const [form, setForm] = useState({
    marketId: "",
    categoryId: "",
    livestockTypeId: "",
    season: "Birimo",
    price: "",
    currency: "USD",
    unit: "head",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livestock/my-scope", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load your assignments");
        if (cancelled) return;
        const nextScope = json.scope as Scope;
        setScope(nextScope);
        setEmail(String(json.account?.email || ""));
        const marketId = String(nextScope.markets[0]?.id ?? "");
        const categoryId = String(nextScope.categories[0]?.id ?? "");
        const type =
          nextScope.animalTypes.find((t) => String(t.categoryId) === categoryId) ||
          nextScope.animalTypes[0];
        setForm((prev) => ({
          ...prev,
          marketId: prev.marketId || marketId,
          categoryId: prev.categoryId || categoryId,
          livestockTypeId: prev.livestockTypeId || String(type?.id ?? ""),
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load assignments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo(() => {
    if (!scope || !form.categoryId) return [];
    return scope.animalTypes.filter((t) => String(t.categoryId) === form.categoryId);
  }, [scope, form.categoryId]);

  async function submit() {
    const cap = livestockPriceError(Number(form.price));
    if (cap) {
      setMessage({ type: "error", text: cap });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/livestock/submit-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: Number(form.marketId),
          categoryId: Number(form.categoryId),
          livestockTypeId: Number(form.livestockTypeId),
          season: form.season,
          price: Number(form.price),
          currency: "USD",
          unit: "head",
          date: form.date,
          notes: form.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit price");
      setMessage({
        type: "ok",
        text: json.skipped
          ? json.message || "This price is already approved."
          : "Price submitted for admin approval.",
      });
      setForm((prev) => ({ ...prev, price: "", notes: "" }));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Submit failed" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  const category = scope?.categories.find((c) => String(c.id) === form.categoryId) || scope?.categories[0];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <AdminPageHeader
        title="Submit Market Price"
        subtitle="Geli qiimaha suuqa. admin waa inuu aqbalo ka hor inta uusan dadweynaha u muuqan."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div
          className={cn(
            "mb-4 rounded-xl px-4 py-3 text-sm font-semibold",
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {message.text}
        </div>
      )}
      {!scope?.markets.length || !scope.categories.length ? (
        <PanelCard>
          <p className="text-sm font-medium text-slate-500">
            You have no active livestock markets yet. Add a market first, then enter prices.
          </p>
        </PanelCard>
      ) : (
        <PanelCard title="Price details">
          <div className="space-y-3">
            <OwnerSelectCard
              label="Account"
              locked
              valueId="account"
              options={[
                {
                  id: "account",
                  title: category?.name
                    ? adminLivestockName(category.name, category.nameSomali, lang) || category.name
                    : "Livestock",
                  subtitle: email || undefined,
                },
              ]}
            />
            <OwnerSelectCard
              label="Market"
              valueId={form.marketId}
              locked={false}
              options={scope.markets.map((m) => ({
                id: String(m.id),
                title: livestockMarketDisplayName(m.name, lang).trim() || m.name,
                subtitle: email || undefined,
              }))}
              onChange={(id) => setForm({ ...form, marketId: id })}
            />
            <Field label={t("Type", "Nooca")}>
              <select
                className={inputCls}
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              >
                {PRICE_SEASON_LABELS.map((season) => (
                  <option key={season} value={season}>
                    {lang === "so"
                      ? season
                      : season === "Sugunto"
                        ? "Second Class (Sugunto)"
                        : "First Class (Birimo)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                className={inputCls}
                value={form.categoryId}
                onChange={(e) => {
                  const categoryId = e.target.value;
                  const nextType =
                    scope?.animalTypes.find((t) => String(t.categoryId) === categoryId) ||
                    scope?.animalTypes[0];
                  setForm({
                    ...form,
                    categoryId,
                    livestockTypeId: String(nextType?.id ?? ""),
                  });
                }}
              >
                {(scope?.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {adminLivestockName(c.name, c.nameSomali, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Animal type">
              <select
                className={inputCls}
                value={form.livestockTypeId}
                onChange={(e) => setForm({ ...form, livestockTypeId: e.target.value })}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {adminLivestockName(t.name, t.nameSomali, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Date">
                <DateInput
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea
                className={inputCls}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AdminSaveButton
              saving={saving}
              label="Submit price"
              disabled={!form.marketId || !form.categoryId || !form.livestockTypeId || !form.price}
              onClick={() => void submit()}
            />
            {types.length === 0 ? (
              <p className="text-xs font-medium text-amber-700">
                No animal type is assigned to this account. Ask an admin to complete your catalog assignment.
              </p>
            ) : null}
          </div>
        </PanelCard>
      )}
    </div>
  );
}
