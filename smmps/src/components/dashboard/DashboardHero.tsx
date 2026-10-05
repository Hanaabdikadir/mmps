"use client";

import Link from "next/link";
import {
  Beef,
  Bell,
  Droplets,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

interface UserHeroProps {
  name: string;
  unreadCount: number;
}

export function UserDashboardHero({ name, unreadCount }: UserHeroProps) {
  const { lang, t } = useLang();
  const firstName = name.split(" ")[0];

  return (
    <section className="relative overflow-hidden rounded-2xl hero-pattern px-3 py-8 text-white shadow-[var(--shadow-lg)] min-[360px]:rounded-3xl min-[360px]:px-6 min-[360px]:py-10 sm:px-10 sm:py-12">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
      <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            <StableBilingual
              en="Your personal market hub"
              so="Xaruntaada suuqa shakhsiga ah"
              lang={lang}
            />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight min-[360px]:text-3xl sm:text-4xl">
            <StableBilingual en="Hello," so="Salaan," lang={lang} /> {firstName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/90 min-[360px]:text-base">
            {t(
              "Track Mogadishu livestock, water, and electricity prices — with alerts, favorites, and weekly trends in one place.",
              "Raadi qiimaha xoolaha, biyaha, iyo korontada Muqdisho — digniinaad, xulashooyinka, iyo isbeddellada usbuuciga ah meel keliya."
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/livestock">
              <Button size="lg" className="bg-white text-blue-800 hover:bg-blue-50">
                <StableBilingual en="Browse Markets" so="Eeg Suuqyada" lang={lang} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[280px]:grid-cols-2 min-[280px]:gap-3">
          <HeroStat
            labelEn="Sectors"
            labelSo="Qaybaha"
            value="3"
            subEn="Live markets"
            subSo="Suuqyada Tooska ah"
            lang={lang}
          />
          <HeroStat
            labelEn="Alerts"
            labelSo="Digniinaadaha"
            value={String(unreadCount)}
            subEn="Unread"
            subSo="Aan la aqoon"
            lang={lang}
            highlight={unreadCount > 0}
          />
          <HeroStat
            labelEn="Market"
            labelSo="Suuqa"
            value="1"
            subEn="Mogadishu"
            subSo="Muqdisho"
            lang={lang}
          />
          <HeroStat
            labelEn="Updates"
            labelSo="Cusboonaysiinta"
            valueEn="Daily"
            valueSo="Maalinle"
            subEn="Price feeds"
            subSo="Qiimayaasha"
            lang={lang}
          />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  labelEn,
  labelSo,
  value,
  valueEn,
  valueSo,
  subEn,
  subSo,
  lang,
  highlight,
}: {
  labelEn: string;
  labelSo: string;
  value?: string;
  valueEn?: string;
  valueSo?: string;
  subEn: string;
  subSo: string;
  lang: "en" | "so";
  highlight?: boolean;
}) {
  return (
    <div className="hero-stat-card rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">
        <StableBilingual en={labelEn} so={labelSo} lang={lang} />
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-black",
          highlight ? "text-amber-300" : "text-white"
        )}
      >
        {valueEn && valueSo ? (
          <StableBilingual en={valueEn} so={valueSo} lang={lang} />
        ) : (
          value
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-blue-100/60">
        <StableBilingual en={subEn} so={subSo} lang={lang} />
      </p>
    </div>
  );
}

export const SECTOR_QUICK_LINKS = [
  {
    href: "/livestock",
    title: "Livestock",
    desc: "Geelka, Loda & Arriga",
    icon: Beef,
    gradient: "from-blue-600 to-blue-600",
    ring: "ring-blue-100",
  },
  {
    href: "/water",
    title: "Water Supply",
    desc: "Household & commercial rates",
    icon: Droplets,
    gradient: "from-blue-500 to-cyan-600",
    ring: "ring-blue-100",
  },
  {
    href: "/electricity",
    title: "Electricity",
    desc: "kWh & service pricing",
    icon: Zap,
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-100",
  },
] as const;

export function SectorQuickLinks() {
  const { lang } = useLang();

  const sectorLinks = [
    {
      href: "/livestock",
      titleEn: "Livestock",
      titleSo: "Xoolaha",
      descEn: "Camels, Cattle & Goats/Sheep",
      descSo: "Geelka, Lo'da & Arriga",
      icon: Beef,
      gradient: "from-blue-600 to-blue-600",
      ring: "ring-blue-100",
    },
    {
      href: "/water",
      titleEn: "Water Supply",
      titleSo: "Adeegga Biyaha",
      descEn: "Household & commercial rates",
      descSo: "Qiimaha guryaha iyo ganacsiga",
      icon: Droplets,
      gradient: "from-blue-500 to-cyan-600",
      ring: "ring-blue-100",
    },
    {
      href: "/electricity",
      titleEn: "Electricity",
      titleSo: "Korontada",
      descEn: "kWh & service pricing",
      descSo: "Qiimaha kWh & Adeegga",
      icon: Zap,
      gradient: "from-amber-500 to-orange-500",
      ring: "ring-amber-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {sectorLinks.map((item) => (
        <Link key={item.href} href={item.href} className="group block">
          <div
            className={cn(
              "flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
              item.ring
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                item.gradient
              )}
            >
              <item.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900">
                <StableBilingual en={item.titleEn} so={item.titleSo} lang={lang} />
              </p>
              <p className="text-xs text-[var(--muted)]">
                <StableBilingual en={item.descEn} so={item.descSo} lang={lang} />
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function NotificationPanel({
  notifications,
}: {
  notifications: {
    id: number;
    title: string;
    message: string;
    sector: string;
    read: boolean;
    createdAt: Date;
  }[];
}) {
  const { lang, t } = useLang();
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              <StableBilingual en="Price Alerts" so="Digniinaadaha Qiimaha" lang={lang} />
            </h3>
            <p className="text-xs text-[var(--muted)]">
              <StableBilingual
                en="Latest market notifications"
                so="Wargelinta Suuqa ugu Dambeeyay"
                lang={lang}
              />
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-gray-200" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              <StableBilingual en="No alerts yet" so="Ma jiraan digniinaad weli" lang={lang} align="center" />
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {t(
                "You'll see price changes and market updates here",
                "Waxaad halkan ku arki doontaa isbeddellada qiimaha iyo cusboonaysiinta suuqa"
              )}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "px-5 py-4 transition-colors hover:bg-gray-50/80",
                !n.read && "bg-violet-50/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                    {n.message}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                )}
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                {n.sector}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
