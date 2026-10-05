"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import {
  categorySlugFromAnimal,
  displaySeasonLabel,
  PRICE_SEASON_LABELS,
  seasonFromCategoryLabel,
  publicSeasonLabelEn,
  publicSeasonLabelSo,
} from "@/lib/livestock-section-prices";
import { DateInput } from "@/components/ui/DateInput";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { cn } from "@/lib/utils";
import { adminLivestockName } from "@/lib/livestock-data";
import { useLang } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { OwnerSelectCard } from "@/components/broker/OwnerSelectCard";

type RejectedPrice = {
  id: number;
  animalType: string;
  price: string;
  currency: string;
  description: string | null;
  rejectionReason: string | null;
  category: string | null;
  dateRecorded: string;
  marketLocation: string;
  livestockTypeId?: number | null;
  market?: { id: number; name: string } | null;
  ageClass?: string | null;
  livestockType?: { id?: number; name: string; nameSomali: string | null } | null;
};

function typeName(p: RejectedPrice, lang: "en" | "so") {
  return (
    adminLivestockName(p.livestockType?.name, p.livestockType?.nameSomali, lang) ||
    p.description ||
    p.animalType
  );
}

function photoKeys(p: RejectedPrice) {
  const name = typeName(p, "en");
  const id = p.livestockTypeId || p.livestockType?.id;
  return [id ? `${name}__${id}` : "", name].filter(Boolean);
}

export function BrokerRejectedPricesFix() {
  const { confirm, dialog } = useConfirmDialog();
  const { lang, t } = useLang();
  const [rows, setRows] = useState<RejectedPrice[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<RejectedPrice | null>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("Birimo");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [marketId, setMarketId] = useState("");
  const [marketLocation, setMarketLocation] = useState("");
  const [ageClass, setAgeClass] = useState("");
  const [markets, setMarkets] = useState<{ id: number; name: string }[]>([]);
  const [email, setEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoPreview = useFileObjectUrl(photoFile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [res, scopeRes, marketsRes] = await Promise.all([
      fetch("/api/livestock-prices?mine=1&status=REJECTED", {
        cache: "no-store",
      }),
      fetch("/api/livestock/my-scope", { cache: "no-store" }),
      fetch("/api/markets/public", { cache: "no-store" }),
    ]);
    const scopeData = await scopeRes.json().catch(() => ({}));
    const marketsData = await marketsRes.json().catch(() => ({}));
    const fromScope = scopeRes.ok && Array.isArray(scopeData.scope?.markets) ? scopeData.scope.markets : [];
    const fromPublic = Array.isArray(marketsData.markets) ? marketsData.markets : [];
    const merged = new Map<number, { id: number; name: string }>();
    for (const m of [...fromPublic, ...fromScope]) {
      if (m?.id) merged.set(Number(m.id), { id: Number(m.id), name: String(m.name || "") });
    }
    setMarkets([...merged.values()]);
    if (scopeRes.ok) setEmail(String(scopeData.account?.email || ""));
    const data = await res.json().catch(() => ({}));
    const list = (Array.isArray(data.prices) ? data.prices : []).filter(
      (p: RejectedPrice) => Number(p.price) > 0
    ) as RejectedPrice[];
    setRows(list);

    const nextPhotos: Record<string, string> = {};
    const keys = new Set(
      list.map(
        (p) =>
          `${categorySlugFromAnimal(p.animalType)}:${seasonFromCategoryLabel(p.category)}`
      )
    );
    await Promise.all(
      [...keys].map(async (key) => {
        const [slug, s] = key.split(":");
        const photoRes = await fetch(
          `/api/livestock/type-photos?slug=${slug}&season=${s}&scope=listing`,
          { cache: "no-store", credentials: "include" }
        );
        const json = await photoRes.json().catch(() => ({}));
        const map = (json.photos || {}) as Record<string, string>;
        Object.assign(nextPhotos, map);
      })
    );
    setPhotos(nextPhotos);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function photoUrl(p: RejectedPrice) {
    for (const key of photoKeys(p)) {
      if (photos[key]) return photos[key];
    }
    return "";
  }

  function openEdit(row: RejectedPrice) {
    setEditing(row);
    setName(typeName(row, lang));
    setSeason(displaySeasonLabel(row.category) || "Birimo");
    setPrice(String(row.price));
    setNotes(typeName(row, lang));
    setDate(row.dateRecorded.slice(0, 10));
    setMarketId(row.market?.id ? String(row.market.id) : "");
    setMarketLocation(
      livestockMarketDisplayName(row.market?.name || row.marketLocation, lang) ||
        row.market?.name ||
        row.marketLocation ||
        ""
    );
    setAgeClass(row.ageClass || "");
    setPhotoFile(null);
    setError("");
  }

  const editPreview = useMemo(() => {
    if (photoPreview) return photoPreview;
    return editing ? photoUrl(editing) : "";
  }, [photoPreview, editing, photos]);

  async function save() {
    if (!editing) return;
    const next = Number(price);
    if (!name.trim()) {
      setError(t("Enter the livestock name.", "Geli magaca xoolaha."));
      return;
    }
    if (!Number.isFinite(next) || next <= 0) {
      setError(t("Enter a valid price.", "Geli qiimo sax ah."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const typeId = editing.livestockTypeId || editing.livestockType?.id;
      if (photoFile) {
        const slug = categorySlugFromAnimal(editing.animalType);
        const form = new FormData();
        form.append("slug", slug);
        form.append("typeName", typeId ? `${name.trim()}__${typeId}` : name.trim());
        form.append("season", season.toLowerCase().includes("sugunto") ? "sugunto" : "birimo");
        form.append("kind", "listing");
        form.append("image", photoFile);
        const photoRes = await fetch("/api/livestock/type-photos", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!photoRes.ok) {
          const d = await photoRes.json().catch(() => ({}));
          setError(d.error || t("The photo was not saved.", "Sawirka lama kaydin."));
          return;
        }
      }

      const res = await fetch("/api/livestock-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          price: next,
          typeName: name.trim(),
          description: notes.trim() || name.trim(),
          category: season,
          season,
          date,
          marketId: marketId ? Number(marketId) : undefined,
          marketLocation,
          ageClass,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("Could not submit.", "Lama gudbin."));
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: t("Delete this price?", "Tirtir qiimahan?"),
      description: t("The rejected price will be deleted.", "Qiimaha la diiday waa la tirtiri doonaa."),
      confirmLabel: t("Delete", "Tirtir"),
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/livestock-prices?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-rose-100 bg-white shadow-[0_12px_40px_rgba(225,29,72,0.08)]">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-500">
            Admin
          </p>
          <h2 className="mt-0.5 text-lg font-black text-slate-900">
            {t("Rejected prices", "Qiimo la diiday")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {t("Fix the name, price, and photo, then resubmit.", "Sax magaca, qiimaha, iyo sawirka, kadib dib u gudbi.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-[12px] font-bold text-rose-700 hover:bg-rose-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t("Refresh", "Cusboonaysii")}
        </button>
      </div>

      <ul className="divide-y divide-rose-50">
        {rows.map((row) => {
          const src = photoUrl(row);
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-rose-50/40"
            >
              <span className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-contain bg-[#f7f4ee]" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-rose-300">
                    <ImagePlus className="h-6 w-6" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-black text-slate-900">{typeName(row, lang)}</p>
                  <StatusBadge status="REJECTED" />
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {(lang === "so"
                    ? publicSeasonLabelSo(row.category || "")
                    : publicSeasonLabelEn(row.category || ""))}{" "}
                  ·{" "}
                  {livestockMarketDisplayName(row.market?.name || row.marketLocation, lang).trim() ||
                    row.market?.name ||
                    row.marketLocation}
                </p>
                <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900">
                  {row.price} {row.currency}
                  <span className="ml-2 text-xs font-semibold text-slate-400">
                    {new Date(row.dateRecorded).toLocaleDateString()}
                  </span>
                </p>
                {row.rejectionReason ? (
                  <p className="mt-1 text-sm font-semibold text-rose-600">
                    {row.rejectionReason}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0a5240] px-3.5 text-[12px] font-bold text-white hover:bg-[#083f31]"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("Fix", "Sax")}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  title="Tirtir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t("Fix rejected price", "Sax qiimaha la diiday")}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              {t("Cancel", "Jooji")}
            </button>
            <AdminSaveButton
              label={t("Submit for approval", "U gudbi ansixinta")}
              saving={saving}
              onClick={() => void save()}
              className="!min-w-[12rem]"
            />
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">
              {error}
            </p>
          ) : null}
          {editing?.rejectionReason ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 sm:col-span-2">
              {t("Reason:", "Sababta:")} {editing.rejectionReason}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {t("Photo (you can change it)", "Sawirka (waad beddeli kartaa)")}
            </span>
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
              <span className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {editPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editPreview} alt="" className="h-full w-full object-contain bg-[#f7f4ee]" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImagePlus className="h-6 w-6" />
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {t("Tap to choose a new photo", "Taabo si aad sawir cusub u doorato")}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="sm:col-span-2">
            <OwnerSelectCard
              label={t("Market", "Suuqa")}
              valueId={marketId || "market"}
              locked={false}
              options={
                markets.length
                  ? markets.map((m) => ({
                      id: String(m.id),
                      title: livestockMarketDisplayName(m.name, lang).trim() || m.name,
                      subtitle: email || undefined,
                    }))
                  : [
                      {
                        id: "market",
                        title: marketLocation || t("Assigned market", "Suuqa loo qoondeeyey"),
                        subtitle: email || undefined,
                      },
                    ]
              }
              onChange={(id) => {
                const market = markets.find((m) => String(m.id) === id);
                setMarketId(id);
                setMarketLocation(
                  livestockMarketDisplayName(market?.name, lang) || market?.name || marketLocation
                );
              }}
            />
            <div className="mt-3">
              <Field label={t("Market name", "Magaca suuqa")}>
                <input
                  className={inputCls}
                  value={livestockMarketDisplayName(marketLocation, lang) || marketLocation}
                  onChange={(e) => setMarketLocation(e.target.value)}
                />
              </Field>
            </div>
          </div>
          <Field label={t("Livestock name", "Magaca xoolaha")}>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t("Age", "Da'da")}>
            <input
              className={inputCls}
              value={ageClass}
              placeholder={t("Example: 4 years", "Tusaale: 4 jir")}
              onChange={(e) => setAgeClass(e.target.value)}
            />
          </Field>
          <Field label={t("Type", "Nooca")}>
            <select
              className={inputCls}
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              {PRICE_SEASON_LABELS.map((label) => (
                <option key={label} value={label}>
                  {lang === "so"
                    ? publicSeasonLabelSo(label)
                    : publicSeasonLabelEn(label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Price (USD)", "Qiimaha (USD)")}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                $
              </span>
              <input
                className={cn(inputCls, "pl-7")}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </Field>
          <Field label={t("Date", "Taariikhda")}>
            <DateInput
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Notes (optional)", "Faahfaahin (ikhtiyaar)")}>
              <textarea
                className={inputCls}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
