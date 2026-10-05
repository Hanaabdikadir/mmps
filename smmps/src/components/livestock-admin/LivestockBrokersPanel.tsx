"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Eye,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Power,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { Modal } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import {
  LIVESTOCK_COLUMNS,
  LIVESTOCK_PHOTO_URLS,
  adminLivestockName,
  livestockTypeLabel,
  categoryTypePrices,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";

type Option = { id: number; name: string; slug?: string; nameSomali?: string | null };
type Broker = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  code: string | null;
  status: string;
  approvalStatus: string;
  profilePicture: string | null;
  location: string | null;
  createdAt: string;
  markets: Option[];
  categories: Option[];
  animalTypes: Option[];
  subscriptions?: { id: number; status: string; plan: { name: string } }[];
  _count?: { livestockPrices?: number; users?: number };
};

type TypeBoardRow = { name: string; nameEn: string; price: string };

type CatalogCategory = {
  id: number;
  name: string;
  slug: string;
  animalTypes: { id: number; name: string }[];
};

const selectCls =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function categoryTone(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes("CAMEL") || upper.includes("GEEL")) return "text-orange-700";
  if (upper.includes("SHEEP") || upper.includes("GOAT") || upper.includes("ARI")) {
    return "text-violet-700";
  }
  return "text-emerald-700";
}

function categoryRank(name: string, slug?: string) {
  const hay = `${slug || ""} ${name}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return 0;
  if (hay.includes("loda") || hay.includes("cattle")) return 1;
  return 2;
}

function animalPhoto(broker: Broker) {
  const haystack = broker.categories
    .map((c) => `${c.slug || ""} ${c.name}`)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("geel") || haystack.includes("camel")) return LIVESTOCK_PHOTO_URLS.geel;
  if (haystack.includes("arri") || haystack.includes("goat") || haystack.includes("sheep")) {
    return LIVESTOCK_PHOTO_URLS.arri;
  }
  if (haystack.includes("loda") || haystack.includes("cattle")) return LIVESTOCK_PHOTO_URLS.loda;
  return LIVESTOCK_PHOTO_URLS.marketHero;
}

function brokerCategorySlug(broker: Broker): LivestockCategorySlug {
  const haystack = broker.categories
    .map((c) => `${c.slug || ""} ${c.name}`)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("geel") || haystack.includes("camel")) return "geel";
  if (haystack.includes("arri") || haystack.includes("goat") || haystack.includes("sheep")) {
    return "arri";
  }
  return "loda";
}

function catalogTypeBoard(slug: LivestockCategorySlug): TypeBoardRow[] {
  return categoryTypePrices(slug, "birimo").map((row) => ({
    name: row.name,
    nameEn: livestockTypeLabel(row.name, "en"),
    price: row.price,
  }));
}

function TypePriceGrid({
  broker,
  board,
}: {
  broker: Broker;
  board: TypeBoardRow[];
}) {
  const { lang } = useLang();
  const slug = brokerCategorySlug(broker);
  const meta = LIVESTOCK_COLUMNS[slug];
  const cards = board.length ? board : catalogTypeBoard(slug);
  const tone =
    slug === "geel"
      ? {
          frame: "border-orange-100 from-orange-50/90 to-white",
          price: "text-orange-800",
          index: "bg-orange-100 text-orange-800",
        }
      : slug === "arri"
        ? {
            frame: "border-violet-100 from-violet-50/90 to-white",
            price: "text-violet-800",
            index: "bg-violet-100 text-violet-800",
          }
        : {
            frame: "border-sky-100 from-sky-50/90 to-white",
            price: "text-sky-800",
            index: "bg-sky-100 text-sky-800",
          };
  const headline =
    adminLivestockName(broker.categories[0]?.name, broker.categories[0]?.nameSomali, lang) ||
    (lang === "so" ? meta.somali : meta.english);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Current prices
          </p>
          <h4 className="mt-0.5 text-[15px] font-black text-slate-900">
            {headline}
            <span className="ml-1.5 font-semibold text-slate-400">· {cards.length} types</span>
          </h4>
        </div>
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          USD
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {cards.map((row, i) => (
          <article
            key={`${row.name}-${i}`}
            className={cn(
              "rounded-2xl border bg-gradient-to-br p-3.5 shadow-sm",
              tone.frame
            )}
          >
            <span
              className={cn(
                "mb-3 inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[10px] font-black",
                tone.index
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[15px] font-black tracking-tight text-slate-900">
              {livestockTypeLabel(row.name, lang) || row.nameEn}
            </p>
            <p className={cn("mt-3 text-[17px] font-black tabular-nums tracking-tight", tone.price)}>
              {row.price}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

function BrokerRowMenu({
  open,
  onOpenChange,
  onToggleStatus,
  onDelete,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  status: string;
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
      const menuW = 188;
      const menuH = 112;
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

  const suspend = status === "ACTIVE";
  const menu =
    open &&
    coords &&
    createPortal(
      <div
        className={cn(
          "fixed z-[200] w-[188px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-lg ring-1 ring-slate-900/[0.04]",
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
          onClick={onToggleStatus}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold outline-none transition",
            suspend
              ? "text-amber-800 hover:bg-amber-50"
              : "text-emerald-700 hover:bg-emerald-50"
          )}
        >
          <Power className="h-3.5 w-3.5" strokeWidth={2.25} />
          {suspend ? "Suspend" : "Activate"}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onDelete}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-rose-700 outline-none transition hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
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
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
          open
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {menu}
    </>
  );
}

export function LivestockBrokersPanel({
  profileBase,
}: {
  profileBase: string;
}) {
  const { lang } = useLang();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [markets, setMarkets] = useState<Option[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [marketId, setMarketId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Broker | null>(null);
  const [viewBoard, setViewBoard] = useState<TypeBoardRow[]>([]);
  const [message, setMessage] = useActionMessage(2800);
  const { confirm, dialog } = useConfirmDialog();

  const loadMeta = useCallback(async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/livestock/markets", { cache: "no-store" }),
        fetch("/api/livestock/catalog?all=1", { cache: "no-store" }),
      ]);
      const mJson = await mRes.json().catch(() => ({} as { markets?: Option[] }));
      const cJson = await cRes.json().catch(() => ({} as { categories?: CatalogCategory[] }));
      if (mRes.ok) {
        setMarkets(
          (mJson.markets || [])
            .map((m: { id: number; name: string }) => ({ id: m.id, name: m.name }))
            .filter((m: Option) => !isPlaceholderMarketName(m.name))
        );
      }
      if (cRes.ok) setCategories(cJson.categories || []);
    } catch {
      /* Keep empty filters; the brokers list still loads on its own. */
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (marketId) params.set("marketId", marketId);
    if (categoryId) params.set("categoryId", categoryId);
    try {
      const res = await fetch(`/api/livestock/brokers?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({} as { error?: string; brokers?: Broker[] }));
      if (!res.ok) throw new Error(json.error || "Could not load brokers");
      setBrokers(json.brokers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load brokers");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [q, status, marketId, categoryId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchDraft.trim()), 280);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // Load immediately on mount / filter change (avoid empty first paint).
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (menuOpenId == null) return;
    function close() {
      setMenuOpenId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    const timer = window.setTimeout(() => document.addEventListener("click", close), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  async function openView(broker: Broker) {
    const fallbackBoard = catalogTypeBoard(brokerCategorySlug(broker));
    setViewing(broker);
    setViewBoard(fallbackBoard);
    try {
      const res = await fetch(`/api/livestock/brokers/${broker.id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load livestock data");
      const nextBroker: Broker = json.broker
        ? {
            ...broker,
            ...json.broker,
            markets: json.broker.markets || broker.markets,
            categories: json.broker.categories || broker.categories,
            animalTypes: json.broker.animalTypes || broker.animalTypes,
          }
        : broker;
      setViewing(nextBroker);
      setViewBoard(
        Array.isArray(json.typeBoard) && json.typeBoard.length
          ? json.typeBoard
          : catalogTypeBoard(brokerCategorySlug(nextBroker))
      );
    } catch {
      setViewBoard(fallbackBoard);
    }
  }

  async function setStatusFor(broker: Broker, next: string) {
    const ok = await confirm({
      title: `${next === "ACTIVE" ? "Activate" : "Suspend"} broker?`,
      description: `${broker.name} will be ${next.toLowerCase()} until you change it again.`,
      confirmLabel: next === "ACTIVE" ? "Activate" : "Suspend",
      tone: next === "ACTIVE" ? "primary" : "warning",
    });
    if (!ok) return;
    const res = await fetch("/api/livestock/brokers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: broker.id, status: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Update failed" });
      return;
    }
    setMessage({ type: "ok", text: `${broker.name} is now ${next.toLowerCase()}.` });
    await load(true);
  }

  async function removeBroker(broker: Broker) {
    const ok = await confirm({
      title: "Delete broker?",
      description: `${broker.name} will be removed from livestock brokers. Linked login accounts are deactivated.`,
      confirmLabel: "Delete broker",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/livestock/brokers?id=${broker.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Delete failed" });
      return;
    }
    setMessage({ type: "ok", text: `${broker.name} deleted.` });
    await load(true);
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      {dialog}
      <AdminPageHeader
        title="Livestock Brokers"
        subtitle="Multiple brokers can work in the same category and across several markets."
        icon={UserRound}
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
        <div className="flex w-full flex-nowrap items-center gap-2">
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
          <div className="relative w-[8.5rem] shrink-0 lg:w-[10rem]">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectCls}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>
          <div className="relative w-[8.5rem] shrink-0 lg:w-[10rem]">
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className={selectCls}
              aria-label="Filter by market"
            >
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{livestockMarketDisplayName(m.name, lang).trim() || m.name}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>
          <div className="relative w-[8.5rem] shrink-0 lg:w-[10rem]">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectCls}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div>
            <p className="text-[14px] font-bold text-slate-800">Broker accounts</p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {brokers.length} {brokers.length === 1 ? "broker" : "brokers"} shown
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-center">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-100 px-4 py-3.5">Broker</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Markets</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Categories</th>
                <th className="border-b border-slate-100 px-2 py-3.5 whitespace-nowrap">Subscription</th>
                <th className="border-b border-slate-100 px-2 py-3.5">Status</th>
                <th className="border-b border-slate-100 px-2 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                    Loading brokers…
                  </td>
                </tr>
              ) : !brokers.length ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                    No brokers match these filters. Add a broker or wait for a public registration to be approved.
                  </td>
                </tr>
              ) : (
                brokers.map((broker) => (
                  <tr key={broker.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="inline-flex max-w-full items-center gap-3 text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={animalPhoto(broker)}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold leading-snug text-slate-900">{broker.name}</p>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {broker.email || "No email"}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-400">
                            {broker.phone || "No phone"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <div className="flex flex-nowrap items-center justify-center gap-2 overflow-hidden">
                        {broker.markets.length
                          ? broker.markets.map((m) => (
                              <span key={m.id} className="shrink-0 text-[12px] font-semibold text-slate-700">
                                {livestockMarketDisplayName(m.name, lang).trim() || m.name}
                              </span>
                            ))
                          : <span className="text-[12px] font-medium text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <div className="flex flex-nowrap items-center justify-center gap-2 overflow-hidden">
                        {broker.categories.length
                          ? [...broker.categories]
                              .sort((a, b) => categoryRank(a.name, a.slug) - categoryRank(b.name, b.slug))
                              .map((c) => (
                                <span key={c.id} className={cn("shrink-0 text-[12px] font-semibold", categoryTone(c.name))}>
                                  {c.name}
                                </span>
                              ))
                          : <span className="text-[12px] font-medium text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="px-2 py-3.5 align-middle">
                      {(() => {
                        const sub = broker.subscriptions?.[0];
                        if (!sub) {
                          return (
                            <span className="text-[11px] font-semibold text-slate-400">No plan</span>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            <p className="truncate text-[12px] font-bold text-slate-800">
                              {sub.plan.name}
                            </p>
                            <StatusBadge status={sub.status} />
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-3.5 align-middle">
                      <StatusBadge status={broker.status} />
                    </td>
                    <td className="px-2 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title="View livestock data"
                          aria-label={`View livestock data for ${broker.name}`}
                          onClick={() => void openView(broker)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <Eye className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                        <BrokerRowMenu
                          open={menuOpenId === broker.id}
                          onOpenChange={(open) => setMenuOpenId(open ? broker.id : null)}
                          status={broker.status}
                          onToggleStatus={() => {
                            setMenuOpenId(null);
                            void setStatusFor(
                              broker,
                              broker.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
                            );
                          }}
                          onDelete={() => {
                            setMenuOpenId(null);
                            void removeBroker(broker);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(viewing)}
        title={viewing ? viewing.name : "Broker profile"}
        onClose={() => {
          setViewing(null);
          setViewBoard([]);
        }}
        wide
      >
        {viewing ? (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                User data
              </p>
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={animalPhoto(viewing)}
                  alt=""
                  className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-black tracking-tight text-slate-900">
                      {viewing.name}
                    </h4>
                    <StatusBadge status={viewing.status} />
                  </div>
                  {viewing.categories[0] ? (
                    <span className={cn("mt-2 text-[12px] font-semibold", categoryTone(viewing.categories[0].name))}>
                      {viewing.categories[0].name}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.25} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {viewing.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.25} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {viewing.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.25} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Market</p>
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {viewing.markets.length
                        ? viewing.markets.map((m) => m.name).join(", ")
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <TypePriceGrid broker={viewing} board={viewBoard} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
