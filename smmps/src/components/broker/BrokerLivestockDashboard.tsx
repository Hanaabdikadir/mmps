"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, ImagePlus, Pencil, Plus } from "lucide-react";
import { type LivestockCategorySlug, livestockTypeLabel } from "@/lib/livestock-data";
import {
  parseUsd,
  canonicalTypeName,
  fieldCategoryFromTypeName,
  newCustomFieldCategory,
  MAX_LIVESTOCK_PRICE_USD,
  defaultNamedFields,
  isRetiredLivestockType,
  RETIRED_LIVESTOCK_TYPE_ERROR,
  publicSeasonLabelEn,
  publicSeasonLabelSo,
  type NamedPriceField,
  type SeasonKey,
} from "@/lib/livestock-section-prices";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/lib/use-url-tab";
import { livestockTypePhoto } from "@/lib/livestock-type-visuals";
import { LivestockAgeOriginFields } from "@/components/livestock/LivestockAgeOriginFields";
import { useLang } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import {
  normalizeAgeClass,
  normalizeOriginPlace,
  sameAgeClass,
  sameOriginPlace,
} from "@/lib/livestock-listing-meta";

type Props = {
  slug: LivestockCategorySlug;
  initialFields: NamedPriceField[];
};

type MarketOption = { id: number; name: string };

type FieldStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT" | string;

const TABS: Record<
  SeasonKey,
  {
    label: string;
    activeTab: string;
    idleTab: string;
  }
> = {
  birimo: {
    label: "Birimo",
    activeTab: "bg-orange-500 text-white shadow-sm",
    idleTab: "bg-white text-orange-950 hover:bg-orange-50",
  },
  sugunto: {
    label: "Sugunto",
    activeTab: "bg-teal-600 text-white shadow-sm",
    idleTab: "bg-white text-teal-950 hover:bg-teal-50",
  },
};

function withOfficialTypes(
  slug: LivestockCategorySlug,
  fields: NamedPriceField[]
): NamedPriceField[] {
  const defaults = defaultNamedFields(slug, { emptyPrices: true });
  const byKey = new Map(
    fields.map((f) => [
      `${f.season}:${canonicalTypeName(f.name).toLowerCase()}`,
      f,
    ])
  );
  const used = new Set<string>();
  const merged: NamedPriceField[] = [];
  for (const d of defaults) {
    if (isRetiredLivestockType(d.name)) continue;
    const key = `${d.season}:${canonicalTypeName(d.name).toLowerCase()}`;
    const hit = byKey.get(key);
    used.add(key);
    merged.push(
      hit
        ? { ...d, ...hit, name: d.name || hit.name, season: d.season }
        : d
    );
  }
  for (const f of fields) {
    if (isRetiredLivestockType(f.name)) continue;
    const key = `${f.season}:${canonicalTypeName(f.name).toLowerCase()}`;
    if (used.has(key)) continue;
    used.add(key);
    merged.push(f);
  }
  return merged;
}

function StatusPill({ status, price }: { status?: FieldStatus; price?: number }) {
  const { t } = useLang();
  const key = (status || "").toUpperCase();
  if (!key) return null;
  const namedOnly =
    !(Number(price) > 0) && (key === "DRAFT" || key === "PENDING");
  const label = namedOnly
    ? t("Saved", "La kaydiyey")
    : key === "APPROVED"
      ? t("Live", "Toos")
      : key === "PENDING"
        ? t("Pending", "Sugaya")
        : key === "REJECTED"
          ? t("Rejected", "La diiday")
          : key.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-black uppercase tracking-wide",
        namedOnly
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : key === "APPROVED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : key === "PENDING"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : key === "REJECTED"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      {label}
    </span>
  );
}

export function BrokerLivestockDashboard({ slug, initialFields }: Props) {
  const { lang, t } = useLang();
  const [active, setActive] = useUrlTab(
    ["birimo", "sugunto", "pending"] as const,
    "birimo"
  );
  const [fields, setFields] = useState<NamedPriceField[]>(() =>
    withOfficialTypes(slug, initialFields)
  );
  const [pendingFields, setPendingFields] = useState<NamedPriceField[]>([]);
  const loadedSnapshotRef = useRef<
    Record<
      string,
      { name: string; price: number; ageClass?: string; originPlace?: string }
    >
  >(
    Object.fromEntries(
      initialFields.map((f) => [
        f.category,
        {
          name: f.name.trim(),
          price: f.price,
          ageClass: f.ageClass || "",
          originPlace: f.originPlace || "",
        },
      ])
    )
  );
  const pendingOriginalRef = useRef<Record<number, number>>({});
  const pendingDirtyRef = useRef<Set<number>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>(
    {}
  );
  const [savedPhotos, setSavedPhotos] = useState<
    Record<SeasonKey, Record<string, string>>
  >({ birimo: {}, sugunto: {} });
  const [pendingPhotos, setPendingPhotos] = useState<
    Record<
      string,
      { file: File; preview: string; season: SeasonKey; typeName: string }
    >
  >({});
  const pendingPhotosRef = useRef(pendingPhotos);
  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    () => initialFields.find((f) => f.season === "birimo")?.category || initialFields[0]?.category || ""
  );
  const [priceDraft, setPriceDraft] = useState("");
  const [pendingDrafts, setPendingDrafts] = useState<Record<number, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAgeClass, setNewAgeClass] = useState("");
  const [newOriginPlace, setNewOriginPlace] = useState("");
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const newPhotoPreview = useFileObjectUrl(newPhoto);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
    warn?: boolean;
  } | null>(null);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [marketId, setMarketId] = useState<number | null>(null);
  const marketIdRef = useRef<number | null>(null);
  useEffect(() => {
    marketIdRef.current = marketId;
  }, [marketId]);

  const load = useCallback(async (overrideMarketId?: number | null) => {
    const activeMarketId =
      overrideMarketId !== undefined ? overrideMarketId : marketIdRef.current;
    const qs = new URLSearchParams({ slug });
    if (activeMarketId) qs.set("marketId", String(activeMarketId));
    const res = await fetch(`/api/broker/section-prices?${qs.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.markets)) {
      const nextMarkets = (data.markets as MarketOption[]).filter(
        (m) => Number.isFinite(m.id) && m.id > 0
      );
      setMarkets(nextMarkets);
      const nextId = Number(data.marketId) || nextMarkets[0]?.id || null;
      marketIdRef.current = nextId;
      setMarketId(nextId);
    }
    if (res.ok && Array.isArray(data.fields)) {
      const liveOnly = (data.fields as NamedPriceField[]).filter((f) => {
        const status = String(f.status || "").toUpperCase();
        if (!status || !f.id) return true;
        return status === "APPROVED";
      });
      const next = withOfficialTypes(slug, liveOnly);
      setFields(next);
      loadedSnapshotRef.current = Object.fromEntries(
        next.map((f: NamedPriceField) => [
          f.category,
          {
            name: f.name.trim(),
            price: f.price,
            ageClass: f.ageClass || "",
            originPlace: f.originPlace || "",
          },
        ])
      );
    }
    if (res.ok && Array.isArray(data.pendingFields)) {
      const pendingOnly = (data.pendingFields as NamedPriceField[]).filter(
        (f) => !isRetiredLivestockType(f.name)
      );
      setPendingFields(pendingOnly);
      setPendingDrafts(
        Object.fromEntries(
          pendingOnly
            .filter((f) => Number(f.id) > 0)
            .map((f) => [
              Number(f.id),
              f.price > 0 ? String(f.price) : "",
            ])
        )
      );
      pendingOriginalRef.current = Object.fromEntries(
        pendingOnly
          .filter((f) => Number(f.id) > 0)
          .map((f) => [Number(f.id), Number(f.price) || 0])
      );
      pendingDirtyRef.current = new Set();
    }
    if (res.ok && data.statuses && typeof data.statuses === "object") {
      setStatuses(data.statuses as Record<string, FieldStatus>);
    }
    if (res.ok && data.rejectionReasons && typeof data.rejectionReasons === "object") {
      setRejectionReasons(data.rejectionReasons as Record<string, string>);
    }
  }, [slug]);

  function photoQueueKey(season: SeasonKey, name: string) {
    return `${season}:${canonicalTypeName(name) || name.trim().toLowerCase()}`;
  }

  function queuedPreview(season: SeasonKey, name: string) {
    return pendingPhotos[photoQueueKey(season, name)]?.preview || "";
  }

  function typePreviewSrc(season: SeasonKey, name: string) {
    return queuedPreview(season, name) || livestockTypePhoto(slug, name, season);
  }

  function photoForType(season: SeasonKey, name: string) {
    return typePreviewSrc(season, name);
  }

  const loadPhotos = useCallback(
    async (season: SeasonKey = active === "pending" ? "birimo" : active) => {
      const photoRes = await fetch(
        `/api/livestock/type-photos?slug=${slug}&season=${season}&scope=listing`,
        { cache: "no-store", credentials: "include" }
      );
      const photos = await photoRes.json().catch(() => ({}));
      const next =
        photos.photos && typeof photos.photos === "object"
          ? (photos.photos as Record<string, string>)
          : {};
      setSavedPhotos((prev) => ({ ...prev, [season]: next }));
    },
    [slug, active]
  );

  useEffect(() => {
    void load();
    void loadPhotos();
  }, [load, loadPhotos]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/livestock/catalog?all=1", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { categories?: { id: number; slug?: string }[] }) => {
        if (cancelled) return;
        const match = (data.categories || []).find((c) => c.slug === slug);
        setCategoryId(match?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setCategoryId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return () => {
      Object.values(pendingPhotosRef.current).forEach((item) =>
        URL.revokeObjectURL(item.preview)
      );
    };
  }, []);

  const visible = useMemo(() => {
    const rows =
      active === "pending"
        ? pendingFields
        : fields.filter((f) => f.season === active);
    return rows.filter((f) => !isRetiredLivestockType(f.name));
  }, [fields, pendingFields, active]);

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: NamedPriceField[] = [];
    for (const f of visible) {
      if (isRetiredLivestockType(f.name)) continue;
      if (seen.has(f.category)) continue;
      seen.add(f.category);
      out.push(f);
    }
    return out;
  }, [visible]);

  useEffect(() => {
    if (!visible.length) {
      setSelectedCategory("");
      return;
    }
    if (!visible.some((f) => f.category === selectedCategory)) {
      setSelectedCategory(visible[0].category);
    }
  }, [visible, selectedCategory]);

  const selected = visible.find((f) => f.category === selectedCategory) || visible[0] || null;

  function fieldStatus(field: NamedPriceField): FieldStatus | undefined {
    if (active === "pending") return "PENDING";
    return (
      statuses[field.category] ||
      statuses[field.category.toUpperCase()] ||
      statuses[`${field.season}:${canonicalTypeName(field.name).toLowerCase()}`]
    );
  }

  useEffect(() => {
    setPriceDraft("");
  }, [selected?.category, active]);

  function updateField(category: string, patch: Partial<NamedPriceField>) {
    setFields((prev) =>
      prev.map((f) => (f.category === category ? { ...f, ...patch } : f))
    );
  }

  function updatePendingDraft(id: number, raw: string) {
    const next = parseUsd(raw);
    if (next > MAX_LIVESTOCK_PRICE_USD) {
      setMessage({
        ok: false,
        text: `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`,
      });
      return;
    }
    setMessage(null);
    setPendingDrafts((prev) => ({ ...prev, [id]: raw.replace(/[^0-9.]/g, "") }));
    pendingDirtyRef.current.add(id);
    setPendingFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, price: next } : f))
    );
  }

  const pendingCount = pendingFields.length;

  function queueTypePhoto(fieldName: string, file: File, seasonOverride?: SeasonKey) {
    if (!fieldName.trim()) {
      setMessage({ ok: false, text: t("The type name was not found.", "Magaca nooca lama helin.") });
      return;
    }
    const season: SeasonKey =
      seasonOverride ||
      (active === "pending" ? selected?.season || "birimo" : active);
    const key = photoQueueKey(season, fieldName);
    const preview = URL.createObjectURL(file);
    setPendingPhotos((prev) => {
      const previous = prev[key];
      if (previous) URL.revokeObjectURL(previous.preview);
      return {
        ...prev,
        [key]: { file, preview, season, typeName: fieldName.trim() },
      };
    });
    setMessage({
      ok: true,
      text: t(
        `Photo for ${fieldName} is selected. Press Save to keep it.`,
        `Sawirka ${fieldName} waa la doortay. Guji Save si loo kaydiyo.`
      ),
    });
  }

  async function uploadQueuedPhotos() {
    const queued = Object.values(pendingPhotosRef.current);
    if (!queued.length) return true;
    const seasons = new Set<SeasonKey>();
    for (const item of queued) {
      const form = new FormData();
      form.append("slug", slug);
      form.append("typeName", item.typeName);
      form.append("season", item.season);
      form.append("image", item.file);
      form.append("kind", "listing");
      const res = await fetch("/api/livestock/type-photos", {
        method: "POST",
        body: form,
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || t("The photo was not saved.", "Sawirka lama kaydin.") });
        return false;
      }
      if (data.photos && typeof data.photos === "object") {
        setSavedPhotos((prev) => ({
          ...prev,
          [item.season]: data.photos as Record<string, string>,
        }));
      }
      seasons.add(item.season);
    }
    for (const item of queued) URL.revokeObjectURL(item.preview);
    setPendingPhotos({});
    await Promise.all([...seasons].map((season) => loadPhotos(season)));
    return true;
  }

  async function save() {
    const cents = (n: unknown) => Math.round(Number(n) * 100);
    const queuedCount = Object.keys(pendingPhotosRef.current).length;

    if (active === "pending") {
      const changedItems = pendingFields
        .filter((f) => Number(f.id) > 0)
        .map((f) => {
          const price = parseUsd(pendingDrafts[Number(f.id)] ?? f.price);
          return { ...f, name: f.name.trim(), price };
        })
        .filter((f) => {
          const original = pendingOriginalRef.current[Number(f.id)] ?? 0;
          const dirty = pendingDirtyRef.current.has(Number(f.id));
          return f.name && f.price > 0 && (dirty || cents(f.price) !== cents(original));
        });

      for (const item of changedItems) {
        if (item.price > MAX_LIVESTOCK_PRICE_USD) {
          setMessage({
            ok: false,
            text: `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`,
          });
          return;
        }
        const liveDup = fields.some((f) => {
          if (f.season !== item.season) return false;
          if (
            canonicalTypeName(f.name).toLowerCase() !==
            canonicalTypeName(item.name).toLowerCase()
          ) {
            return false;
          }
          const snap = loadedSnapshotRef.current[f.category];
          return (
            sameAgeClass(snap?.ageClass || f.ageClass, item.ageClass) &&
            sameOriginPlace(snap?.originPlace || f.originPlace, item.originPlace)
          );
        });
        const pendingDup = pendingFields.some(
          (f) =>
            f.id !== item.id &&
            f.season === item.season &&
            canonicalTypeName(f.name).toLowerCase() ===
              canonicalTypeName(item.name).toLowerCase() &&
            String(f.status || "PENDING").toUpperCase() !== "REJECTED" &&
            sameAgeClass(f.ageClass, item.ageClass) &&
            sameOriginPlace(f.originPlace, item.originPlace)
        );
        if (liveDup || pendingDup) {
          setMessage({
            ok: false,
          text: t(
            "This type already exists with the same age and origin. Choose a different age or origin.",
            "Noocan daada iyo meesha isku mid ah horay ayuu u jiraa. Dooro daa ama meel ka duwan."
          ),
          });
          return;
        }
      }

      if (!queuedCount && changedItems.length === 0) {
        setMessage({
          ok: false,
          warn: true,
        text: t("Nothing changed. Fix the pending price, then Save.", "Waxba lama beddelin. Sax qiimaha pending-ka, ka dib Save."),
        });
        return;
      }

      setSaving(true);
      setMessage(null);
      try {
        const photosOk = await uploadQueuedPhotos();
        if (!photosOk) return;
        if (changedItems.length === 0) {
          setMessage({ ok: true, text: t("Your photo was saved.", "Sawirkaaga waa la kaydiyey.") });
          return;
        }
        const res = await fetch("/api/broker/section-prices", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketId: marketIdRef.current,
            items: changedItems.map((f) => ({
              id: f.id,
              category: f.category,
              name: f.name.trim(),
              price: f.price,
              season: f.season,
              ageClass: f.ageClass || "",
              originPlace: f.originPlace || "",
            })),
            deleted: [],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage({ ok: false, text: data.error || "Could not save prices" });
          return;
        }
        await load();
        setMessage({
          ok: true,
          text: t(
            "The price was corrected and sent back to the admin.",
            "Qiimaha waa la saxay. Kan la diiday dib ayaa loo gudbiyey maamulka."
          ),
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    const draftPrice = parseUsd(priceDraft);
    const overLimit = draftPrice > MAX_LIVESTOCK_PRICE_USD;
    if (overLimit) {
      setMessage({
        ok: false,
        text: `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`,
      });
      return;
    }
    if (selected && draftPrice > 0 && !photoForType(selected.season, selected.name)) {
      setMessage({
        ok: false,
        text: t(
          `Your photo is required: add a photo of ${selected.name} before Save.`,
          `Sawirkaaga waa qasab: soo geli sawirka ${selected.name} ka hor Save.`
        ),
      });
      return;
    }
    const snap = selected ? loadedSnapshotRef.current[selected.category] : undefined;
    const ageNow = selected ? selected.ageClass || "" : "";
    const originNow = selected ? selected.originPlace || "" : "";
    const metaChanged = Boolean(
      selected &&
        snap &&
        (String(snap.ageClass || "") !== ageNow ||
          String(snap.originPlace || "") !== originNow)
    );
    const savePrice = draftPrice > 0 ? draftPrice : Number(selected?.price) || 0;
    if (selected && savePrice > 0 && !normalizeAgeClass(ageNow)) {
      setMessage({
        ok: false,
        text: "Qor daada xoolaha.",
      });
      return;
    }
    if (selected && savePrice > 0 && !normalizeOriginPlace(originNow)) {
      setMessage({
        ok: false,
        text: "Qor meesha xoolaha laga keenay.",
      });
      return;
    }
    if (selected && normalizeAgeClass(ageNow) && normalizeOriginPlace(originNow)) {
      const liveDup = fields.some((f) => {
        if (f.category === selected.category) return false;
        if (f.season !== selected.season) return false;
        if (
          canonicalTypeName(f.name).toLowerCase() !==
          canonicalTypeName(selected.name).toLowerCase()
        ) {
          return false;
        }
        const live = loadedSnapshotRef.current[f.category];
        return (
          sameAgeClass(live?.ageClass || f.ageClass, ageNow) &&
          sameOriginPlace(live?.originPlace || f.originPlace, originNow)
        );
      });
      const pendingDup = pendingFields.some(
        (f) =>
          f.season === selected.season &&
          canonicalTypeName(f.name).toLowerCase() ===
            canonicalTypeName(selected.name).toLowerCase() &&
          String(f.status || "PENDING").toUpperCase() !== "REJECTED" &&
          sameAgeClass(f.ageClass, ageNow) &&
          sameOriginPlace(f.originPlace, originNow)
      );
      if (liveDup || pendingDup) {
        setMessage({
          ok: false,
        text: t(
            "This type already exists with the same age and origin. Choose a different age or origin.",
            "Noocan daada iyo meesha isku mid ah horay ayuu u jiraa. Dooro daa ama meel ka duwan."
          ),
        });
        return;
      }
    }
    const pricesChanged = draftPrice > 0 || metaChanged;
    if (!queuedCount && !pricesChanged) {
      setMessage({
        ok: false,
        warn: true,
        text: t("Nothing changed. Change your photo or the price, then Save.", "Waxba lama beddelin. Beddel sawirkaaga ama qiimaha, ka dib Save."),
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const photosOk = await uploadQueuedPhotos();
      if (!photosOk) return;

      const priceChanged =
        draftPrice > 0 &&
        cents(draftPrice) !==
          cents(Number(snap?.price) || Number(selected?.price) || 0);
      const changedItems = selected && (priceChanged || metaChanged)
        ? [
            {
              ...selected,
              name: selected.name.trim(),
              price: savePrice,
              ageClass: ageNow,
              originPlace: originNow,
            },
          ].filter((f) => f.name && f.price > 0)
        : [];
      if (!queuedCount && changedItems.length === 0) {
        setMessage({
          ok: false,
          warn: true,
          text: t("Nothing changed. Change your photo or the price, then Save.", "Waxba lama beddelin. Beddel sawirkaaga ama qiimaha, ka dib Save."),
        });
        return;
      }

      if (changedItems.length === 0) {
        setMessage({
          ok: true,
          text: t("Your photo was saved.", "Sawirkaaga waa la kaydiyey."),
        });
        return;
      }

      const res = await fetch("/api/broker/section-prices", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            marketId: marketIdRef.current,
            items: changedItems.map((f) => ({
              id: f.id,
              category: f.category,
              name: f.name.trim(),
              price: f.price,
              season: f.season,
              ageClass: f.ageClass || "",
              originPlace: f.originPlace || "",
            })),
          deleted: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || "Could not save prices" });
        return;
      }
      await load();
      setPriceDraft("");
      setActive("pending");
      setMessage({
        ok: true,
        text: data.saved
          ? t(
              "Your price and photo were sent to the admin for approval.",
              "Qiimahaaga iyo sawirkaaga waa loo gudbiyey maamulka si loo ansixiyo."
            )
          : t("The price was not saved. Try again.", "Qiimaha lama kaydin. Isku day mar kale."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function addNewType() {
    const name = newName.trim();
    const price = parseUsd(newPrice);
    if (!name) {
      setMessage({ ok: false, text: t("Enter the new livestock name.", "Geli magaca xoolaha cusub.") });
      return;
    }
    if (isRetiredLivestockType(name)) {
      setMessage({ ok: false, text: RETIRED_LIVESTOCK_TYPE_ERROR });
      return;
    }
    if (!newPhoto) {
      setMessage({ ok: false, text: t("Your photo is required.", "Sawirkaaga waa qasab.") });
      return;
    }
    if (!normalizeAgeClass(newAgeClass)) {
      setMessage({ ok: false, text: t("Enter the age of the livestock.", "Qor daada xoolaha.") });
      return;
    }
    if (!normalizeOriginPlace(newOriginPlace)) {
      setMessage({ ok: false, text: t("Enter where the livestock came from.", "Qor meesha xoolaha laga keenay.") });
      return;
    }
    if (!(price > 0)) {
      setMessage({ ok: false, text: t("Enter the price of the new livestock.", "Geli qiimaha xoolaha cusub.") });
      return;
    }
    const seasonKey: SeasonKey = active === "pending" ? "birimo" : active;
    const sameListing = [...fields, ...pendingFields].some((f) => {
      if (active !== "pending" && f.season !== seasonKey) return false;
      if (String(f.status || "").toUpperCase() === "REJECTED") return false;
      if (
        canonicalTypeName(f.name).toLowerCase() !==
        canonicalTypeName(name).toLowerCase()
      ) {
        return false;
      }
      const live = loadedSnapshotRef.current[f.category];
      return (
        sameAgeClass(live?.ageClass || f.ageClass, newAgeClass) &&
        sameOriginPlace(live?.originPlace || f.originPlace, newOriginPlace)
      );
    });
    if (sameListing) {
      setMessage({
        ok: false,
        text: "Noocan daada iyo meesha isku mid ah horay ayuu u jiraa. Dooro daa ama meel ka duwan.",
      });
      return;
    }
    if (price > MAX_LIVESTOCK_PRICE_USD) {
      setMessage({
        ok: false,
        text: `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`,
      });
      return;
    }
    if (!categoryId) {
      setMessage({ ok: false, text: "Category lama helin. Isku day mar kale." });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const seasonKey: SeasonKey = active === "pending" ? "birimo" : active;
      const alreadyKnown = fields.some(
        (f) =>
          f.season === seasonKey &&
          canonicalTypeName(f.name).toLowerCase() === canonicalTypeName(name).toLowerCase()
      );
      let typeId = 0;
      if (!alreadyKnown) {
        const res = await fetch("/api/livestock/catalog", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "type",
            categoryId,
            name,
            nameSomali: name,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 409) {
          setMessage({ ok: false, text: data.error || "Nooca cusub lama gudbin." });
          return;
        }
        typeId = Number(data.type?.id) || 0;
      }
      const category = alreadyKnown
        ? newCustomFieldCategory(seasonKey)
        : fieldCategoryFromTypeName(seasonKey, typeId ? `${name}-${typeId}` : name);
      const field: NamedPriceField = {
        category,
        name,
        price,
        season: seasonKey,
        ageClass: newAgeClass,
        originPlace: newOriginPlace,
      };
      setFields((prev) => {
        if (prev.some((f) => f.category === category)) {
          return prev.map((f) => (f.category === category ? field : f));
        }
        return [...prev, field];
      });
      setSelectedCategory(category);
      if (newPhoto) {
        queueTypePhoto(name, newPhoto);
        const photoForm = new FormData();
        photoForm.append("slug", slug);
        photoForm.append("typeName", typeId ? `${name}__${typeId}` : name);
        photoForm.append("season", seasonKey);
        photoForm.append("image", newPhoto);
        photoForm.append("kind", "listing");
        await fetch("/api/livestock/type-photos", {
          method: "POST",
          body: photoForm,
          credentials: "include",
          cache: "no-store",
        });
      }
      const priceRes = await fetch("/api/broker/section-prices", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: marketIdRef.current,
          items: [{
            category,
            name,
            price,
            season: seasonKey,
            ageClass: newAgeClass,
            originPlace: newOriginPlace,
          }],
          deleted: [],
        }),
      });
      const priceData = await priceRes.json().catch(() => ({}));
      if (!priceRes.ok) {
        setMessage({
          ok: false,
          text: priceData.error || "Nooca waa la gudbiyey, laakiin qiimaha lama kaydin.",
        });
        return;
      }
      setAddOpen(false);
      setNewName("");
      setNewPrice("");
      setNewPhoto(null);
      setNewAgeClass("");
      setNewOriginPlace("");
      await load();
      setActive("pending");
      await loadPhotos("birimo");
      setMessage({
        ok: true,
        text: t(
          "The new livestock was sent to the admin. It appears publicly after approval.",
          "Xoolaha cusub admin ayaa u tegey. Marka la aqbalo ayaa public-ka ka muuqanaya."
        ),
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {active === "pending"
              ? t("Pending", "Sugaya")
              : lang === "so"
                ? publicSeasonLabelSo(active)
                : publicSeasonLabelEn(active)}
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {active === "pending"
              ? t(
                  "Prices waiting for admin and rejected prices. Fix rejected ones, then Save to resubmit.",
                  "Qiimaha sugaya admin iyo kuwa la diiday. Rejected sax, ka dib Save si loo gudbiyo."
                )
              : t(
                  "Choose the type — you will see the public photo. Tap the photo to change it for your market only, then enter the price.",
                  "Dooro nooca — sawirka public ayaad arki. Taabo sawirka si aad ugu beddesho suuqaaga kaliya, ka dib geli qiimaha."
                )}
          </p>
        </div>
        {pendingCount > 0 ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[12px] font-bold text-amber-900">
            <Clock3 className="h-4 w-4" strokeWidth={2.25} />
            {pendingCount} {t("pending", "sugaya")}
          </span>
        ) : null}
      </div>

      {markets.length > 1 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {t("Markets you can price", "Suuqyada aad qiimeyn karto")}
          </p>
          <div className="flex flex-wrap gap-2">
            {markets.map((m) => {
              const on = m.id === marketId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id === marketId) return;
                    setMarketId(m.id);
                    marketIdRef.current = m.id;
                    void load(m.id);
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition",
                    on
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {livestockMarketDisplayName(m.name, lang)}
                </button>
              );
            })}
          </div>
        </div>
      ) : markets.length === 1 ? (
        <p className="text-sm font-semibold text-slate-600">
          {t("Market", "Suuqa")}:{" "}
          {livestockMarketDisplayName(markets[0].name, lang)}
        </p>
      ) : null}

      <div
        role="tablist"
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5"
      >
        {(Object.keys(TABS) as SeasonKey[]).map((key) => {
          const item = TABS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-3 text-center transition-all",
                isActive ? item.activeTab : item.idleTab
              )}
            >
              <span className="block text-base font-black tracking-tight leading-none">
                {publicSeasonLabelEn(key)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActive("pending")}
          className={cn(
            "cursor-pointer rounded-xl px-3 py-3 text-center transition-all",
            active === "pending"
              ? "bg-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-500/40"
              : "bg-white text-amber-950 ring-1 ring-amber-100 hover:bg-amber-50"
          )}
        >
          <span className="block text-base font-black tracking-tight leading-none">
            {t("Pending", "Sugaya")}
          </span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("Type", "Nooca")}
            </label>
            <select
              className={inputCls}
              value={selected?.category || ""}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label={t("Choose type", "Dooro nooca")}
            >
              {typeOptions.length === 0 ? (
                <option value="">{t("No types", "Noocyo ma jiraan")}</option>
              ) : (
                typeOptions.map((f) => (
                  <option key={f.category} value={f.category}>
                    {livestockTypeLabel(f.name, lang) || f.name}
                  </option>
                ))
              )}
            </select>
          </div>
          {active === "pending" ? null : (
          <button
            type="button"
            onClick={() => {
              setAddOpen(true);
              setMessage(null);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t("Add", "Kudar")}
          </button>
          )}
        </div>

        {active === "pending" ? (
          pendingFields.length ? (
            <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {pendingFields.map((field) => {
                const rowId = Number(field.id) || 0;
                const rowStatus = String(field.status || "PENDING").toUpperCase();
                const rejected = rowStatus === "REJECTED";
                const reason =
                  field.rejectionReason ||
                  rejectionReasons[field.category] ||
                  rejectionReasons[field.category.toUpperCase()] ||
                  "";
                return (
                <article
                  key={rowId || `${field.category}-${field.price}-${rowStatus}`}
                  className="bg-white"
                >
                  <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:gap-4">
                  <label
                    className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-[#f7f4ee]"
                    title={t(
                      "Public photo. Tap to change it for your market only.",
                      "Sawirka public. Taabo si aad ugu beddesho suuqaaga kaliya."
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={typePreviewSrc(field.season, field.name)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                      <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={saving}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) queueTypePhoto(field.name, file, field.season);
                      }}
                      aria-label={t(
                        `Change the photo of ${field.name} for your market`,
                        `Beddel sawirka ${field.name} suuqaaga`
                      )}
                    />
                  </label>
                    <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">
                      {livestockTypeLabel(field.name, lang) || field.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {lang === "so"
                        ? publicSeasonLabelSo(field.season)
                        : publicSeasonLabelEn(field.season)}{" "}
                      ·{" "}
                      {rejected
                        ? t("admin rejected — fix, then Save", "admin wuu diiday — sax, ka dib Save")
                        : t("fix the price, then Save", "sax qiimaha, ka dib Save")}
                    </p>
                    <LivestockAgeOriginFields
                      className="mt-2"
                      typeName={field.name}
                      ageClass={field.ageClass}
                      originPlace={field.originPlace}
                      disabled={saving}
                      onAgeChange={(value) => {
                        if (rowId) pendingDirtyRef.current.add(rowId);
                        setPendingFields((prev) =>
                          prev.map((f) =>
                            f.id === field.id ? { ...f, ageClass: value } : f
                          )
                        );
                      }}
                      onOriginChange={(value) => {
                        if (rowId) pendingDirtyRef.current.add(rowId);
                        setPendingFields((prev) =>
                          prev.map((f) =>
                            f.id === field.id ? { ...f, originPlace: value } : f
                          )
                        );
                      }}
                      priceSlot={
                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {t("Price", "Lacagta")}
                          </span>
                          <span className="relative block">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                              $
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm font-black tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                              inputMode="numeric"
                              disabled={!rowId || saving}
                              value={rowId ? pendingDrafts[rowId] ?? "" : String(field.price || "")}
                              onChange={(e) => {
                                if (rowId) updatePendingDraft(rowId, e.target.value);
                              }}
                              placeholder={t("Enter price", "Geli qiimo")}
                              aria-label={`${field.name} pending price`}
                            />
                          </span>
                        </label>
                      }
                    />
                  </div>
                  <StatusPill
                    status={rejected ? "REJECTED" : "PENDING"}
                    price={parseUsd(pendingDrafts[rowId] ?? field.price) || field.price}
                  />
                  </div>
                  {rejected ? (
                    <div className="border-t border-rose-100 bg-rose-50 px-4 py-2.5">
                      <p className="text-sm font-semibold text-rose-900">
                        {reason ||
                          t(
                            "Fix the price or photo, then Save to resubmit.",
                            "Sax qiimaha ama sawirka, kadib Save si aad dib ugu gudbiso."
                          )}
                      </p>
                    </div>
                  ) : null}
                </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-center text-sm text-slate-500">
              {t(
                "No pending or rejected prices. Enter a First Class or Second Class price, then Save.",
                "Qiimo sugaya ama la diiday ma jiro. Geli qiimaha Fasalka Koowaad ama Fasalka Labaad, kadib kaydi."
              )}
            </p>
          )
        ) : selected ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {(() => {
              const field = selected;
              const status = fieldStatus(field);
              const rejected = String(status || "").toUpperCase() === "REJECTED";
              return (
                <div>
                  <div className="flex flex-wrap items-end gap-3 bg-white px-3 py-3 sm:flex-nowrap sm:gap-4">
                    <label
                      className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-[#f7f4ee]"
                      title={t(
                      "Public photo. Tap to change it for your market only.",
                      "Sawirka public. Taabo si aad ugu beddesho suuqaaga kaliya."
                    )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={typePreviewSrc(field.season, field.name)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                        <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={saving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) queueTypePhoto(field.name, file);
                        }}
                        aria-label={t(
                        `Change the photo of ${field.name} for your market`,
                        `Beddel sawirka ${field.name} suuqaaga`
                      )}
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">
                      {livestockTypeLabel(field.name, lang) || field.name}
                    </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t(
                          "Public photo. Tap to change it for your market only.",
                          "Sawirka public. Taabo si aad ugu beddesho suuqaaga kaliya."
                        )}
                      </p>
                      <LivestockAgeOriginFields
                        className="mt-2"
                        typeName={field.name}
                        ageClass={field.ageClass}
                        originPlace={field.originPlace}
                        disabled={saving}
                        onAgeChange={(value) =>
                          updateField(field.category, { ageClass: value })
                        }
                        onOriginChange={(value) =>
                          updateField(field.category, { originPlace: value })
                        }
                        priceSlot={
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {t("Price", "Lacagta")}
                            </span>
                            <span className="relative block">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                                $
                              </span>
                              <input
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm font-black tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                inputMode="numeric"
                                value={priceDraft}
                                onChange={(e) => {
                                  const next = parseUsd(e.target.value);
                                  if (next > MAX_LIVESTOCK_PRICE_USD) {
                                    setMessage({
                                      ok: false,
                                      text: `Price cannot be more than $${MAX_LIVESTOCK_PRICE_USD.toLocaleString("en-US")}.`,
                                    });
                                    return;
                                  }
                                  setMessage(null);
                                  setPriceDraft(e.target.value.replace(/[^0-9.]/g, ""));
                                  setSelectedCategory(field.category);
                                  updateField(field.category, { price: next });
                                }}
                                placeholder={t("Enter price", "Geli qiimo")}
                                aria-label={`${field.name} price`}
                              />
                            </span>
                          </label>
                        }
                      />
                    </div>
                    <StatusPill status={status} price={parseUsd(priceDraft) || field.price} />
                  </div>
                  {rejected ? (
                    <div className="border-t border-rose-100 bg-rose-50 px-4 py-3">
                      <p className="text-[12px] font-black uppercase tracking-wide text-rose-800">
                        {t("admin rejected", "admin wuu diiday")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-900">
                        {rejectionReasons[field.category] ||
                          rejectionReasons[field.category.toUpperCase()] ||
                          t(
                            "Fix the price or photo, then Save to resubmit.",
                            "Sax qiimaha ama sawirka, kadib Save si aad dib ugu gudbiso."
                          )}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-slate-500">
            {t(
              "Add livestock, or wait for admin to add the types.",
              "Add ku dar xoolo, ama admin ha soo geliyo noocyada."
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="max-w-md text-sm text-slate-500">
          {active === "pending"
            ? t(
                "Fix the pending price or photo, then Save. An admin still needs to approve it.",
                "Sax qiimaha ama sawirka pending-ka, ka dib Save. Weli admin ayaa ansixinaya."
              )
            : t(
                "Upload your photo (required) and the price, then Save. Admin reviews it before it appears on the public page.",
                "Soo geli sawirkaaga (qasab) iyo qiimaha, ka dib Save. Admin ayaa eega ka hor inta bogga dadweynaha u soo bixin."
              )}
        </p>
        <AdminSaveButton
          label={t("Save", "Kaydi")}
          saving={saving}
          onClick={() => void save()}
          className="!min-w-[12rem]"
        />
      </div>
      {message ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2.5 text-sm font-semibold",
            message.warn
              ? "bg-amber-50 text-amber-900"
              : message.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-700"
          )}
        >
          {message.text}
        </p>
      ) : null}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("Add new livestock", "Kudar xoolo cusub")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              {t("Cancel", "Jooji")}
            </button>
            <AdminSaveButton
              label={t("Add", "Kudar")}
              saving={adding}
              savingLabel={t("Adding…", "Waa lagu darayaa…")}
              onClick={() => void addNewType()}
              className="!min-w-[10rem]"
            />
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("Livestock name", "Magaca xoolaha")}>
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("example: Sac", "tusaale: Sac")}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {t("Your photo (required)", "Sawirkaaga (qasab)")}
            </span>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <span className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {newPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={newPhotoPreview}
                    alt=""
                    className="h-full w-full object-cover bg-[#f7f4ee]"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold text-slate-600">
                {t("Tap to upload a photo", "Taabo si aad sawir u soo geliso")}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  setNewPhoto(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <LivestockAgeOriginFields
            typeName={newName}
            ageClass={newAgeClass}
            originPlace={newOriginPlace}
            onAgeChange={setNewAgeClass}
            onOriginChange={setNewOriginPlace}
            priceSlot={
              <label className="block min-w-0">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t("Price", "Lacagta")}
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    $
                  </span>
                  <input
                    className={`${inputCls} pl-7`}
                    inputMode="numeric"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0"
                  />
                </span>
              </label>
            }
          />
          <p className="text-xs font-medium text-slate-500">
            {t(
              "Admin must accept it in Livestock Prices before the public can see it.",
              "admin Livestock Prices ka aqbalo ka hor inta dadweynuhu arkaan."
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}
