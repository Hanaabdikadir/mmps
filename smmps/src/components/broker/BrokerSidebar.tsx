"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Beef,
  Contact,
  KeyRound,
  LineChart,
  FileBarChart2,
  Store,
  Layers,
  Users,
  Bell,
  CreditCard,
} from "lucide-react";
import { type Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac-permissions";
import {
  brokerHomeHref,
  SECTION_BROKER_HIDDEN_HREFS,
} from "@/lib/livestock-manager-broker";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/Header";
import { authPortalHeaders } from "@/lib/auth-portal";
import { SystemBrand } from "@/components/SystemBrand";
import { WaveHand } from "@/components/ui/WaveHand";
import { greetingForHour } from "@/lib/dashboard-greeting";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { formatBrokerDisplayName } from "@/lib/broker-display-name";
import { SYSTEM_SHORT } from "@/lib/home-content";

type NavItem = {
  href: string;
  labelKey: keyof typeof TRANSLATIONS.brokerPortal;
  icon: typeof LayoutDashboard;
  permission?: Permission;
};

const SECTION_NAV: NavItem[] = [
  { href: "/broker", labelKey: "overview", icon: LayoutDashboard },
  { href: "/broker/profile", labelKey: "brokerProfile", icon: Contact },
  { href: "/broker/change-password", labelKey: "changePassword", icon: KeyRound },
  { href: "/broker/subscription", labelKey: "subscription", icon: CreditCard },
  { href: "/broker/update-price", labelKey: "updatePrice", icon: Calculator },
  { href: "/broker/notifications", labelKey: "notifications", icon: Bell },
  { href: "/broker/prices", labelKey: "priceHistory", icon: LineChart },
  { href: "/broker/reports", labelKey: "myReports", icon: FileBarChart2, permission: "VIEW_REPORTS" },
];

const SECTOR_ADMIN_NAV: NavItem[] = [
  { href: "/broker/manage", labelKey: "sectorDashboard", icon: LayoutDashboard, permission: "MANAGE_LIVESTOCK_BROKERS" },
  { href: "/broker/manage/brokers", labelKey: "brokers", icon: Users, permission: "MANAGE_LIVESTOCK_BROKERS" },
  { href: "/broker/manage/markets", labelKey: "markets", icon: Store, permission: "MANAGE_MARKETS" },
  { href: "/broker/manage/catalog", labelKey: "animalTypes", icon: Layers, permission: "MANAGE_LIVESTOCK_CATALOG" },
  { href: "/broker/manage/reports", labelKey: "allPriceReports", icon: FileBarChart2, permission: "MANAGE_LIVESTOCK_BROKERS" },
];

function navForUser(userRole?: Role) {
  const extra = SECTOR_ADMIN_NAV.filter(
    (i) => !i.permission || hasPermission(userRole, i.permission)
  );
  return [...SECTION_NAV, ...extra];
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-black uppercase tracking-[0.06em] transition-all",
        active
          ? "bg-[#0a5240] text-white shadow-sm"
          : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-emerald-300" : "text-emerald-200/60"
        )}
        strokeWidth={2.25}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span
          className={cn(
            "min-w-[1.15rem] rounded-full px-1.5 text-center text-[10px] font-black",
            active ? "bg-white text-emerald-800" : "bg-amber-400 text-amber-950"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBody({
  userEmail,
  userName,
  userRole,
  marketName,
  onNavigate,
}: {
  userEmail: string;
  userName: string;
  userRole?: Role;
  marketName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { lang } = useLang();
  const B = TRANSLATIONS.brokerPortal;
  const homeHref = brokerHomeHref({ email: userEmail });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/notifications", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { unread?: number }) => {
        if (!cancelled) setUnread(Number(data.unread) || 0);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const items = navForUser(userRole).filter(
    (i) => !i.permission || hasPermission(userRole, i.permission)
  );

  return (
    <>
      <div className="flex h-[76px] items-center border-b border-white/10 px-4">
        <Link href={homeHref} className="min-w-0" onClick={onNavigate}>
          <SystemBrand layout="sidebar" />
        </Link>
      </div>
      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
          {B.dashboard[lang]}
        </p>
        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={B[item.labelKey][lang]}
            icon={item.icon}
            active={
              item.href === "/broker" || item.href === "/broker/manage"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
            onClick={onNavigate}
            badge={item.href === "/broker/notifications" ? unread : undefined}
          />
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
            {B.sector[lang]}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.06em] text-white">
            <Beef className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <span className="truncate">
              {livestockMarketDisplayName(marketName, lang).trim() || B.market[lang]}
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

export function BrokerSidebar({
  userEmail,
  userName,
  userRole,
  marketName,
}: {
  userEmail: string;
  userName: string;
  userRole?: Role;
  marketName?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    for (const item of navForUser(userRole)) router.prefetch(item.href);
  }, [router, userRole]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col bg-[#00392b] lg:flex">
      <SidebarBody
        userEmail={userEmail}
        userName={userName}
        userRole={userRole}
        marketName={marketName}
      />
    </aside>
  );
}

export function BrokerTopbar({
  brokerName,
  livestockFocus,
  userEmail,
  userName,
  userRole,
  marketName,
}: {
  brokerName: string;
  livestockFocus?: string | null;
  userEmail: string;
  userName: string;
  userRole?: Role;
  marketName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const B = TRANSLATIONS.brokerPortal;
  const marketLabel = livestockMarketDisplayName(marketName, lang).trim();
  const brokerLabel = formatBrokerDisplayName(brokerName, livestockFocus, lang);
  const userLabel = formatBrokerDisplayName(userName, livestockFocus, lang);
  const menuRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    function refresh() {
      const now = new Date();
      setGreeting(greetingForHour(now.getHours())[lang]);
      setToday(
        now.toLocaleDateString(lang === "so" ? "so-SO" : "en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    }
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [lang]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authPortalHeaders("broker"),
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white px-4 shadow-sm sm:px-5">
        <button
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="inline-flex max-w-full items-center gap-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-teal-700/80">
            <span className="truncate">{B.welcomeBack[lang]}</span>
            <WaveHand />
          </p>
          <h1 className="truncate text-[15px] font-black tracking-tight text-slate-900 sm:text-[16px]">
            {greeting}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher lang={lang} setLang={setLang} />
          <Link
            href="/broker/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={2.25} />
          </Link>
          <div
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 sm:inline-flex"
            title="Today"
          >
            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
            <span className="tabular-nums">{today}</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border bg-white py-1 pl-1 pr-2 transition",
                menuOpen
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-200 hover:bg-slate-50"
              )}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
                <Beef className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-[12px] font-bold text-slate-800">
                  {marketLabel || userLabel}
                </span>
                <span className="block truncate text-[10px] font-medium text-slate-500">
                  {userEmail}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-slate-400 transition",
                  menuOpen && "rotate-180 text-emerald-600"
                )}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10"
              >
                <div className="border-b border-slate-100 px-3.5 py-2.5">
                  <p className="text-[12px] font-bold text-slate-800">
                    {userLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {userEmail}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                    {B.livestockBroker[lang]} · {brokerLabel}
                  </p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                    <LogOut className="h-4 w-4" />
                  </span>
                  {B.logout[lang]}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {open && (
        <nav className="absolute left-0 right-0 top-[76px] z-40 border-t border-slate-200 bg-white px-3 py-3 shadow-lg lg:hidden">
          {navForUser(userRole).map((item) => {
            const active =
              item.href === "/broker" || item.href === "/broker/manage"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold",
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon
                  className="h-4 w-4 shrink-0"
                  strokeWidth={2.25}
                />
                {B[item.labelKey][lang]}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}

export function BrokerShellFooter({ year }: { year: number }) {
  const { lang } = useLang();
  const B = TRANSLATIONS.brokerPortal;
  return (
    <footer className="shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 text-center text-[11px] font-medium text-slate-400 sm:px-6">
      {SYSTEM_SHORT} — {B.livestockBroker[lang]} · {year}
    </footer>
  );
}

export { SECTION_BROKER_HIDDEN_HREFS };
