"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Droplets,
  Zap,
  Beef,
  Menu,
  X,
  User,
  UserPlus,
  LogOut,
  CreditCard,
} from "lucide-react";
import { SECTORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  companyAdminAvatarFor,
  companyAdminAvatarObjectPosition,
  initialsFromName,
} from "@/lib/company-admin-avatars";
import { SystemBrand, systemBrandLabel } from "@/components/SystemBrand";
import { SystemLogo } from "@/components/SystemLogo";
import { StablePair, StableIconLabel } from "@/components/ui/StableBilingual";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { fetchMarketAvailabilityCached } from "@/lib/client-fetch-cache";
import {
  authPortalForRole,
  authPortalHeaders,
  readTabAuthPortal,
} from "@/lib/auth-portal";

interface HeaderUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  companySlug?: string | null;
  profilePicture?: string | null;
}

const authButtonClass =
  "inline-flex h-9 min-w-[9.25rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-3.5 text-[12.5px] font-bold leading-none tracking-normal text-emerald-950 shadow-sm transition hover:from-emerald-300 hover:to-teal-300";

/** Distinct high-contrast icons on the shared mint buttons. */
const authRegisterIconClass = "h-4 w-4 shrink-0 text-emerald-900";
const authSignInIconClass = "h-4 w-4 shrink-0 text-emerald-900";

const NAV_ICON_COLOR: Record<string, string> = {
  "/": "text-amber-300",
  "/livestock": "text-green-400",
  "/electricity": "text-amber-400",
  "/water": "text-blue-300",
  "/pricing": "text-teal-300",
};

const sectorIcons = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
};

const SECTOR_HREF_TO_KEY: Record<string, keyof typeof TRANSLATIONS.nav> = {
  "/livestock": "livestock",
  "/water": "water",
  "/electricity": "electricity",
};

function FlagEn({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={cn("block h-2.5 w-4 shrink-0 rounded-[1px]", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  );
}

function FlagSo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={cn("block h-2.5 w-4 shrink-0 rounded-[1px]", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="60" height="40" fill="#4189DD" />
      <polygon
        points="30,8 32.4,15.5 40.2,15.5 33.9,20.2 36.3,27.7 30,23 23.7,27.7 26.1,20.2 19.8,15.5 27.6,15.5"
        fill="#fff"
      />
    </svg>
  );
}

export function LanguageSwitcher({
  lang,
  setLang,
  size = "sm",
}: {
  lang: "en" | "so";
  setLang: (l: "en" | "so") => void;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";

  return (
    <div
      className={cn(
        "grid shrink-0 grid-cols-2 items-center rounded-full border border-emerald-600/50 bg-emerald-950/80",
        compact ? "h-9 w-[7.75rem] gap-0.5 p-[3px]" : "h-10 w-[8.75rem] gap-0.5 p-[3px]"
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("so")}
        title="Af-Soomaali"
        aria-pressed={lang === "so"}
        className={cn(
          "inline-flex h-full items-center justify-center gap-1 rounded-full font-bold leading-none tracking-normal transition-colors",
          compact ? "text-[11px]" : "text-xs",
          lang === "so"
            ? "bg-emerald-400 text-emerald-950"
            : "text-emerald-200 hover:text-emerald-400"
        )}
      >
        <FlagSo className={compact ? "h-2.5 w-3.5" : "h-3 w-4"} />
        <span>SO</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        title="English"
        aria-pressed={lang === "en"}
        className={cn(
          "inline-flex h-full items-center justify-center gap-1 rounded-full font-bold leading-none tracking-normal transition-colors",
          compact ? "text-[11px]" : "text-xs",
          lang === "en"
            ? "bg-emerald-400 text-emerald-950"
            : "text-emerald-200 hover:text-emerald-400"
        )}
      >
        <FlagEn className={compact ? "h-2.5 w-3.5" : "h-3 w-4"} />
        <span>EN</span>
      </button>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(57);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sectorOpen, setSectorOpen] = useState<Record<string, boolean>>({
    livestock: true,
    water: true,
    electricity: true,
  });
  const { lang, setLang } = useLang();
  const T = TRANSLATIONS;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", {
      headers: authPortalHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUser(d.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMarketAvailabilityCached()
      .then((d) => {
        if (cancelled) return;
        setSectorOpen(d);
      })
      .catch(() => {
        /* keep defaults open */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const sync = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      setHeaderHeight(h);
      document.documentElement.style.setProperty("--site-header-h", `${h}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--site-header-h");
    };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authPortalHeaders(
        (user && authPortalForRole(user.role)) || readTabAuthPortal()
      ),
    });
    setUser(null);
    window.location.href = "/";
  }

  const navLinks: {
    href: string;
    en: string;
    so: string;
    icon: typeof Home;
  }[] = [
      {
        href: "/",
        en: T.nav.home.en,
        so: T.nav.home.so,
        icon: Home,
      },
      ...SECTORS.filter((s) => sectorOpen[s.id] !== false).map((s) => {
        const key = SECTOR_HREF_TO_KEY[s.href];
        return {
          href: s.href,
          en: key ? T.nav[key].en : s.label,
          so: key ? T.nav[key].so : s.label,
          icon: sectorIcons[s.id as keyof typeof sectorIcons],
        };
      }),
      {
        href: "/pricing",
        en: "Pricing",
        so: "Qidmada",
        icon: CreditCard,
      },
    ];

  const userPhoto = user
    ? companyAdminAvatarFor({
      email: user.email,
      fullName: user.fullName,
      companySlug: user.companySlug,
      personalPhotoFile: user.profilePicture,
    })
    : null;
  const userInitials = user ? initialsFromName(user.fullName, user.email) : "";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function navClass(active: boolean) {
    return cn(
      "relative flex h-9 shrink-0 items-center whitespace-nowrap text-[13px] font-medium leading-none tracking-normal transition-colors xl:text-sm",
      active
        ? "text-white"
        : "text-white/70 hover:text-white"
    );
  }

  function navIconClass(href: string) {
    return NAV_ICON_COLOR[href] ?? "text-white/80";
  }

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-0 bg-emerald-950 pt-[env(safe-area-inset-top,0px)] shadow-[0_2px_0_0_#022c22]",
          scrolled && "shadow-[0_2px_0_0_#022c22,0_8px_24px_rgba(2,44,34,0.32)]"
        )}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 min-[360px]:px-4 sm:gap-3 sm:px-6 sm:py-3 lg:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            aria-label={systemBrandLabel()}
            className="group flex min-w-0 items-center justify-self-start"
          >
            <span className="sm:hidden">
              <SystemLogo
                size="md"
                className="transition-transform group-hover:scale-105"
                priority
              />
            </span>
            <span className="hidden sm:block">
              <SystemBrand layout="header" />
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-6 justify-self-center lg:flex lg:-translate-x-8">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={navClass(active)}
                >
                  <StableIconLabel
                    icon={link.icon}
                    en={link.en}
                    so={link.so}
                    lang={lang}
                    gapClassName="gap-1.5"
                    iconClassName={navIconClass(link.href)}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2 justify-self-end">
            <div className="hidden sm:block">
              <LanguageSwitcher lang={lang} setLang={setLang} size="sm" />
            </div>

            {user ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1 sm:flex">
                  <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-emerald-500 text-[10px] font-bold text-white">
                    {userPhoto ? (
                      <Image
                        src={userPhoto}
                        alt={user.fullName}
                        fill
                        className="object-cover"
                        style={{
                          objectPosition:
                            companyAdminAvatarObjectPosition(userPhoto),
                        }}
                        sizes="28px"
                        unoptimized
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <span className="max-w-[110px] truncate text-xs text-emerald-100">
                    {user.fullName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title={T.auth.signOut[lang]}
                  className="flex h-9 w-9 items-center justify-center text-emerald-200 transition-colors hover:text-emerald-400"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 min-[480px]:flex">
                <Link
                  href="/register"
                  className={authButtonClass}
                  title={T.auth.register[lang]}
                >
                  <UserPlus className={authRegisterIconClass} strokeWidth={2.75} />
                  <StablePair pair={T.auth.register} lang={lang} align="center" />
                </Link>
                <Link
                  href="/login"
                  className={authButtonClass}
                  title={T.auth.signIn[lang]}
                >
                  <User className={authSignInIconClass} strokeWidth={2.75} />
                  <StablePair pair={T.auth.signIn} lang={lang} align="center" />
                </Link>
              </div>
            )}

            <button
              className="flex h-9 w-9 items-center justify-center text-emerald-100 transition-colors hover:text-emerald-400 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-emerald-800/50 px-3 py-3 min-[360px]:px-4 lg:hidden">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm font-medium tracking-tight transition-colors",
                    active
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                  )}
                >
                  <StableIconLabel
                    icon={link.icon}
                    en={link.en}
                    so={link.so}
                    lang={lang}
                    gapClassName="gap-2"
                    iconClassName={navIconClass(link.href)}
                  />
                </Link>
              );
            })}

            <div className="mt-3 flex justify-center px-1 sm:hidden">
              <LanguageSwitcher lang={lang} setLang={setLang} size="md" />
            </div>

            {!user && (
              <div className="mt-3 grid gap-2 min-[480px]:hidden">
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className={cn(authButtonClass, "justify-center")}
                >
                  <UserPlus className={authRegisterIconClass} strokeWidth={2.75} />
                  <StablePair pair={T.auth.register} lang={lang} align="center" />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className={cn(authButtonClass, "justify-center")}
                >
                  <User className={authSignInIconClass} strokeWidth={2.75} />
                  <StablePair pair={T.auth.signIn} lang={lang} align="center" />
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>
      <div
        aria-hidden
        className="shrink-0 bg-emerald-950"
        style={{ height: Math.max(0, headerHeight - 2) }}
      />
    </>
  );
}
