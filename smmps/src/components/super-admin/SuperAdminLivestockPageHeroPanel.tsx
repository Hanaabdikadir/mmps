"use client";

import { useEffect, useMemo, useState } from "react";
import { BrokerPageHeroForm } from "@/components/broker/BrokerPageHeroForm";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { adminLivestockName } from "@/lib/livestock-data";
import type { LivestockSectionHero } from "@/lib/livestock-section-hero";

type HeroCategory = {
  slug: string;
  name: string;
  nameSomali: string | null;
  href: string;
};

export function SuperAdminLivestockPageHeroPanel() {
  const [categories, setCategories] = useState<HeroCategory[]>([]);
  const [heroes, setHeroes] = useState<LivestockSectionHero[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/super-admin/livestock/page-hero", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Could not load page heroes");
        }
        if (cancelled) return;
        const rows: HeroCategory[] = Array.isArray(data.categories)
          ? data.categories
          : [];
        setCategories(rows);
        setHeroes(Array.isArray(data.heroes) ? data.heroes : []);
        setSelectedSlug((current) => current || rows[0]?.slug || "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load page heroes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => categories.find((row) => row.slug === selectedSlug) || null,
    [categories, selectedSlug]
  );

  const selectedHero = useMemo(() => {
    const found = heroes.find((row) => row.slug === selectedSlug);
    if (found) return found;
    if (!selected) return null;
    return {
      slug: selected.slug,
      title: selected.name || selected.nameSomali || "",
      location: "Gobolka Banaadir · Muqdisho, Soomaaliya",
      description: "",
      featuredImage: null,
      updatedAt: null,
      phone: null,
      email: null,
      brokerName: null,
      livestockFocus: null,
    } satisfies LivestockSectionHero;
  }, [heroes, selected, selectedSlug]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Page Hero"
        subtitle="Choose a livestock category, then edit that category’s public banner on its own."
      />

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          No livestock categories yet. Add names under Livestock Categories first.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block min-w-[16rem] flex-1">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Livestock category
              </span>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="h-11 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
              >
                {categories.map((row) => (
                  <option key={row.slug} value={row.slug}>
                    {adminLivestockName(row.name, row.nameSomali)}
                  </option>
                ))}
              </select>
            </label>
            {selected ? (
              <a
                href={selected.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center text-[12px] font-bold text-emerald-800 hover:underline"
              >
                Preview {selected.href}
              </a>
            ) : null}
          </div>

          {selected && selectedHero ? (
            <BrokerPageHeroForm
              key={selected.slug}
              slug={selected.slug}
              displayName={adminLivestockName(selected.name, selected.nameSomali)}
              initialHero={selectedHero}
              apiPath="/api/super-admin/livestock/page-hero"
              hideLocation
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
