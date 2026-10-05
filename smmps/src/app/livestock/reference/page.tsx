import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarRange } from "lucide-react";
import {
  LIVESTOCK_IMAGE_FOCUS,
  LIVESTOCK_PHOTO_URLS,
  LIVESTOCK_PRICE_SECTIONS,
} from "@/lib/livestock-data";
import { LivestockPriceSectionCard } from "@/components/livestock/LivestockPriceSectionCard";
import { LivestockSectionTitle } from "@/components/livestock/LivestockSectionTitle";

export const metadata = {
  title: "2016–2026 Reference Prices — Livestock",
  description:
    "10-year Mogadishu livestock reference prices (Qiimaha Tixraaca) for Geelka, Lo'da and Arriga.",
};

const CATEGORY_LINKS = [
  {
    key: "geel",
    href: "/livestock/geel",
    value: "Geelka",
    label: "Camels",
    photo: LIVESTOCK_PHOTO_URLS.geel,
    focus: LIVESTOCK_IMAGE_FOCUS.geel,
    card: "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400",
    valueColor: "text-amber-900",
    labelColor: "text-amber-800/80",
    ring: "ring-amber-200",
  },
  {
    key: "loda",
    href: "/livestock/loda",
    value: "Lo'da",
    label: "Cattle",
    photo: LIVESTOCK_PHOTO_URLS.loda,
    focus: LIVESTOCK_IMAGE_FOCUS.loda,
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 hover:border-emerald-500",
    valueColor: "text-emerald-900",
    labelColor: "text-emerald-800/80",
    ring: "ring-emerald-200",
  },
  {
    key: "arri",
    href: "/livestock/arri",
    value: "Arriga",
    label: "Goats & Sheep",
    photo: LIVESTOCK_PHOTO_URLS.arri,
    focus: LIVESTOCK_IMAGE_FOCUS.arri,
    card: "border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 hover:border-teal-400",
    valueColor: "text-teal-900",
    labelColor: "text-teal-800/80",
    ring: "ring-teal-200",
  },
] as const;

export default function LivestockReferencePage() {
  return (
    <div className="min-h-screen bg-[#f5faf7]">
      <section className="relative h-[400px] overflow-hidden hero-pattern">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-1/4 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
          <div className="animate-fade-in-up flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-md shadow-violet-900/30 sm:h-14 sm:w-14">
              <CalendarRange className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-[15px] font-bold uppercase tracking-[0.14em] text-violet-200 sm:text-[16px]">
                Qiimaha Tixraaca · 2016 – 2026
              </p>
              <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-[40px] lg:text-[48px]">
                10-Year Reference Prices
              </h1>
              <p className="mt-3 max-w-2xl text-[20px] leading-relaxed text-emerald-50/95">
                Official Mogadishu guide prices for{" "}
                <span className="font-semibold text-amber-200">Geelka</span>,{" "}
                <span className="font-semibold text-emerald-200">Lo&apos;da</span>{" "}
                and{" "}
                <span className="font-semibold text-teal-200">Arriga</span> —
                covering normal season, dry season, primary and secondary stock.
              </p>
              <p className="mt-2 max-w-xl text-[18px] leading-relaxed text-emerald-100/85">
                Use these tables as the Banadir market baseline, then open each
                animal page for category detail.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-8 px-3 min-[360px]:px-4 sm:px-6">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {CATEGORY_LINKS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-fade-in-up group flex min-h-[88px] items-center gap-3 rounded-2xl border px-3.5 py-3.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${item.card}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ${item.ring}`}
              >
                <Image
                  src={item.photo}
                  alt={item.value}
                  fill
                  quality={85}
                  className="object-cover transition duration-300 group-hover:scale-110"
                  style={{ objectPosition: item.focus }}
                  sizes="48px"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[20px] font-extrabold leading-tight ${item.valueColor}`}>
                  {item.value}
                </p>
                <p className={`mt-0.5 truncate text-[14px] font-semibold ${item.labelColor}`}>
                  {item.label}
                </p>
              </div>
              <ArrowUpRight
                className={`h-5 w-5 shrink-0 opacity-50 transition group-hover:opacity-100 ${item.valueColor}`}
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="page-shell mx-auto max-w-7xl space-y-6 px-3 py-10 min-[360px]:px-4 sm:px-6 sm:py-12">
        <LivestockSectionTitle
          number="01–04"
          title="10-Year Reference Prices"
          subtitle="Qiimaha Tixraaca — Geelka · Lo'da · Arriga · Birimo / Sugunto"
          accent="from-violet-500 to-fuchsia-600"
        />

        {/* Seasonal reference cards */}
        <div className="grid w-full items-stretch gap-5 lg:grid-cols-2 lg:gap-5">
          {LIVESTOCK_PRICE_SECTIONS.map((section, index) => (
            <div key={section.id} className="h-full min-w-0">
              <LivestockPriceSectionCard
                section={section}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
