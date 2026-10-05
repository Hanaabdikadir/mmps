"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search, Tag, Trash2, X } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { LIVESTOCK_PHOTO_URLS, adminLivestockName, livestockTypeLabel } from "@/lib/livestock-data";
import { REGISTRATION_LIVESTOCK_MARKETS } from "@/lib/livestock-registration-markets";
import { originPlaceLabel } from "@/lib/livestock-listing-meta";
import {
  canonicalTypeName,
  defaultNameForCategory,
  parseFieldCategory,
  isRetiredLivestockType,
} from "@/lib/livestock-section-prices";

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
  updatedBy: { id: number; fullName: string };
  broker: { id: number; name: string } | null;
  market: { id: number; name: string; location?: string | null } | null;
  livestockType?: { id: number; name: string; nameSomali: string | null } | null;
  livestockCategory?: { id: number; name: string; slug: string } | null;
  ageClass?: string | null;
  originPlace?: string | null;
  approvedBy: { id: number; fullName: string } | null;
  rejectedBy: { id: number; fullName: string } | null;
};

type StatusFilter = "ALL" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
type AnimalFilter = "ARRI" | "CAMEL" | "CATTLE" | "ALL";
type MarketOpt = { id: number; name: string };
type BrokerOpt = { id: number; name: string };
type CatalogType = { id: number; name: string; nameSomali?: string | null; status?: string };
type CatalogCat = { id: number; name: string; slug?: string; animalTypes: CatalogType[] };

const FIVE_MARKETS = REGISTRATION_LIVESTOCK_MARKETS.map((m) => m.name);
const ARRI_TYPES = ["Lax", "Wan", "Caysan", "Orgi", "Neyl", "Ri", "Waxar", "Sabeen", "Sumal"];
const CAMEL_TYPES = ["Awr", "Hal", "Qurbac", "Qalin", "Baarqab"];
const CATTLE_TYPES = ["Sac", "Dibi", "Weyl", "Qaalin"];
const SPECIES_CARDS = [
  { value: "CAMEL", label: "Geelka", photo: LIVESTOCK_PHOTO_URLS.geel },
  { value: "CATTLE", label: "Lo'da", photo: LIVESTOCK_PHOTO_URLS.loda },
  { value: "GOAT", label: "Arriga", photo: LIVESTOCK_PHOTO_URLS.arri },
] as const;

const fieldCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function typesForAnimal(animal: string) {
  const upper = animal.toUpperCase();
  if (upper === "CAMEL") return CAMEL_TYPES;
  if (upper === "CATTLE") return CATTLE_TYPES;
  return ARRI_TYPES;
}

function speciesCardTone(animal: string, selected: boolean) {
  if (animal === "CAMEL") {
    return selected
      ? "border-orange-400 bg-orange-50 ring-1 ring-orange-200"
      : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50";
  }
  if (animal === "GOAT") {
    return selected
      ? "border-violet-400 bg-violet-50 ring-1 ring-violet-200"
      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50";
  }
  return selected
    ? "border-teal-400 bg-teal-50 ring-1 ring-teal-200"
    : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  animalType: "CAMEL",
  typeName: "Awr",
  livestockTypeId: "" as number | "",
  category: "Birimo",
  marketId: "" as number | "",
  marketLocation: "",
  brokerId: "" as number | "",
  price: "",
  currency: "USD",
  date: todayIso(),
  description: "",
};

const filterSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function isGenericLocation(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    !n ||
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market" ||
    n.includes("mogadishu, banadir") ||
    n === "mogadishu, somalia"
  );
}

function matchFiveMarket(raw?: string | null) {
  const n = (raw || "").trim().toLowerCase();
  if (!n || isGenericLocation(n)) return null;
  for (const market of REGISTRATION_LIVESTOCK_MARKETS) {
    const keys = [market.name, ...market.aliases, market.location];
    if (keys.some((key) => n.includes(key.toLowerCase().split(",")[0].trim()))) {
      return market.name;
    }
  }
  if (n.includes("deniile") || n.includes("dayniile")) return FIVE_MARKETS[0];
  if (n.includes("sinka") || n.includes("siinka")) return FIVE_MARKETS[1];
  if (n.includes("dayax")) return FIVE_MARKETS[2];
  if (n.includes("xoolaha") || n.includes("suuqa")) return FIVE_MARKETS[3];
  if (n.includes("medina") || n.includes("madiino")) return FIVE_MARKETS[4];
  return null;
}

function displayMarket(p: Price, index: number) {
  return (
    matchFiveMarket(p.market?.name) ||
    matchFiveMarket(p.marketLocation) ||
    FIVE_MARKETS[index % FIVE_MARKETS.length]
  );
}

function typeSeed(p: Price) {
  return (
    adminLivestockName(p.livestockType?.name, p.livestockType?.nameSomali) ||
    p.description ||
    (p.category ? defaultNameForCategory(p.category) : "") ||
    ""
  ).trim();
}

function displayTypeName(p: Price, lang: "en" | "so") {
  const fromCatalog = adminLivestockName(
    p.livestockType?.name,
    p.livestockType?.nameSomali,
    lang
  );
  if (fromCatalog) return fromCatalog;

  const seed = typeSeed(p);
  if (seed) {
    const labeled = livestockTypeLabel(seed, lang);
    if (labeled) return labeled;
    const canon = canonicalTypeName(seed);
    if (canon) return livestockTypeLabel(canon, lang) || canon;
  }

  return livestockTypeLabel(p.description, lang) || String(p.description || "").trim();
}

function livestockKindLabel(animal: string, lang: "en" | "so") {
  const upper = animal.toUpperCase();
  if (upper === "CAMEL") return lang === "so" ? "Geelka" : "Camels";
  if (upper === "CATTLE") return lang === "so" ? "Lo'da" : "Cattle";
  return lang === "so" ? "Arriga" : "Sheep & Goats";
}

function emptyPriceCopy(animal: AnimalFilter, status: StatusFilter) {
  const species =
    animal === "ARRI"
      ? "Arriga"
      : animal === "CAMEL"
        ? "Geelka"
        : animal === "CATTLE"
          ? "Lo'da"
          : "Geelka, Lo'da, or Arriga";
  if (status === "PENDING") return `No pending ${species} price requests.`;
  if (status === "APPROVED") {
    return `No approved ${species} prices. Accepted prices appear on public livestock pages.`;
  }
  if (status === "REJECTED") return `No rejected ${species} prices.`;
  return `No ${species} price requests.`;
}

function displayCategory(p: Price): "First Class" | "Second Class" {
  const hay = `${p.description || ""} ${p.category || ""} ${typeSeed(p)}`.toLowerCase();
  const parsed = parseFieldCategory(p.category);
  if (parsed?.season === "sugunto") return "Second Class";
  if (parsed?.season === "birimo") return "First Class";
  if (hay.includes("sugunto")) return "Second Class";
  return "First Class";
}

function StatusChip({ status }: { status: string }) {
  const key = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide",
        key === "APPROVED"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : key === "PENDING"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : key === "REJECTED"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-slate-100 text-slate-700"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function LivestockPricesPanel({ readOnly = false }: { readOnly?: boolean }) {
  const { lang } = useLang();
  const { confirm, dialog } = useConfirmDialog();
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rejectFor, setRejectFor] = useState<Price | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [markets, setMarkets] = useState<MarketOpt[]>([]);
  const [brokers, setBrokers] = useState<BrokerOpt[]>([]);
  const [catalog, setCatalog] = useState<CatalogCat[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>("ALL");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useActionMessage(2000);
  const [typePhotos, setTypePhotos] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "PENDING");
      if (animalFilter === "CAMEL" || animalFilter === "CATTLE") {
        params.set("animalType", animalFilter);
      }
      if (query) params.set("q", query);
      const res = await fetch(`/api/livestock-prices?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to load livestock prices.",
        });
        setPrices([]);
        return;
      }
      setPrices(data.prices || []);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, animalFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/livestock/type-photos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.photos && typeof data.photos === "object") {
          setTypePhotos(data.photos as Record<string, string>);
        }
      })
      .catch(() => setTypePhotos({}));
  }, []);

  useEffect(() => {
    if (!open || !markets[0]) return;
    setForm((current) => {
      if (current.marketId !== "") return current;
      return {
        ...current,
        marketId: markets[0].id,
        marketLocation: markets[0].name,
      };
    });
  }, [open, markets]);

  const visibleRows = useMemo(() => {
    const livestockOnly = prices.filter(
      (p) =>
        ["CAMEL", "CATTLE", "GOAT", "SHEEP"].includes(p.animalType) &&
        Number(p.price) > 0 &&
        String(p.status).toUpperCase() === "PENDING" &&
        !isRetiredLivestockType(
          p.description,
          p.livestockType?.name,
          p.livestockType?.nameSomali,
          displayTypeName(p, "en")
        )
    );
    const filtered =
      animalFilter === "ARRI"
        ? livestockOnly.filter((p) => p.animalType === "GOAT" || p.animalType === "SHEEP")
        : animalFilter === "ALL"
          ? livestockOnly
          : livestockOnly.filter((p) => p.animalType === animalFilter);

    const picked: Price[] = [];
    const used = new Set<number>();
    for (const name of ARRI_TYPES) {
      const match = filtered.find(
        (p) => !used.has(p.id) && displayTypeName(p, "en").toLowerCase() === name.toLowerCase()
      );
      if (match) {
        picked.push(match);
        used.add(match.id);
      }
    }
    for (const p of filtered) {
      if (used.has(p.id)) continue;
      picked.push(p);
      used.add(p.id);
    }
    return picked;
  }, [prices, animalFilter]);

  function applySearch() {
    setQuery(searchDraft.trim());
  }

  const catalogTypes = useMemo(() => {
    const hay = form.animalType.toUpperCase();
    const match = catalog.find((c) => {
      const slug = `${c.slug || ""} ${c.name}`.toLowerCase();
      if (hay === "CAMEL") return slug.includes("geel") || slug.includes("camel");
      if (hay === "CATTLE") return slug.includes("loda") || slug.includes("cattle");
      return slug.includes("arri") || slug.includes("goat") || slug.includes("sheep");
    });
    const live =
      match?.animalTypes
        .filter((t) => !t.status || t.status === "ACTIVE")
        .map((t) => adminLivestockName(t.name, t.nameSomali, lang) || t.name)
        .filter(Boolean) || [];
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const name of live.length ? live : typesForAnimal(form.animalType)) {
      const key = (canonicalTypeName(name) || name).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }
    return unique;
  }, [catalog, form.animalType]);

  const pendingTypes = useMemo(
    () =>
      catalog.flatMap((c) =>
        (c.animalTypes || [])
          .filter((t) => t.status === "SUSPENDED")
          .map((t) => ({
            ...t,
            categoryName: c.name,
            categoryId: c.id,
          }))
      ),
    [catalog]
  );

  const marketOptions = useMemo(() => {
    if (markets.length) return markets;
    return FIVE_MARKETS.map((name, i) => ({ id: -(i + 1), name }));
  }, [markets]);

  const loadOptions = useCallback(async () => {
    try {
      const [mRes, cRes, bRes] = await Promise.all([
        fetch("/api/livestock/markets", { cache: "no-store" }),
        fetch("/api/livestock/catalog?all=1", { cache: "no-store" }),
        fetch("/api/livestock/brokers", { cache: "no-store" }),
      ]);
      const mJson = await mRes.json().catch(() => ({}));
      const cJson = await cRes.json().catch(() => ({}));
      const bJson = await bRes.json().catch(() => ({}));
      if (mRes.ok) {
        setMarkets(
          (mJson.markets || [])
            .filter((m: MarketOpt) => !isGenericLocation(m.name))
            .map((m: MarketOpt) => ({ id: m.id, name: m.name }))
        );
      }
      if (cRes.ok) {
        setCatalog(
          (cJson.categories || []).map((c: CatalogCat) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            animalTypes: (c.animalTypes || []).map((t: CatalogType) => ({
              id: t.id,
              name: t.name,
              nameSomali: t.nameSomali,
              status: t.status,
            })),
          }))
        );
      }
      if (bRes.ok) {
        const list = Array.isArray(bJson.brokers) ? bJson.brokers : [];
        setBrokers(
          list
            .map((b: { id: number; name?: string }) => ({
              id: Number(b.id),
              name: String(b.name || "").trim(),
            }))
            .filter((b: BrokerOpt) => b.id > 0 && b.name)
        );
      }
    } catch {
      /* keep fallbacks */
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  function openCreate() {
    const firstMarket = markets[0];
    const firstBroker = brokers[0];
    setForm({
      ...EMPTY,
      date: todayIso(),
      marketId: firstMarket?.id || -1,
      marketLocation: firstMarket?.name || FIVE_MARKETS[0] || "",
      brokerId: firstBroker?.id || "",
      typeName: typesForAnimal("CAMEL")[0],
    });
    setError("");
    setOpen(true);
    void loadOptions();
  }

  function selectSpecies(animalType: string) {
    const names = catalog.length
      ? catalog
          .find((c) => {
            const slug = `${c.slug || ""} ${c.name}`.toLowerCase();
            if (animalType === "CAMEL") return slug.includes("geel") || slug.includes("camel");
            if (animalType === "CATTLE") return slug.includes("loda") || slug.includes("cattle");
            return slug.includes("arri") || slug.includes("goat") || slug.includes("sheep");
          })
          ?.animalTypes.map((t) => t.name) || typesForAnimal(animalType)
      : typesForAnimal(animalType);
    setForm({
      ...form,
      animalType,
      typeName: names[0] || form.typeName,
      livestockTypeId: "",
    });
  }

  async function create() {
    const price = Number(form.price);
    const marketLocation =
      marketOptions.find((m) => m.id === form.marketId)?.name || form.marketLocation.trim();
    if (!marketLocation) {
      setError("Select a livestock market.");
      return;
    }
    if (!form.brokerId || Number(form.brokerId) <= 0) {
      setError("Select a livestock broker.");
      return;
    }
    if (!form.typeName.trim()) {
      setError("Select an animal type.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than zero.");
      return;
    }
    if (price > 3000) {
      setError("Price cannot be more than $3,000.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/livestock-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalType: form.animalType,
          typeName: form.typeName,
          category: form.category,
          season: form.category,
          marketId: typeof form.marketId === "number" && form.marketId > 0 ? form.marketId : undefined,
          marketLocation,
          brokerId: Number(form.brokerId),
          price,
          currency: form.currency,
          date: form.date || todayIso(),
          description: form.description.trim() || form.typeName,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Failed to save");
        return;
      }
      setOpen(false);
      setForm({ ...EMPTY, date: todayIso() });
      setActionMessage({
        type: "ok",
        text: d.skipped
          ? d.message || "This price is already approved."
          : `${form.typeName} price submitted for approval.`,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function review(id: number, action: "approve" | "reject", reason?: string) {
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/livestock-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || `Failed to ${action} price.`,
        });
        return;
      }
      setRejectFor(null);
      setRejectReason("");
      setActionMessage({
        type: "ok",
        text:
          action === "approve"
            ? "Approved — now live on public livestock pages."
            : "Price rejected.",
      });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function reviewType(id: number, action: "approve" | "reject") {
    setActionBusyId(-id);
    setActionMessage(null);
    try {
      if (action === "approve") {
        const res = await fetch("/api/livestock/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "type", id, status: "ACTIVE" }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionMessage({ type: "error", text: d.error || "Could not approve type." });
          return;
        }
        setActionMessage({ type: "ok", text: "Type approved — it can now be used on public pages." });
      } else {
        const res = await fetch(`/api/livestock/catalog?kind=type&id=${id}`, {
          method: "DELETE",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionMessage({ type: "error", text: d.error || "Could not reject type." });
          return;
        }
        setActionMessage({ type: "ok", text: "Type request rejected." });
      }
      await loadOptions();
    } finally {
      setActionBusyId(null);
    }
  }

  async function remove(p: Price) {
    const ok = await confirm({
      title: "Delete price?",
      description: `Delete ${p.animalType} price at ${p.market?.name || p.marketLocation}? This cannot be undone.`,
      confirmLabel: "Delete price",
      tone: "danger",
    });
    if (!ok) return;
    setActionBusyId(p.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/livestock-prices?id=${p.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to delete price.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Price deleted." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <AdminPageHeader
        title="Livestock Prices"
        subtitle="Approve or reject prices submitted by Livestock Admins. Super Admin does not enter prices here."
        icon={Tag}
      />

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3 ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search market or type…"
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
          <div className="relative w-full sm:w-[11rem]">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Type
            </label>
            <select
              value={animalFilter}
              onChange={(e) => setAnimalFilter(e.target.value as AnimalFilter)}
              className={filterSelectClass}
              aria-label="Select type"
            >
              <option value="ALL">All types</option>
              <option value="CAMEL">Geelka</option>
              <option value="CATTLE">Lo&apos;da</option>
              <option value="ARRI">Arriga</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2.25}
            />
          </div>
        </div>
      </div>

      {!readOnly && pendingTypes.length ? (
        <div className="w-full overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40">
          <div className="border-b border-amber-100 px-4 py-3.5">
            <p className="text-[14px] font-bold text-slate-800">Type requests</p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              Livestock admin submitted these types. Accept to show them on public pages.
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingTypes.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-[13px] font-bold text-slate-800">
                    {adminLivestockName(t.name, t.nameSomali, lang) || t.name}
                  </p>
                  <p className="text-[12px] font-medium text-slate-500">{t.categoryName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionBusyId === -t.id}
                    onClick={() => void reviewType(t.id, "approve")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={actionBusyId === -t.id}
                    onClick={() => void reviewType(t.id, "reject")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-[12px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">
              Price requests
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {visibleRows.length} {visibleRows.length === 1 ? "row" : "rows"} shown
            </p>
          </div>
          {actionMessage ? (
            <p
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                actionMessage.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
              )}
            >
              {actionMessage.text}
            </p>
          ) : null}
        </div>
        {loading ? (
          <div className="grid min-h-[16rem] place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
          </div>
        ) : visibleRows.length === 0 ? (
          <p className="px-1 py-16 text-center text-sm font-semibold text-slate-400">
            {emptyPriceCopy(animalFilter, statusFilter)}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {visibleRows.map((p, i) => {
              const typeName = displayTypeName(p, lang);
              const photo =
                typePhotos[canonicalTypeName(typeName)] ||
                (p.animalType === "CAMEL"
                  ? LIVESTOCK_PHOTO_URLS.geel
                  : p.animalType === "CATTLE"
                    ? LIVESTOCK_PHOTO_URLS.loda
                    : LIVESTOCK_PHOTO_URLS.arri);
              const approved = p.status.toUpperCase() === "APPROVED";
              return (
                <article
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 bg-white px-3 py-3 sm:flex-nowrap sm:gap-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">
                      {livestockTypeLabel(typeName, lang)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {displayCategory(p)} · pending approval
                      {p.ageClass || p.originPlace
                        ? ` · ${[
                            (p.ageClass || "").trim(),
                            originPlaceLabel(p.originPlace, "en")
                              ? `from ${originPlaceLabel(p.originPlace, "en")}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="relative w-full sm:w-[8.5rem]">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                      $
                    </span>
                    <div className="flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm font-black tabular-nums text-slate-900">
                      {Number(p.price).toLocaleString()}
                    </div>
                  </div>
                  {approved ? (
                    <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <StatusChip status={p.status} />
                  )}
                  {!readOnly ? (
                    <div className="flex items-center gap-2">
                      {p.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={actionBusyId === p.id}
                            onClick={() => void review(p.id, "approve")}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            title="Approve"
                            aria-label="Approve"
                          >
                            <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            disabled={actionBusyId === p.id}
                            onClick={() => {
                              setRejectReason("");
                              setRejectFor(p);
                            }}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                            title="Reject"
                            aria-label="Reject"
                          >
                            <X className="h-[18px] w-[18px]" strokeWidth={2.5} />
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        disabled={actionBusyId === p.id}
                        onClick={() => void remove(p)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-[17px] w-[17px]" strokeWidth={2.25} />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title="Reject — enter a reason"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectFor(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                rejectFor && void review(rejectFor.id, "reject", rejectReason)
              }
              disabled={!rejectReason.trim() || actionBusyId === rejectFor?.id}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Reject
            </button>
          </>
        }
      >
        <Field label="Super Admin note (the broker will see this)">
          <textarea
            className={inputCls}
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the rejection reason — for example: Price is incorrect, fix and Save."
          />
        </Field>
      </Modal>
      {dialog}
    </div>
  );
}
