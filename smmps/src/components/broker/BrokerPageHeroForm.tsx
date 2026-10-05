"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, MapPin } from "lucide-react";
import {
  LIVESTOCK_CATEGORY_PAGES,
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import type { LivestockSectionHero } from "@/lib/livestock-section-hero";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { useLang } from "@/lib/language-context";

type Props = {
  slug: string;
  initialHero: LivestockSectionHero;
  displayName?: string;
  /** Defaults to the broker endpoint. Super Admin passes `/api/super-admin/livestock/page-hero`. */
  apiPath?: string;
  hideLocation?: boolean;
};

function HeroField({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: typeof MapPin;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
      />
    </div>
  );
}

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function BrokerPageHeroForm({
  slug,
  initialHero,
  displayName,
  apiPath = "/api/broker/page-hero",
  hideLocation = false,
}: Props) {
  const { t: translate } = useLang();
  const superAdmin = apiPath.includes("super-admin");
  const t = (en: string, so: string) => (superAdmin ? en : translate(en, so));
  const known = isLivestockCategorySlug(slug) ? LIVESTOCK_CATEGORY_PAGES[slug] : null;
  const english = displayName || known?.english || initialHero.title || slug;
  const href = known?.href || `/livestock/${slug}`;
  const [hero, setHero] = useState<LivestockSectionHero>(initialHero);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (!hero.title.trim()) {
      setMessage({ ok: false, text: t("Page title is required.", "Cinwaanka bogga waa qasab.") });
      return;
    }
    setSaving(true);
    setSaved(false);
    setMessage(null);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          slug,
          title: hero.title.trim(),
          location: hero.location.trim(),
          description: hero.description.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || t("Could not save page hero", "Madaxa bogga lama kaydin") });
        return;
      }
      if (data.hero) setHero(data.hero);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("slug", slug);
      const res = await fetch(apiPath, {
        method: "POST",
        cache: "no-store",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || t("Could not upload image", "Sawirka lama soo gelin") });
        return;
      }
      if (data.hero) setHero(data.hero);
      setMessage({ ok: true, text: t("Featured image saved.", "Sawirka madaxa waa la kaydiyey.") });
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  const savedLabel = formatSavedAt(hero.updatedAt);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {hero.featuredImage ? (
              <Image
                src={hero.featuredImage}
                alt={`${hero.title} registered photo`}
                fill
                unoptimized
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-slate-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-700">
              {hero.featuredImage
                ? t(`Registered photo for the public ${english} header`, `Sawirka diiwaangashan ee madaxa ${english}`)
                : t(`Upload the registered photo for ${english}`, `Soo geli sawirka diiwaangashan ee ${english}`)}
            </p>
            <p className="text-[11px] text-slate-500">
              {t(
                "PNG, JPEG, WEBP · max 5 MB · this is the same image used on the public livestock page",
                "PNG, JPEG, WEBP · ugu badnaan 5 MB · isla sawirka bogga dadweynaha ee xoolaha"
              )}
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) =>
                void handleImageUpload(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => imageInputRef.current?.click()}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {uploading ? t("Uploading…", "Waa la soo gelinayaa…") : t("Change image", "Beddel sawirka")}
            </button>
          </div>
        </div>

        <div className={hideLocation ? "" : "grid gap-3 sm:grid-cols-2"}>
          <HeroField
            label={t("Page title", "Cinwaanka bogga")}
            value={hero.title}
            onChange={(v) => setHero({ ...hero, title: v })}
            placeholder={english}
          />
          {hideLocation ? null : (
            <HeroField
              label={t("Location (under title)", "Goobta (cinwaanka hoostiisa)")}
              value={hero.location}
              onChange={(v) => setHero({ ...hero, location: v })}
              icon={MapPin}
              placeholder={t("Banadir Region · Mogadishu, Somalia", "Gobolka Banaadir · Muqdisho, Soomaaliya")}
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {t("Short description (optional)", "Sharaxaad gaaban (ikhtiyaar)")}
          </label>
          <textarea
            value={hero.description}
            onChange={(e) => setHero({ ...hero, description: e.target.value })}
            rows={2}
            placeholder={t(
              `Brief note about ${english.toLowerCase()} in Mogadishu`,
              `Qoraal gaaban oo ku saabsan ${english.toLowerCase()} Muqdisho`
            )}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
          />
        </div>

        {message && (
          <p
            className={
              message.ok
                ? "text-xs font-semibold text-emerald-700"
                : "text-xs font-semibold text-rose-600"
            }
          >
            {message.text}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {savedLabel ? (
            <p className="text-[11px] text-slate-400">
              {t("Saved", "Waa la kaydiyey")} · {savedLabel}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              {t("Loaded", "Waa la soo raray")} · {href}
            </p>
          )}
          <AdminSaveButton
            label={t("Save Page Hero", "Kaydi madaxa bogga")}
            saving={saving}
            saved={saved}
            onClick={() => void save()}
            className="!w-auto shrink-0 px-5"
          />
        </div>
      </div>
    </div>
  );
}
