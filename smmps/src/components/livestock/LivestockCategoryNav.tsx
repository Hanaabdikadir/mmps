"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/language-context";
import {
  LIVESTOCK_ANIMAL_IMAGES,
  LIVESTOCK_CATEGORY_PAGES,
  LIVESTOCK_CATEGORY_SLUGS,
  LIVESTOCK_IMAGE_FOCUS,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { LivestockCategoryPhoto } from "@/components/livestock/LivestockCategoryPhoto";
import { cn } from "@/lib/utils";

type NavTheme = {
  bg: string;
  border: string;
  topBar: string;
  ring: string;
  title: string;
  sub: string;
  shadow: string;
};

/** Eye-catching sector colors — Geelka · Lo'da · Arriga */
const CATEGORY_NAV_THEME: Record<
  LivestockCategorySlug,
  { label: string; idle: NavTheme; active: NavTheme }
> = {
  geel: {
    label: "Geelka",
    idle: {
      bg: "bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50",
      border: "border-orange-400",
      topBar: "bg-orange-500",
      ring: "ring-orange-500",
      title: "text-orange-950",
      sub: "text-orange-700",
      shadow: "shadow-orange-200/60",
    },
    active: {
      bg: "bg-gradient-to-br from-orange-200 via-amber-100 to-orange-100",
      border: "border-orange-700",
      topBar: "bg-orange-600",
      ring: "ring-orange-600",
      title: "text-orange-950",
      sub: "text-orange-800",
      shadow: "shadow-orange-300/70",
    },
  },
  loda: {
    label: "Lo'da",
    idle: {
      bg: "bg-gradient-to-br from-emerald-100 via-amber-50 to-emerald-50",
      border: "border-emerald-500",
      topBar: "bg-emerald-600",
      ring: "ring-emerald-600",
      title: "text-emerald-950",
      sub: "text-emerald-700",
      shadow: "shadow-emerald-200/60",
    },
    active: {
      bg: "bg-gradient-to-br from-emerald-200 via-amber-100 to-emerald-100",
      border: "border-emerald-700",
      topBar: "bg-emerald-700",
      ring: "ring-emerald-700",
      title: "text-emerald-950",
      sub: "text-emerald-800",
      shadow: "shadow-emerald-400/70",
    },
  },
  arri: {
    label: "Ari iyo Ido",
    idle: {
      bg: "bg-gradient-to-br from-teal-100 via-cyan-50 to-teal-50",
      border: "border-teal-400",
      topBar: "bg-teal-500",
      ring: "ring-teal-500",
      title: "text-teal-950",
      sub: "text-teal-700",
      shadow: "shadow-teal-200/60",
    },
    active: {
      bg: "bg-gradient-to-br from-teal-200 via-cyan-100 to-teal-100",
      border: "border-teal-700",
      topBar: "bg-teal-600",
      ring: "ring-teal-600",
      title: "text-teal-950",
      sub: "text-teal-800",
      shadow: "shadow-teal-300/70",
    },
  },
};

function NavTab({
  href,
  active,
  icon,
  title,
  subtitle,
  theme,
  compact,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  theme: NavTheme;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-w-0 flex-1 items-center border-2 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        compact
          ? "gap-2.5 rounded-xl px-3 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5"
          : "gap-3 rounded-2xl px-3 py-3.5 sm:gap-3.5 sm:px-4 sm:py-4",
        theme.bg,
        theme.border,
        theme.shadow,
        active && "ring-1 ring-black/5"
      )}
    >
      <span
        className={cn(
          "absolute -top-px left-1/2 -translate-x-1/2 rounded-b-full",
          compact ? "h-1.5 w-10" : "h-2 w-14",
          theme.topBar
        )}
      />

      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2",
          compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem]",
          theme.ring
        )}
      >
        {icon}
      </span>

      <div className="min-w-0 text-left leading-tight">
        <p
          className={cn(
            "truncate font-bold",
            compact ? "text-[14px] sm:text-[16px]" : "text-[16px] sm:text-[18px]",
            theme.title
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={cn(
              "truncate font-medium",
              compact ? "mt-0.5 text-[11px] sm:text-[12px]" : "mt-0.5 text-[13px] sm:text-[14px]",
              theme.sub
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function LivestockCategoryNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { lang, t } = useLang();

  return (
    <nav
      data-livestock-nav
      className={cn(
        "z-40 shrink-0 border-b border-gray-100 bg-white shadow-sm",
        compact ? "relative" : "sticky top-[var(--site-header-h,57px)]"
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-7xl px-3 min-[360px]:px-4 sm:px-6",
          compact ? "py-2.5" : "py-4"
        )}
      >
        {!compact && (
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {t("Livestock categories", "Qaybaha xoolaha")}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 sm:gap-2.5">
          {LIVESTOCK_CATEGORY_SLUGS.map((slug, index) => {
            const cat = LIVESTOCK_CATEGORY_PAGES[slug];
            const animal = LIVESTOCK_ANIMAL_IMAGES[slug];
            const themes = CATEGORY_NAV_THEME[slug];
            const active = pathname === cat.href;
            const theme = active ? themes.active : themes.idle;

            return (
              <div
                key={slug}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${index * 90}ms`,
                  animationFillMode: "both",
                }}
              >
                <NavTab
                  href={cat.href}
                  active={active}
                  theme={theme}
                  compact={compact}
                  icon={
                    <LivestockCategoryPhoto
                      src={animal.url}
                      alt={themes.label}
                      focus={LIVESTOCK_IMAGE_FOCUS[slug]}
                    />
                  }
                  title={lang === "so" ? cat.somali : cat.english}
                  subtitle=""
                />
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
