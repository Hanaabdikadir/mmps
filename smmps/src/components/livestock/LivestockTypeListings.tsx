"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Mail, MapPin, Phone, Search, SlidersHorizontal, User, X } from "lucide-react";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import {
  LIVESTOCK_CATEGORY_PAGES,
  livestockTypeLabel,
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import { livestockTypeVisual, pickTypePhotoUrl } from "@/lib/livestock-type-visuals";
import { readTypePhotoCache, writeTypePhotoCache } from "@/lib/livestock-type-photo-cache";
import {
  canonicalTypeName,
  formatUsd,
} from "@/lib/livestock-section-prices";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { ageClassLabel, originPlaceLabel } from "@/lib/livestock-listing-meta";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { authPortalHeaders } from "@/lib/auth-portal";
import { cn } from "@/lib/utils";

type Listing = {
  id: number;
  typeName: string;
  season: string;
  price: number;
  currency: string;
  market: string;
  marketLocation: string | null;
  phone: string | null;
  email: string | null;
  dateRecorded: string;
  brokerId: number | null;
  enteredBy?: string | null;
  photoUrl: string | null;
  ageClass?: string | null;
  originPlace?: string | null;
};

const MARKETS_PER_PAGE = 100;

export function LivestockTypeListings({
  category,
  season,
  typeName,
}: {
  category: string;
  season: "birimo" | "sugunto";
  typeName: string;
}) {
  const { lang, t } = useLang();
  const L = TRANSLATIONS.listing;
  const meta = isLivestockCategorySlug(category)
    ? LIVESTOCK_CATEGORY_PAGES[category]
    : {
        english: category,
        somali: category,
        href: `/livestock/${category}`,
      };
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [cardPhoto, setCardPhoto] = useState<string | null>(null);
  const [photosReady, setPhotosReady] = useState(false);
  const [myBrokerId, setMyBrokerId] = useState<number | null>(null);
  const [canUploadInner, setCanUploadInner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [marketQuery, setMarketQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [marketNameFilter, setMarketNameFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [brokerQuery, setBrokerQuery] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const visual = livestockTypeVisual(category, typeName, season, cardPhoto);
  const showHeroPhoto = true;

  useEffect(() => {
    const params = new URLSearchParams({
      animalType: category,
      season,
      type: typeName,
    });
    void fetch(`/api/livestock/type-listings?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setListings(Array.isArray(data.listings) ? data.listings : []);
      })
      .catch(() => setListings([]));
    setPage(1);
    setMarketQuery("");
    setFiltersOpen(false);
    setMarketNameFilter("");
    setAgeFilter("");
    setOriginFilter("");
    setBrokerQuery("");
    setPriceMin("");
    setPriceMax("");
  }, [category, season, typeName]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onPointer(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [filtersOpen]);

  useEffect(() => {
    let cancelled = false;
    const cachedUrl = pickTypePhotoUrl(readTypePhotoCache(category, season), typeName);
    if (cachedUrl) {
      setCardPhoto(cachedUrl);
      setPhotosReady(true);
    } else {
      setPhotosReady(false);
    }
    void fetch(
      `/api/livestock/type-photos?slug=${category}&season=${season}&scope=card`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const photos = (data.photos as Record<string, string> | undefined) || {};
        writeTypePhotoCache(category, season, photos);
        setCardPhoto(pickTypePhotoUrl(photos, typeName));
        setPhotosReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPhotosReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [category, season, typeName]);

  useEffect(() => {
    void fetch("/api/auth/me", {
      cache: "no-store",
      headers: authPortalHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        const role = String(data?.user?.role || "");
        setCanUploadInner(
          role === "LIVESTOCK_BROKER_USER" || Boolean(data?.user?.brokerId)
        );
        const id = Number(data?.user?.brokerId);
        setMyBrokerId(Number.isFinite(id) && id > 0 ? id : null);
      })
      .catch(() => setCanUploadInner(false));
  }, []);

  async function uploadInnerPhoto(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("slug", category);
      form.append("typeName", typeName);
      form.append("season", season);
      form.append("kind", "listing");
      form.append("image", file);
      const res = await fetch("/api/livestock/type-photos", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const uploaded = typeof data.url === "string" ? data.url : "";
        if (uploaded && myBrokerId != null) {
          setListings((prev) =>
            (prev || []).map((row) =>
              row.brokerId === myBrokerId ? { ...row, photoUrl: uploaded } : row
            )
          );
        }
        const params = new URLSearchParams({
          animalType: category,
          season,
          type: typeName,
        });
        const listRes = await fetch(`/api/livestock/type-listings?${params}`, {
          cache: "no-store",
        });
        const listData = await listRes.json().catch(() => ({}));
        if (Array.isArray(listData.listings)) setListings(listData.listings);
      }
    } finally {
      setUploading(false);
    }
  }

  const allListings = listings ?? [];
  const q = marketQuery.trim().toLowerCase();
  const brokerQ = brokerQuery.trim().toLowerCase();
  const minPrice = priceMin.trim() === "" ? null : Number(priceMin);
  const maxPrice = priceMax.trim() === "" ? null : Number(priceMax);
  const marketNameQ = marketNameFilter.trim().toLowerCase();
  const ageQ = ageFilter.trim().toLowerCase();
  const originQ = originFilter.trim().toLowerCase();
  const activeFilterCount = [
    marketNameQ,
    ageFilter,
    originFilter,
    brokerQ,
    priceMin.trim(),
    priceMax.trim(),
  ].filter(Boolean).length;
  const marketListings = useMemo(() => {
    return allListings.filter((row) => {
      if (marketNameQ) {
        const marketHay = [
          row.market,
          row.marketLocation,
          livestockMarketDisplayName(row.market, "so"),
          livestockMarketDisplayName(row.market, "en"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!marketHay.includes(marketNameQ)) return false;
      }
      if (ageQ) {
        const ageHay = [
          row.ageClass,
          ageClassLabel(row.ageClass, "so"),
          ageClassLabel(row.ageClass, "en"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!ageHay.includes(ageQ)) return false;
      }
      if (originQ) {
        const originHay = [
          row.originPlace,
          originPlaceLabel(row.originPlace, "so"),
          originPlaceLabel(row.originPlace, "en"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!originHay.includes(originQ)) return false;
      }
      if (minPrice != null && Number.isFinite(minPrice) && row.price < minPrice) return false;
      if (maxPrice != null && Number.isFinite(maxPrice) && row.price > maxPrice) return false;
      if (brokerQ) {
        const broker = String(row.enteredBy || "").toLowerCase();
        if (!broker.includes(brokerQ)) return false;
      }
      if (!q) return true;
      const hay = [
        row.market,
        row.marketLocation,
        livestockMarketDisplayName(row.market, "so"),
        livestockMarketDisplayName(row.market, "en"),
        row.enteredBy,
        row.originPlace,
        row.ageClass,
        ageClassLabel(row.ageClass, "so"),
        ageClassLabel(row.ageClass, "en"),
        String(row.price),
        row.phone,
        row.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allListings, q, marketNameQ, ageQ, originQ, brokerQ, minPrice, maxPrice]);
  const totalPages = Math.max(1, Math.ceil(marketListings.length / MARKETS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageListings = marketListings.slice(
    (currentPage - 1) * MARKETS_PER_PAGE,
    currentPage * MARKETS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (!previewSrc) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewSrc(null);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [previewSrc]);

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pt-4 pb-6 min-[360px]:px-4 sm:px-6">
        <Link
          href={`/livestock/${category}?tab=${season}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t(`Back to ${meta.english}`, `Ku noqo ${meta.somali}`)}
        </Link>

      <article className="w-full min-w-0 max-w-full overflow-x-hidden bg-white">
        <div
          className="relative aspect-[16/6] w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-2xl bg-[#f7f4ee]"
          onClick={() => setPreviewSrc(visual.src)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPreviewSrc(visual.src);
            }
          }}
        >
            {showHeroPhoto ? (
              <LivestockCategoryPhoto
                src={visual.src}
                alt={livestockTypeLabel(visual.name, lang)}
                focus={visual.focus}
                fit="cover"
                className="!h-full !w-full object-cover"
                sizes="(max-width: 1280px) calc(100vw - 1.5rem), 1280px"
                priority
              />
            ) : (
              <div className="absolute inset-0 animate-pulse bg-stone-200" />
            )}
            {listings && marketListings.length > 0 ? (
              <p className="absolute bottom-2 right-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-sm font-semibold text-slate-600 shadow-sm">
                {t(
                  `${marketListings.length} markets`,
                  `${marketListings.length} suuq`
                )}
              </p>
            ) : null}
        </div>

        <div className="pt-3 pb-2 sm:pt-4">
          {listings && allListings.length > 0 ? (
            <div ref={filterRef} className="relative mb-3">
              <div className="flex items-center gap-2">
              <label className="relative block w-full max-w-sm min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={marketQuery}
                  onChange={(e) => {
                    setMarketQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t(
                    "Search everything in this market…",
                    "Raadi wax kasta oo suuqan ku jira…"
                  )}
                  aria-label={t(
                    "Search everything in this market",
                    "Raadi wax kasta oo suuqan ku jira"
                  )}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                {marketQuery ? (
                  <button
                    type="button"
                    onClick={() => setMarketQuery("")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={L.close[lang]}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className={cn(
                  "ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold shadow-sm transition",
                  filtersOpen || activeFilterCount > 0
                    ? "border-amber-400 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                )}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("Filter", "Shaandhe")}
                {activeFilterCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-black text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              </div>
              {filtersOpen ? (
                <div className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
                  {activeFilterCount > 0 ? (
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-bold text-amber-700 hover:text-amber-900"
                        onClick={() => {
                          setMarketNameFilter("");
                          setAgeFilter("");
                          setOriginFilter("");
                          setBrokerQuery("");
                          setPriceMin("");
                          setPriceMax("");
                          setPage(1);
                        }}
                      >
                        {t("Clear", "Tirtir")}
                      </button>
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t("Market", "Suuqa")}
                    </span>
                    <input
                      type="text"
                      value={marketNameFilter}
                      onChange={(e) => {
                        setMarketNameFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder={t("Type a market, e.g. Dayax", "Qor suuqa, tusaale Dayax")}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t("Age", "Da'da")}
                    </span>
                    <input
                      type="text"
                      value={ageFilter}
                      onChange={(e) => {
                        setAgeFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder={t("Type an age, e.g. 2", "Qor da'da, tusaale 2")}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t("Where it came from", "Meesha laga keenay")}
                    </span>
                    <input
                      type="text"
                      value={originFilter}
                      onChange={(e) => {
                        setOriginFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder={t("Type a place, e.g. Bakool", "Qor meesha, tusaale Bakool")}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t("Price range", "Qiimaha")}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={priceMin}
                        onChange={(e) => {
                          setPriceMin(e.target.value);
                          setPage(1);
                        }}
                        placeholder={t("Min", "Ugu yar")}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={priceMax}
                        onChange={(e) => {
                          setPriceMax(e.target.value);
                          setPage(1);
                        }}
                        placeholder={t("Max", "Ugu badan")}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t("Broker", "Dilaalka")}
                    </span>
                    <input
                      type="search"
                      value={brokerQuery}
                      onChange={(e) => {
                        setBrokerQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder={t("Search broker name", "Raadi magaca dilaalka")}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {listings === null ? (
            <div className="grid min-h-[20vh] place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            </div>
          ) : allListings.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-8 text-center text-sm font-semibold text-amber-900">
              {t(
                "No listings yet for this type.",
                "Weli lama soo gelin noocan."
              )}
            </p>
          ) : marketListings.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-600">
              {t("No market matches that search.", "Suuq kuma jiro raadintaas.")}
            </p>
          ) : (
            <>
            <ul className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
              {pageListings.map((row, i) => {
                const thumb = row.photoUrl?.trim() || visual.src;
                const mine = canUploadInner && myBrokerId != null && row.brokerId === myBrokerId;
                return (
                <li
                  key={row.id}
                  className={cn(
                    "flex min-h-[9.5rem] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:gap-4 sm:p-5"
                  )}
                >
                  <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewSrc(thumb)}
                    className="relative h-20 w-20 overflow-hidden rounded-xl bg-[#f7f4ee] ring-offset-2 hover:ring-2 hover:ring-amber-500 sm:h-24 sm:w-24"
                    aria-label={L.viewPhoto[lang]}
                  >
                    <LivestockCategoryPhoto
                      src={thumb}
                      alt={livestockTypeLabel(visual.name, lang)}
                      focus="50% 50%"
                      fit="cover"
                      sizes="112px"
                    />
                  </button>
                  {mine ? (
                    <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-white shadow">
                      <ImagePlus className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void uploadInnerPhoto(file);
                        }}
                      />
                    </label>
                  ) : null}
                  </div>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-sm font-black text-white">
                    {i + 1 + (currentPage - 1) * MARKETS_PER_PAGE}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-base font-black text-gray-900 sm:text-lg">
                        {livestockTypeLabel(visual.name, lang)}
                      </p>
                      <p className="shrink-0 text-base font-black tabular-nums text-gray-900 sm:text-lg">
                        {formatUsd(row.price)}
                      </p>
                    </div>
                    <p className="mt-0.5 flex items-start gap-1.5 text-sm font-semibold text-amber-800">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="break-words">
                        {livestockMarketDisplayName(row.market, lang).trim() ||
                          L.unknownMarket[lang]}
                      </span>
                    </p>
                    {row.ageClass || row.originPlace ? (
                      <div className="mt-0.5 space-y-0.5 text-sm font-semibold text-slate-700">
                        {row.ageClass ? (
                          <p>
                            {lang === "so" ? "Da'da" : "Age"}:{" "}
                            {ageClassLabel(row.ageClass, lang)}
                          </p>
                        ) : null}
                        {row.originPlace ? (
                          <p>
                            {lang === "so" ? "Laga keenay" : "From"}:{" "}
                            {originPlaceLabel(row.originPlace, lang)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-slate-700">
                      <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      <span className="min-w-0 break-words">
                        <span className="font-bold text-slate-500">
                          {L.broker[lang]}:{" "}
                        </span>
                        {row.enteredBy?.trim()
                          ? row.enteredBy
                          : L.unknownBroker[lang]}
                      </span>
                    </p>
                    {row.phone ? (
                      <a
                        href={`https://wa.me/${row.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                        <span className="truncate">{row.phone}</span>
                      </a>
                    ) : (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {L.noPhone[lang]}
                      </p>
                    )}
                    {row.email ? (
                      <a
                        href={`mailto:${row.email}`}
                        className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                        <span className="truncate">{row.email}</span>
                      </a>
                    ) : (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {L.noEmail[lang]}
                      </p>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
            {marketListings.length > MARKETS_PER_PAGE ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("Previous", "Hore")}
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      "h-10 min-w-10 rounded-xl px-3 text-sm font-bold",
                      n === currentPage
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("Next", "Xiga")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            </>
          )}
        </div>
      </article>
      </div>
      {previewSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={L.photo[lang]}
          onClick={() => setPreviewSrc(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg"
            aria-label={L.close[lang]}
            onClick={() => setPreviewSrc(null)}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div
            className="relative aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-2xl bg-[#f7f4ee]"
            onClick={(e) => e.stopPropagation()}
          >
            <LivestockCategoryPhoto
              src={previewSrc}
              alt={livestockTypeLabel(visual.name, lang)}
              focus="50% 50%"
              fit="cover"
              sizes="100vw"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
