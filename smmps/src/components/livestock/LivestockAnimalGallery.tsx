"use client";

import Link from "next/link";
import {
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_CATEGORY_PAGES,
  LIVESTOCK_IMAGE_FOCUS,
  livestockTypeLabel,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

const animals = Object.values(LIVESTOCK_ANIMAL_IMAGES);

const ACCENT_BORDERS = {
  geel: "border-t-amber-500",
  loda: "border-t-emerald-600",
  arri: "border-t-amber-500",
};

export function LivestockAnimalGallery() {
  return (
    <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
      {animals.map((animal, i) => (
        <GalleryCard key={animal.key} animal={animal} index={i} />
      ))}
    </div>
  );
}

type Animal = (typeof animals)[number];

function GalleryCard({ animal, index }: { animal: Animal; index: number }) {
  const { lang } = useLang();
  const page = LIVESTOCK_CATEGORY_PAGES[animal.key];

  return (
    <Link
      href={page.href}
      className={cn(
        "group overflow-hidden rounded-3xl border border-gray-200 bg-white text-left shadow-md transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-400",
        "border-t-4",
        ACCENT_BORDERS[animal.key as keyof typeof ACCENT_BORDERS]
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-44">
        <LivestockCategoryPhoto
          src={animal.url}
          alt={`${animal.somali} - ${animal.english}`}
          focus={LIVESTOCK_IMAGE_FOCUS[animal.key]}
          priority={index === 0}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          {animal.english}
        </p>
        <h3 className="mt-0.5 text-xl font-black text-emerald-900 sm:text-2xl">
          {lang === "so" ? animal.somali : animal.english}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {animal.types.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
            >
              {livestockTypeLabel(t, lang)}
            </span>
          ))}
          {animal.types.length > 4 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              +{animal.types.length - 4} more
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-4 rounded-xl bg-gradient-to-r py-2.5 text-center text-sm font-bold text-white shadow-sm transition group-hover:brightness-105",
            page.gradient
          )}
        >
          {animal.somali}
        </p>
      </div>
    </Link>
  );
}
