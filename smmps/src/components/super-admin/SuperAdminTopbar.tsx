"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  LogOut,
  CalendarDays,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  ClipboardCheck,
  Users,
  FileText,
  Settings,
  UserRound,
  KeyRound,
} from "lucide-react";
import { authPortalHeaders } from "@/lib/auth-portal";
import { cn } from "@/lib/utils";
import { WaveHand } from "@/components/ui/WaveHand";
import { greetingForHour } from "@/lib/dashboard-greeting";
import { mogadishuHour } from "@/lib/mogadishu-time";

const MOBILE_NAV = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/approvals", label: "Pending Approvals", icon: ClipboardCheck },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/reports", label: "Reports", icon: FileText },
  { href: "/super-admin/notifications", label: "Notifications", icon: Bell },
  { href: "/super-admin/settings", label: "Settings", icon: Settings },
  { href: "/super-admin/change-password", label: "Change Password", icon: KeyRound },
];

export function SuperAdminTopbar({
  name,
  email,
  unreadCount: _unreadCount = 0,
  photoUrl,
}: {
  name: string;
  email?: string;
  unreadCount?: number;
  photoUrl?: string | null;
}) {
  void _unreadCount;
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState<{ en: string; so: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function refresh() {
      const now = new Date();
      setToday(
        now.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Africa/Mogadishu",
        })
      );
      setGreeting(greetingForHour(mogadishuHour(now)));
    }
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

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
      headers: authPortalHeaders("super"),
    });
    window.location.href = "/login?mode=super-admin";
  }

  return (
    <header className="sticky top-0 z-30 flex h-[min(76px,14vw)] min-h-[3.5rem] shrink-0 items-center gap-2 border-b border-slate-200/90 bg-white px-2.5 shadow-sm min-[360px]:gap-3 min-[360px]:px-4 sm:h-[76px] sm:px-5">
      <button
        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle admin menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="inline-flex max-w-full items-center gap-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-teal-700/80">
          <span className="truncate">Welcome back</span>
          <WaveHand />
        </p>
        <h1 className="truncate text-[15px] font-black tracking-tight text-slate-900 sm:text-[16px]">
          {greeting ? greeting.en : "\u00a0"}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {today ? (
        <div
          className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 sm:inline-flex"
          title="Today’s date"
        >
          <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
          <span className="tabular-nums">{today}</span>
        </div>
        ) : null}

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
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-emerald-600 text-white shadow-sm">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-4 w-4" strokeWidth={2.5} />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded bg-emerald-800 px-0.5 text-[7px] font-black leading-none text-white ring-1 ring-white">
                SA
              </span>
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-[12px] font-bold text-slate-800">
                {name?.trim() || "Super Administrator"}
              </span>
              <span className="block truncate text-[10px] font-medium text-slate-500">
                {email?.trim() || "Super Admin"}
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
                  {name?.trim() || "Super Admin"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {email?.trim() || "Super Admin"}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  Super Admin · MMPS
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
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <nav className="absolute left-0 right-0 top-[76px] z-40 border-t border-slate-200 bg-white px-3 py-3 shadow-lg lg:hidden">
          {MOBILE_NAV.map((item) => {
            const active =
              item.href === "/super-admin"
                ? pathname === "/super-admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold",
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/super-admin/settings"
            onClick={() => setMobileOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Account
          </Link>
        </nav>
      )}
    </header>
  );
}
