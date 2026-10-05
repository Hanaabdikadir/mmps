"use client";

import Image from "next/image";
import Link from "next/link";
import { type Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac-permissions";
import { useEffect, useRef, useState, useTransition } from "react";
import { useUrlTab } from "@/lib/use-url-tab";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { authPortalHeaders } from "@/lib/auth-portal";
import {
  companyAdminCanEditPriceHistory,
  companyAdminFeatureDeniedMessage,
  companyAdminTabAllowedByPlan,
  publicPlanName,
  type CompanyPlanTier,
} from "@/lib/pricing-plans";
import { useLang } from "@/lib/language-context";
import { LanguageSwitcher } from "@/components/Header";
import { SubscriptionRenewalPanel } from "@/components/subscriptions/SubscriptionRenewalPanel";
import {
  tariffAdminYears,
  tariffHistoryYears,
  TARIFF_YEAR_END,
} from "@/lib/tariff-years";
import {
  Building2,
  Droplets,
  Zap,
  Beef,
  Phone,
  Mail,
  MapPin,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CalendarDays,
  PhoneCall,
  PanelsTopLeft,
  ImageIcon,
  Camera,
  LayoutGrid,
  Layers,
  Radio,
  BarChart3,
  Calculator,
  LineChart,
  FileBarChart2,
  Sparkles,
  Contact,
  KeyRound,
  Bell,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { LivestockPricesEditor } from "@/components/admin/LivestockPricesEditor";
import { CompanyAdminRateTrendChart } from "@/components/admin/CompanyAdminRateTrendChart";
import { ReportsAnalyticsPanel } from "@/components/super-admin/ReportsAnalyticsPanel";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { cn } from "@/lib/utils";
import { sanitizePhoneInput } from "@/lib/register-validation";
import { WaveHand } from "@/components/ui/WaveHand";
import { greetingForHour } from "@/lib/dashboard-greeting";
import { mogadishuHour } from "@/lib/mogadishu-time";
import {
  companyAdminAvatarFor,
  companyAdminAvatarObjectPosition,
  initialsFromName,
} from "@/lib/company-admin-avatars";

type Sector = "water" | "electricity" | "livestock";
type Tab =
  | "overview"
  | "prices"
  | "hero"
  | "contact"
  | "rates5y"
  | "categories"
  | "types"
  | "snapshot"
  | "reports"
  | "notifications"
  | "subscription"
  | "password";

const ADMIN_TABS = [
  "overview",
  "prices",
  "hero",
  "contact",
  "rates5y",
  "categories",
  "types",
  "snapshot",
  "reports",
  "notifications",
  "subscription",
  "password",
] as const satisfies readonly Tab[];

type ProfileForm = {
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  address: string;
  addressLabel: string;
  location: string;
  businessHours: string;
  waterSource: string;
  supplyType: string;
  callCenter: string;
  facebook: string;
  tagline: string;
  description: string;
  infoTitle: string;
  infoBrief: string;
  infoPointsText: string;
  currentPrice: string;
  somali: string;
  providerLabel: string;
  companyName: string;
  yearlyRateHistory: Record<string, string>;
  /** Electricity: low / mid / high USD/kWh per year (string form inputs) */
  tierRateHistory: Record<
    string,
    { low: string; mid: string; high: string }
  >;
  categoriesTitle: string;
  categoriesSubtitle: string;
  typesTitle: string;
  typesSubtitle: string;
  snapshotTitle: string;
  snapshotSubtitle: string;
  ratesNote: string;
  serviceAreas: string;
  calculatorTitle: string;
  calculatorSubtitle: string;
  calculatorEmptyHint: string;
  heroEyebrow: string;
};

type PriceRow = {
  id: number | string;
  type: string;
  price: number;
  dateRecorded: string;
  providerName: string;
};

const ELECTRICITY_ADMIN_TIER_FIELDS = [
  { key: "low" as const, label: "1–1,000 kWh" },
  { key: "mid" as const, label: "1,001–5,000 kWh" },
  { key: "high" as const, label: "5,001+ kWh" },
];

function formatAdminRate(value: string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return String(n);
}

function emptyProfile(years: number[]): ProfileForm {
  const yearly: Record<string, string> = {};
  const tiers: ProfileForm["tierRateHistory"] = {};
  for (const y of years) {
    yearly[String(y)] = "";
    tiers[String(y)] = { low: "", mid: "", high: "" };
  }
  return {
    phone: "",
    altPhone: "",
    email: "",
    website: "",
    address: "",
    addressLabel: "Head Office",
    location: "Mogadishu",
    businessHours: "",
    waterSource: "",
    supplyType: "",
    callCenter: "",
    facebook: "",
    tagline: "",
    description: "",
    infoTitle: "",
    infoBrief: "",
    infoPointsText: "",
    currentPrice: "",
    somali: "",
    providerLabel: "",
    companyName: "",
    yearlyRateHistory: yearly,
    tierRateHistory: tiers,
    categoriesTitle: "",
    categoriesSubtitle: "",
    typesTitle: "",
    typesSubtitle: "",
    snapshotTitle: "",
    snapshotSubtitle: "",
    ratesNote: "",
    serviceAreas: "",
    calculatorTitle: "",
    calculatorSubtitle: "",
    calculatorEmptyHint: "",
    heroEyebrow: "",
  };
}

export function CompanyAdminDashboard({
  userId,
  fullName,
  email,
  slug,
  companyName,
  acronym,
  sector,
  href,
  ownPriceCount,
  logoUrl,
  personalPhotoFile,
  userRole = "COMPANY_ADMIN",
}: {
  userId?: number;
  fullName: string;
  email: string;
  slug: string;
  companyName: string;
  acronym: string;
  sector: Sector | null;
  href: string;
  ownPriceCount: number;
  logoUrl?: string | null;
  /** New-user registration personal photo filename / URL */
  personalPhotoFile?: string | null;
  userRole?: Role;
}) {
  const { lang, setLang, t } = useLang();
  const [tab, setTab] = useUrlTab(ADMIN_TABS, "overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [priceTotal, setPriceTotal] = useState(ownPriceCount);
  const [rateYears, setRateYears] = useState<number[]>(() => tariffAdminYears());
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState<{ en: string; so: string } | null>(null);
  const [displayLogo, setDisplayLogo] = useState<string | null>(logoUrl ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [personalPhoto, setPersonalPhoto] = useState<string | null>(
    personalPhotoFile ?? null
  );
  const [planTier, setPlanTier] = useState<CompanyPlanTier | null>("free");
  const [planTierLoaded, setPlanTierLoaded] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const [lockedHistoryYears, setLockedHistoryYears] = useState<number[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const currentYear = TARIFF_YEAR_END;
  const historyYears = rateYears.filter((year) => year < currentYear);
  const justSaved = message === "Saved successfully";
  const historyLocked = new Set(lockedHistoryYears);
  const hasEditableHistory = historyYears.some((year) => !historyLocked.has(year));

  const personalAvatar = companyAdminAvatarFor({
    email,
    fullName,
    companySlug: slug,
    personalPhotoFile: personalPhoto,
  });
  const personInitials = initialsFromName(fullName, email);

  const SectorIcon =
    sector === "electricity" ? Zap : sector === "livestock" ? Beef : Droplets;
  const sectorLabel =
    sector === "electricity"
      ? t("Electricity", "Korontada")
      : sector === "livestock"
        ? t("Livestock", "Xoolaha")
        : t("Water", "Biyaha");
  const rateUnit = sector === "electricity" ? "USD / kWh" : "USD / m³";
  const ratesTitle = t("Price History", "Taariikhda qiimaha");
  const isUtility = sector === "water" || sector === "electricity";

  const hideSidebar = false;
  const isLivestock = sector === "livestock";
  const mainNavUnfiltered: { id: Tab; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] =
    isLivestock
      ? [
          { id: "overview", label: t("OVERVIEW", "DULMAR"), icon: Sparkles },
          { id: "hero", label: t("PAGE HERO", "MADAXA BOGGA"), icon: PanelsTopLeft, permission: "MANAGE_COMPANY" },
          { id: "categories", label: t("CATEGORIES", "QAYBAHA"), icon: LayoutGrid, permission: "MANAGE_COMPANY" },
          { id: "types", label: t("TYPES", "NOOCYADA"), icon: Layers, permission: "MANAGE_COMPANY" },
          { id: "snapshot", label: t("SNAPSHOT", "SAWIRKA SUUQA"), icon: Radio, permission: "MANAGE_COMPANY" },
          { id: "prices", label: t("REF. PRICES", "QIIMAHA TIXRAACA"), icon: Calculator, permission: "ADD_MARKET_PRICE" },
          { id: "reports", label: t("REPORTS", "WARBIXINNO"), icon: FileBarChart2, permission: "VIEW_REPORTS" },
          { id: "notifications", label: t("NOTIFICATIONS", "OGEYSIISYADA"), icon: Bell },
          { id: "subscription", label: t("SUBSCRIPTION", "QIDMAD"), icon: CreditCard },
          { id: "password", label: t("CHANGE PASSWORD", "BEDDEL ERAYGA SIRTA"), icon: KeyRound },
        ]
      : [
          { id: "overview", label: t("OVERVIEW", "DULMAR"), icon: Sparkles },
          { id: "hero", label: t("PAGE HERO", "MADAXA BOGGA"), icon: PanelsTopLeft, permission: "MANAGE_COMPANY" },
          { id: "contact", label: t("CONTACT INFO", "XIRIIRKA"), icon: Contact, permission: "MANAGE_COMPANY" },
          { id: "prices", label: t("UPDATE PRICE", "CUSBOONEYSI QIIMAHA"), icon: Calculator, permission: "ADD_MARKET_PRICE" },
          { id: "rates5y", label: t("PRICE HISTORY", "TAARIIKHDA QIIMAHA"), icon: LineChart, permission: "MANAGE_COMPANY" },
          { id: "reports", label: t("REPORTS", "WARBIXINNO"), icon: FileBarChart2, permission: "VIEW_REPORTS" },
          { id: "notifications", label: t("NOTIFICATIONS", "OGEYSIISYADA"), icon: Bell },
          { id: "subscription", label: t("SUBSCRIPTION", "QIDMAD"), icon: CreditCard },
          { id: "password", label: t("CHANGE PASSWORD", "BEDDEL ERAYGA SIRTA"), icon: KeyRound },
        ];

  const mainNav = mainNavUnfiltered.filter((item) => {
    if (item.permission && !hasPermission(userRole, item.permission)) {
      return false;
    }
    return companyAdminTabAllowedByPlan(item.id, planTier, {
      sector,
      isLivestockCompany: isLivestock,
    });
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/subscription-renewal", {
      credentials: "include",
      cache: "no-store",
      headers: authPortalHeaders("admin"),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const tier = body?.subscription?.plan?.tier as CompanyPlanTier | null;
        setPlanTier(
          tier === "free" || tier === "standard" || tier === "premium"
            ? tier
            : "free"
        );
      })
      .catch(() => {
        if (!cancelled) setPlanTier("free");
      })
      .finally(() => {
        if (!cancelled) setPlanTierLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!planTierLoaded) return;
    if (
      !companyAdminTabAllowedByPlan(tab, planTier, {
        sector,
        isLivestockCompany: isLivestock,
      })
    ) {
      setTab("overview");
      setError(
        companyAdminFeatureDeniedMessage(planTier ?? "free", lang === "so" ? "so" : "en")
      );
    }
  }, [planTier, planTierLoaded, tab, sector, isLivestock, lang, setTab]);

  const welcomeHint = isLivestock
    ? t(
        "Edit livestock homepage sections, hero, types, snapshot, and reference prices — updates go live.",
        "Wax ka beddel qaybaha bogga xoolaha, madaxa, noocyada, sawirka suuqa, iyo qiimaha tixraaca — waxa la beddelo si toos ah ayuu u muuqdaa."
      )
    : t(
        "Manage rates, page content, and reports — updates go live instantly.",
        "Maamul qiimaha, nuxurka bogga, iyo warbixinnada — waxa la beddelo isla markiiba ayuu u muuqdaa."
      );

  useEffect(() => {
    void loadPrices();
    void loadProfile();
  }, []);

  useEffect(() => {
    if (tab === "reports" || tab === "prices" || tab === "overview") {
      void loadPrices();
    }
    if (tab === "overview" || tab === "rates5y") {
      void loadProfile();
    }
  }, [tab]);

  useEffect(() => {
    setDisplayLogo(logoUrl ?? null);
  }, [logoUrl]);

  useEffect(() => {
    setPersonalPhoto(personalPhotoFile ?? null);
  }, [personalPhotoFile]);

  useEffect(() => {
    setMobileOpen(false);
    setMessage("");
    setError("");
  }, [tab]);

  useEffect(() => {
    if (!message && !error) return;
    const ms = message === "Saved successfully" ? 2800 : 3200;
    const id = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, ms);
    return () => window.clearTimeout(id);
  }, [message, error]);

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

  useEffect(() => {
    function refresh() {
      const now = new Date();
      setToday(
        now.toLocaleDateString(lang === "so" ? "so-SO" : "en-GB", {
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
  }, [lang]);

  async function loadPrices() {
    try {
      const res = await fetch("/api/company/prices");
      const data = await res.json();
      if (res.ok) {
        setPrices(data.prices ?? []);
        const total = Number(data.total);
        setPriceTotal(
          Number.isFinite(total) && total >= 0
            ? total
            : Array.isArray(data.prices)
              ? data.prices.length
              : 0
        );
      }
    } catch {
      // ignore
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/company/profile");
      const data = await res.json();
      if (!res.ok) return;
      const years: number[] = Array.isArray(data.rateYears)
        ? data.rateYears
        : rateYears;
      setRateYears(years);
      const p = data.profile ?? {};
      const yearly: Record<string, string> = {};
      const tiers: ProfileForm["tierRateHistory"] = {};
      const locked: number[] = [];
      const pastYears = tariffHistoryYears();
      for (const y of years) {
        const raw = p.yearlyRateHistory?.[String(y)] ?? p.yearlyRateHistory?.[y];
        yearly[String(y)] =
          raw != null && Number(raw) > 0 ? String(Number(raw)) : "";
        const tierRaw =
          p.tierRateHistory?.[String(y)] ?? p.tierRateHistory?.[y] ?? null;
        tiers[String(y)] = {
          low:
            tierRaw?.low != null && Number(tierRaw.low) > 0
              ? String(Number(tierRaw.low))
              : "",
          mid:
            tierRaw?.mid != null && Number(tierRaw.mid) > 0
              ? String(Number(tierRaw.mid))
              : "",
          high:
            tierRaw?.high != null && Number(tierRaw.high) > 0
              ? String(Number(tierRaw.high))
              : "",
        };
        if (pastYears.includes(y)) {
          const waterSaved = Number(yearly[String(y)]) > 0;
          const powerSaved =
            Number(tiers[String(y)].low) > 0 &&
            Number(tiers[String(y)].mid) > 0 &&
            Number(tiers[String(y)].high) > 0;
          if (sector === "electricity" ? powerSaved : waterSaved) {
            locked.push(y);
          }
        }
      }
      setLockedHistoryYears(locked);
      setProfile({
        phone: p.phone ?? "",
        altPhone: p.altPhone ?? "",
        email: p.email ?? "",
        website: p.website ?? "",
        address: p.address ?? "",
        addressLabel: p.addressLabel ?? "Head Office",
        location: p.location || "Mogadishu",
        businessHours: p.businessHours ?? "",
        waterSource: p.waterSource ?? "",
        supplyType: p.supplyType ?? "",
        callCenter: p.callCenter ?? "",
        facebook: p.facebook ?? "",
        tagline: p.tagline ?? "",
        description: p.description ?? "",
        infoTitle: p.infoTitle ?? "",
        infoBrief: p.infoBrief ?? "",
        infoPointsText: Array.isArray(p.infoPoints) ? p.infoPoints.join("\n") : "",
        currentPrice: p.currentPrice ?? "",
        somali: p.somali ?? "",
        providerLabel: p.providerLabel ?? "",
        companyName: p.companyName ?? "",
        yearlyRateHistory: yearly,
        tierRateHistory: tiers,
        categoriesTitle: p.categoriesTitle ?? "",
        categoriesSubtitle: p.categoriesSubtitle ?? "",
        typesTitle: p.typesTitle ?? "",
        typesSubtitle: p.typesSubtitle ?? "",
        snapshotTitle: p.snapshotTitle ?? "",
        snapshotSubtitle: p.snapshotSubtitle ?? "",
        ratesNote: p.ratesNote ?? "",
        serviceAreas: p.serviceAreas ?? "",
        calculatorTitle: p.calculatorTitle ?? "",
        calculatorSubtitle: p.calculatorSubtitle ?? "",
        calculatorEmptyHint: p.calculatorEmptyHint ?? "",
        heroEyebrow: p.heroEyebrow ?? "",
      });
    } catch {
      setLockedHistoryYears([]);
      setProfile(emptyProfile(rateYears));
    }
  }

  function saveProfile(sectionLabel: string) {
    if (!profile) return;
    setMessage("");
    setError("");
    const label = sectionLabel.toLowerCase();
    if (
      label.includes("history") &&
      !companyAdminCanEditPriceHistory(planTier, { isLivestockCompany: isLivestock })
    ) {
      setError(
        companyAdminFeatureDeniedMessage(
          planTier ?? "free",
          lang === "so" ? "so" : "en"
        )
      );
      return;
    }
    startTransition(async () => {
      const startedAt = Date.now();

      // Only patch fields for this section — avoids wiping supplyType / rates when
      // saving Contact Info (empty contact fields must not clear the home-card pill).
      const contactKeys = [
        "phone",
        "altPhone",
        "email",
        "website",
        "address",
        "addressLabel",
        "location",
        "businessHours",
        "serviceAreas",
        "facebook",
        "callCenter",
      ] as const;
      const aboutKeys = [
        "tagline",
        "description",
        "infoTitle",
        "infoBrief",
        "somali",
        "providerLabel",
        "companyName",
        "waterSource",
        "supplyType",
        "currentPrice",
        "heroEyebrow",
      ] as const;

      let body: Record<string, unknown>;
      // label already computed above
      if (label.includes("contact")) {
        body = {};
        for (const key of contactKeys) body[key] = profile[key] ?? "";
      } else if (label.includes("about")) {
        body = {
          infoPoints: profile.infoPointsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        };
        for (const key of aboutKeys) body[key] = profile[key] ?? "";
      } else if (label.includes("history")) {
        const yearlyRateHistory: Record<string, number> = {};
        if (sector === "electricity") {
          const tierRateHistory: Record<
            string,
            { low: number; mid: number; high: number }
          > = {};
          for (const year of historyYears) {
            const rates = profile.tierRateHistory[String(year)];
            const low = Number(rates?.low);
            const mid = Number(rates?.mid);
            const high = Number(rates?.high);
            if (low > 0) yearlyRateHistory[String(year)] = low;
            if (low > 0 && mid > 0 && high > 0) {
              tierRateHistory[String(year)] = { low, mid, high };
            }
          }
          body = { yearlyRateHistory, tierRateHistory };
        } else {
          for (const year of historyYears) {
            const n = Number(profile.yearlyRateHistory[String(year)]);
            if (Number.isFinite(n) && n > 0) yearlyRateHistory[String(year)] = n;
          }
          body = { yearlyRateHistory };
        }
      } else if (label.includes("rate")) {
        const yearKey = String(currentYear);
        const yearlyRateHistory: Record<string, number> = {};
        if (sector === "electricity") {
          const rates = profile.tierRateHistory[yearKey];
          const low = Number(rates?.low);
          const mid = Number(rates?.mid);
          const high = Number(rates?.high);
          if (low > 0) yearlyRateHistory[yearKey] = low;
          body = { yearlyRateHistory };
          if (low > 0 && mid > 0 && high > 0) {
            body.tierRateHistory = { [yearKey]: { low, mid, high } };
          }
        } else {
          const n = Number(profile.yearlyRateHistory[yearKey]);
          if (Number.isFinite(n) && n > 0) yearlyRateHistory[yearKey] = n;
          body = { yearlyRateHistory };
        }
      } else {
        const yearlyRateHistory: Record<string, number> = {};
        for (const [year, value] of Object.entries(profile.yearlyRateHistory)) {
          const n = Number(value);
          if (Number.isFinite(n) && n > 0) yearlyRateHistory[year] = n;
        }
        body = {
          ...profile,
          infoPoints: profile.infoPointsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          yearlyRateHistory,
        };
        if (sector === "electricity") {
          const tierRateHistory: Record<
            string,
            { low: number; mid: number; high: number }
          > = {};
          for (const [year, rates] of Object.entries(profile.tierRateHistory)) {
            const low = Number(rates.low);
            const mid = Number(rates.mid);
            const high = Number(rates.high);
            if (low > 0 && mid > 0 && high > 0) {
              tierRateHistory[year] = { low, mid, high };
            }
          }
          body.tierRateHistory = tierRateHistory;
        }
      }

      const res = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("Could not save", "Lama kaydin karin"));
        return;
      }
      const wait = Math.max(0, 500 - (Date.now() - startedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setMessage("Saved successfully");
      void loadProfile();
      setReportRefreshKey((k) => k + 1);
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authPortalHeaders("admin"),
    });
    window.location.href = "/login?mode=admin";
  }

  const publicPageHref =
    sector === "water"
      ? "/water"
      : sector === "electricity"
        ? "/electricity"
        : sector === "livestock"
          ? "/livestock"
          : null;

  const saveBar = (label: string) => (
    <div className="flex flex-col items-center gap-2 pt-2">
      {error ? (
        <p className="min-h-[1.25rem] text-center text-sm font-bold text-rose-600">
          {error}
        </p>
      ) : (
        <p className="min-h-[1.25rem]" aria-hidden />
      )}
      <AdminSaveButton
        label={`${t("Save", "Kaydi")} ${label}`}
        savingLabel={t("Saving…", "Waa la kaydinayaa…")}
        savedLabel={t("Saved successfully", "Si guul leh ayaa loo kaydiyay")}
        saving={pending}
        saved={justSaved}
        disabled={!profile}
        fullWidth
        onClick={() => saveProfile(label)}
      />
      {justSaved && publicPageHref ? (
        <Link
          href={publicPageHref}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-bold text-emerald-700 underline-offset-2 hover:underline"
        >
          {t("Open public page", "Fur bogga dadweynaha")} →
        </Link>
      ) : null}
    </div>
  );

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    setLogoUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/company/logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : res.status === 401 || res.status === 403
              ? t("Please sign in again, then retry the logo upload", "Fadlan mar kale soo gal, kadibna isku day soo gelinta logo-ga")
              : t("Could not upload logo", "Logo-ga lama soo gelin karin")
        );
        return;
      }
      if (typeof data.image === "string") {
        setDisplayLogo(data.image);
        setMessage("Saved successfully");
      }
    } catch {
      setError(t("Could not upload logo — check your connection and try again", "Logo-ga lama soo gelin karin — hubi xidhiidhka kadibna isku day"));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;
    setPhotoUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/company/photo", {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: authPortalHeaders("admin"),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : res.status === 401 || res.status === 403
              ? t("Please sign in again, then retry the photo upload", "Fadlan mar kale soo gal, kadibna isku day soo gelinta sawirka")
              : t("Could not upload photo", "Sawirka lama soo gelin karin")
        );
        return;
      }
      if (typeof data.image === "string") {
        setPersonalPhoto(data.image);
        setMessage("Saved successfully");
      }
    } catch {
      setError(t("Could not upload photo — check your connection and try again", "Sawirka lama soo gelin karin — hubi xidhiidhka kadibna isku day"));
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={photoUploading}
            onClick={() => photoInputRef.current?.click()}
            className="relative rounded-xl disabled:opacity-60"
            title={t("Upload admin photo", "Soo geli sawirka maamulka")}
          >
            <PersonAvatar
              src={personalAvatar}
              name={fullName}
              initials={personInitials}
              size="sm"
              badge="CA"
            />
            <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-0.5">
              <Camera className="h-3 w-3 text-white" strokeWidth={2.5} />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black tracking-tight text-white">
              {fullName}
            </p>
            <p className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-emerald-200/75">
              {t("Company Admin", "Maamulaha shirkadda")}
            </p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
          {t("DASHBOARD", "SAHANKA")}
        </p>
        {mainNav.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setMobileOpen(false);
              }}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-black uppercase tracking-[0.06em] transition-all",
                active
                  ? "bg-[#0a5240] text-white shadow-sm"
                  : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-emerald-300" : "text-emerald-200/60"
                )}
                strokeWidth={2}
              />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
            {t("SECTOR", "QAYBTA")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.06em] text-white">
            <SectorIcon className="h-3.5 w-3.5 text-emerald-300" />
            {sectorLabel}
          </p>
          <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-3">
            <PersonAvatar
              src={personalAvatar}
              name={fullName}
              initials={personInitials}
              size="sm"
              badge="CA"
            />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-white">{fullName}</p>
              <p className="truncate text-[10px] font-medium text-emerald-200/70">
                {email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="company-admin-shell fixed inset-0 z-[60] flex overflow-hidden overscroll-none bg-[#f4f6f5]">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void handlePhotoUpload(file);
        }}
      />
      {!hideSidebar && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col bg-[#00392b] lg:flex">
          {sidebar}
        </aside>
      )}

      {!hideSidebar && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("Close menu", "Xidh liiska")}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(100vw,300px)] max-w-full bg-[#00392b] shadow-2xl">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-emerald-100 hover:bg-white/10"
                aria-label={t("Close", "Xidh")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">{sidebar}</div>
          </aside>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          !hideSidebar && "lg:pl-[280px]"
        )}
      >
        <header className="sticky top-0 z-30 flex h-[min(76px,14vw)] min-h-[3.5rem] shrink-0 items-center gap-2 border-b border-slate-200/90 bg-white px-2.5 shadow-sm min-[360px]:gap-3 min-[360px]:px-4 sm:h-[76px] sm:px-5">
          {!hideSidebar && (
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("Open menu", "Fur liiska")}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p className="inline-flex max-w-full items-center gap-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-teal-700/80">
              <span className="truncate">{t("Welcome back", "Ku soo dhawoow")}</span>
              <WaveHand />
            </p>
            <h1 className="truncate text-[15px] font-black tracking-tight text-slate-900 sm:text-[16px]">
              {greeting ? greeting[lang] : "\u00a0"}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher lang={lang} setLang={setLang} />
            {today ? (
            <div
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 sm:inline-flex"
              title={t("Today’s date", "Taariikhda maanta")}
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
                  "inline-flex items-center gap-2 overflow-visible rounded-lg border bg-white py-1 pl-1.5 pr-2 transition",
                  menuOpen
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 hover:bg-slate-50"
                )}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <PersonAvatar
                  src={personalAvatar}
                  name={fullName}
                  initials={personInitials}
                  size="sm"
                  badge="CA"
                />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-[12px] font-bold text-slate-800">
                    {fullName}
                  </span>
                  <span className="block truncate text-[10px] font-medium text-slate-500">
                    {email}
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
                    <p className="truncate text-[12px] font-bold text-slate-800">
                      {fullName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                      {email}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                      {t("Company Admin", "Maamulaha shirkadda")} · {acronym}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                      <LogOut className="h-4 w-4" />
                    </span>
                    {t("Logout", "Ka bax")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-none px-3 py-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "w-full",
              tab === "rates5y" || tab === "prices"
                ? "flex min-h-0 flex-1 flex-col"
                : "mx-auto max-w-6xl space-y-6"
            )}
          >
            {tab === "subscription" && <CompanySubscriptionView />}

            {tab === "overview" && (
              <CompanyOverviewPanel
                fullName={fullName}
                personalAvatar={personalAvatar}
                personInitials={personInitials}
                acronym={acronym}
                sector={sector}
                rateUnit={rateUnit}
                rateYears={rateYears}
                currentYear={currentYear}
                profile={profile}
                prices={prices}
                ownPriceCount={priceTotal}
                href={href}
                welcomeHint={welcomeHint}
                planTier={planTier}
                onNavigate={(next) => {
                  if (
                    !companyAdminTabAllowedByPlan(next, planTier, {
                      sector,
                      isLivestockCompany: isLivestock,
                    })
                  ) {
                    setError(
                      companyAdminFeatureDeniedMessage(
                        planTier ?? "free",
                        lang === "so" ? "so" : "en"
                      )
                    );
                    return;
                  }
                  setTab(next);
                }}
              />
            )}

            {tab === "prices" && isLivestock && (
              <div className="mx-auto w-full max-w-6xl">
                <LivestockPricesEditor />
              </div>
            )}

            {tab === "prices" && !isLivestock && (
              <div className="flex w-full flex-1 items-center justify-center self-stretch px-2 py-4">
                <Card
                  className={cn(
                    "mx-auto flex w-full min-h-[22rem] shrink-0 flex-col overflow-hidden !p-0 shadow-lg shadow-slate-900/5 sm:min-h-[24rem]",
                    sector === "electricity"
                      ? "max-w-4xl sm:max-w-5xl"
                      : "max-w-2xl sm:max-w-3xl"
                  )}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-5 sm:px-8 sm:py-6">
                    <div className="flex flex-col items-center text-center">
                      <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                        {t("Update", "Cusbooneysii")} {sectorLabel.toLowerCase()} {t("prices", "qiimaha")}
                      </h3>
                      <p className="mt-1 text-[13px] font-medium text-slate-500">
                        {t("Current year", "Sanadka hadda")} {currentYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-center space-y-5 px-6 py-7 sm:px-10 sm:py-8">
                    {!profile ? (
                      <p className="py-4 text-center text-sm text-slate-400">
                        {t("Loading…", "Waa la soo dejinayaa…")}
                      </p>
                    ) : sector === "electricity" ? (
                      <>
                        {(() => {
                          const yearKey = String(currentYear);
                          const tier = profile.tierRateHistory[yearKey] ?? {
                            low: "",
                            mid: "",
                            high: "",
                          };
                          return (
                            <div className="mx-auto w-full max-w-4xl rounded-2xl border border-violet-300 bg-violet-50/70 p-4 ring-1 ring-violet-200">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                  {currentYear}
                                </span>
                                <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-black text-white">
                                  {t("Current", "Hadda")}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {ELECTRICITY_ADMIN_TIER_FIELDS.map((col) => (
                                  <div key={col.key}>
                                    <label className="mb-1.5 block text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                      {col.label}
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={tier[col.key] ?? ""}
                                      onChange={(e) =>
                                        setProfile({
                                          ...profile,
                                          tierRateHistory: {
                                            ...profile.tierRateHistory,
                                            [yearKey]: {
                                              ...tier,
                                              [col.key]: e.target.value,
                                            },
                                          },
                                        })
                                      }
                                      placeholder="e.g. 0.41"
                                      className="h-11 text-center text-base font-semibold tabular-nums sm:h-12"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex flex-col items-center gap-1.5 pt-2">
                          {error ? (
                            <p className="text-center text-xs font-bold text-rose-600">
                              {error}
                            </p>
                          ) : null}
                          <AdminSaveButton
                            label={t("Save current price", "Kaydi qiimaha hadda")}
                            savingLabel={t("Saving…", "Waa la kaydinayaa…")}
                            savedLabel={t("Saved successfully", "Si guul leh ayaa loo kaydiyay")}
                            saving={pending}
                            saved={justSaved}
                            disabled={!profile}
                            fullWidth
                            onClick={() => saveProfile("rates")}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 ring-1 ring-emerald-200">
                          <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            <span>
                              {currentYear} ({rateUnit})
                            </span>
                            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[9px] font-black text-white">
                              {t("Current", "Hadda")}
                            </span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              profile.yearlyRateHistory[String(currentYear)] ?? ""
                            }
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                yearlyRateHistory: {
                                  ...profile.yearlyRateHistory,
                                  [String(currentYear)]: e.target.value,
                                },
                              })
                            }
                            placeholder="e.g. 0.41"
                            className="h-12 text-center text-base font-semibold tabular-nums sm:h-14 sm:text-lg"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1.5 pt-2">
                          {error ? (
                            <p className="text-center text-xs font-bold text-rose-600">
                              {error}
                            </p>
                          ) : null}
                          <AdminSaveButton
                            label={t("Save current price", "Kaydi qiimaha hadda")}
                            savingLabel={t("Saving…", "Waa la kaydinayaa…")}
                            savedLabel={t("Saved successfully", "Si guul leh ayaa loo kaydiyay")}
                            saving={pending}
                            saved={justSaved}
                            disabled={!profile}
                            fullWidth
                            onClick={() => saveProfile("rates")}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {tab === "hero" && (
              <Card className="overflow-hidden !p-0">
                <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-white px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                      <PanelsTopLeft className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t("Page Hero", "Madaxa bogga")}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {isLivestock
                          ? t(
                              "Logo, title, and description for the public livestock homepage hero.",
                              "Logo, cinwaan, iyo sharaxaad ee madaxa bogga dadweynaha ee xoolaha."
                            )
                          : t(
                              `Logo, title, description, address, and hero cards on your public ${sectorLabel.toLowerCase()} page.`,
                              `Logo, cinwaan, sharaxaad, cinwaan, iyo kaararka madaxa bogga dadweynaha ee ${sectorLabel.toLowerCase()}.`
                            )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 px-5 py-6 sm:px-6">
                  {!profile ? (
                    <p className="py-8 text-center text-sm text-slate-400">{t("Loading…", "Waa la soo dejinayaa…")}</p>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          {t("Company", "Shirkadda")}
                        </p>
                        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {displayLogo ? (
                              <Image
                                src={displayLogo}
                                alt={`${profile.companyName || acronym} logo`}
                                fill
                                className="object-contain p-2"
                                sizes="96px"
                              />
                            ) : (
                              <Building2 className="h-8 w-8 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            {isUtility ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                  label={t("Company name", "Magaca shirkadda")}
                                  value={profile.companyName}
                                  onChange={(v) =>
                                    setProfile({ ...profile, companyName: v })
                                  }
                                />
                                <Field
                                  label={t("Short name", "Magaca gaaban")}
                                  value={profile.providerLabel}
                                  onChange={(v) =>
                                    setProfile({ ...profile, providerLabel: v })
                                  }
                                />
                              </div>
                            ) : (
                              <p className="text-[13px] font-semibold text-slate-700">
                                {t("Upload a new logo for", "Soo geli logo cusub ee")} {acronym}
                              </p>
                            )}
                            <p className="text-[12px] text-slate-500">
                              {t(
                                "PNG, JPEG, WEBP · max 5 MB · shows on public page & sidebar",
                                "PNG, JPEG, WEBP · ugu badnaan 5 MB · wuxuu ka muuqdaa bogga dadweynaha iyo dhinaca"
                              )}
                            </p>
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) =>
                                void handleLogoUpload(e.target.files?.[0] ?? null)
                              }
                            />
                            <button
                              type="button"
                              disabled={logoUploading}
                              onClick={() => logoInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <ImageIcon className="h-4 w-4" />
                              {logoUploading ? t("Uploading…", "Waa la soo gelinayaa…") : t("Change image", "Beddel sawirka")}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isLivestock && (
                        <Field
                          label={t("Hero title (livestock page)", "Cinwaanka madaxa (bogga xoolaha)")}
                          value={profile.tagline}
                          onChange={(v) => setProfile({ ...profile, tagline: v })}
                        />
                      )}

                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {t("Hero description", "Sharaxaadda madaxa")}
                        </label>
                        <textarea
                          value={profile.description}
                          onChange={(e) =>
                            setProfile({ ...profile, description: e.target.value })
                          }
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                        />
                        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                          {t(
                            "Write in English or Somali — the other language translates automatically on the public page.",
                            "Ku qor Ingiriisi ama Soomaali — luqadda kale ayaa bogga dadweynaha si otomatic ah ugu turjumaysa."
                          )}
                        </p>
                      </div>

                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                        {sector === "livestock"
                          ? t("Hero cards (Market · Categories · History)", "Kaararka madaxa (Suuqa · Qaybaha · Taariikhda)")
                          : t("Hero cards (Location)", "Kaararka madaxa (Goobta)")}
                      </p>
                      <div
                        className={cn(
                          "grid gap-4",
                          sector === "livestock" ? "sm:grid-cols-3" : "sm:grid-cols-1"
                        )}
                      >
                        <Field
                          icon={MapPin}
                          label={
                            sector === "livestock" ? t("Market card", "Kaarka suuqa") : t("Location card", "Kaarka goobta")
                          }
                          value={profile.location}
                          onChange={(v) => setProfile({ ...profile, location: v })}
                        />
                        {sector === "livestock" ? (
                          <Field
                            icon={Beef}
                            label={t("Categories card", "Kaarka qaybaha")}
                            value={profile.providerLabel}
                            onChange={(v) =>
                              setProfile({ ...profile, providerLabel: v })
                            }
                          />
                        ) : null}
                        {sector === "livestock" ? (
                          <Field
                            icon={Beef}
                            label={t("History card", "Kaarka taariikhda")}
                            value={profile.currentPrice}
                            onChange={(v) => setProfile({ ...profile, currentPrice: v })}
                          />
                        ) : null}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          icon={MapPin}
                          label={t("Address (under hero)", "Cinwaanka (hoosta madaxa)")}
                          value={profile.address}
                          onChange={(v) => setProfile({ ...profile, address: v })}
                        />
                      </div>
                      {saveBar(t("Page Hero", "Madaxa bogga"))}
                    </>
                  )}
                </div>
              </Card>
            )}

            {tab === "contact" && (
              <Card className="overflow-hidden !p-0">
                <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
                      <PhoneCall className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t("Contact Info", "Xiriirka")}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {t(
                          `Same fields as the Contact Info card on your public ${sectorLabel.toLowerCase()} page.`,
                          `Isla meelaha kaarka xiriirka ee bogga dadweynaha ee ${sectorLabel.toLowerCase()}.`
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-5 px-5 py-6 sm:px-6">
                  {!profile ? (
                    <p className="py-8 text-center text-sm text-slate-400">{t("Loading…", "Waa la soo dejinayaa…")}</p>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          {t("Admin photo", "Sawirka maamulka")}
                        </p>
                        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                            <PersonAvatar
                              src={personalAvatar}
                              name={fullName}
                              initials={personInitials}
                              size="lg"
                              badge="CA"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-[13px] font-semibold text-slate-800">
                              {t("Personal photo of", "Sawirka shakhsiga ah ee")} {fullName}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {t(
                                "PNG, JPEG, WEBP · max 5 MB · this is the admin person, not the company logo",
                                "PNG, JPEG, WEBP · ugu badnaan 5 MB · kani waa qofka maamulka, ma aha logo-ga shirkadda"
                              )}
                            </p>
                            <button
                              type="button"
                              disabled={photoUploading}
                              onClick={() => photoInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <Camera className="h-4 w-4" />
                              {photoUploading
                                ? t("Uploading…", "Waa la soo gelinayaa…")
                                : personalAvatar
                                  ? t("Change photo", "Beddel sawirka")
                                  : t("Upload photo", "Soo geli sawir")}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          icon={MapPin}
                          label={t("Address label", "Calaamadda cinwaanka")}
                          value={profile.addressLabel}
                          onChange={(v) =>
                            setProfile({ ...profile, addressLabel: v })
                          }
                        />
                        <Field
                          icon={MapPin}
                          label={t("Head office address", "Cinwaanka xafiiska weyn")}
                          value={profile.address}
                          onChange={(v) => setProfile({ ...profile, address: v })}
                        />
                        <Field
                          label={t("Call center", "Xarunta wicitaanka")}
                          value={profile.callCenter}
                          onChange={(v) =>
                            setProfile({ ...profile, callCenter: v })
                          }
                        />
                        <Field
                          icon={Phone}
                          label={t("Phone", "Telefoon")}
                          value={profile.phone}
                          onChange={(v) =>
                            setProfile({ ...profile, phone: sanitizePhoneInput(v) })
                          }
                        />
                        {profile.altPhone.trim() !== "" ? (
                          <Field
                            icon={Phone}
                            label={t("Alt phone", "Telefoon kale")}
                            value={profile.altPhone}
                            onChange={(v) =>
                              setProfile({
                                ...profile,
                                altPhone: sanitizePhoneInput(v),
                              })
                            }
                          />
                        ) : null}
                        <Field
                          icon={Mail}
                          label={t("Email", "Email")}
                          value={profile.email}
                          onChange={(v) => setProfile({ ...profile, email: v })}
                        />
                        <Field
                          icon={Globe}
                          label={t("Website", "Bogga internetka")}
                          value={profile.website}
                          onChange={(v) => setProfile({ ...profile, website: v })}
                        />
                        {isUtility && (
                          <>
                            <Field
                              label={t("Business hours", "Saacadaha shaqada")}
                              value={profile.businessHours}
                              onChange={(v) =>
                                setProfile({ ...profile, businessHours: v })
                              }
                            />
                            <Field
                              label={t("Service areas", "Goobaha adeegga")}
                              value={profile.serviceAreas}
                              onChange={(v) =>
                                setProfile({ ...profile, serviceAreas: v })
                              }
                            />
                            <Field
                              label="Facebook"
                              value={profile.facebook}
                              onChange={(v) =>
                                setProfile({ ...profile, facebook: v })
                              }
                            />
                          </>
                        )}
                      </div>
                      {saveBar(t("Contact Info", "Xiriirka"))}
                    </>
                  )}
                </div>
              </Card>
            )}

            {(
              [
                {
                  id: "categories" as const,
                  title: t("Livestock categories", "Qaybaha Xoolaha"),
                  subtitle: t(
                    "Home page livestock categories — Camels, Cattle, and Sheep & goats cards",
                    "Qaybta qaybaha xoolaha ee bogga hore — kaararka Geelka, Lo'da, Arriga"
                  ),
                  icon: LayoutGrid,
                  tone: "from-emerald-500 to-green-600",
                  titleKey: "categoriesTitle" as const,
                  subtitleKey: "categoriesSubtitle" as const,
                  titlePhEn: "Livestock categories",
                  titlePhSo: "Qaybaha Xoolaha",
                  subtitlePhEn:
                    "Choose Camels, Cattle, or Sheep & goats — each has its own dedicated page",
                  subtitlePhSo:
                    "Dooro Geelka, Lo'da, ama Arriga — mid walba wuxuu leeyahay bog u gaar ah",
                  publicHref: "/#home-sectors",
                },
                {
                  id: "types" as const,
                  title: t("Livestock types", "Noocyada Xoolaha"),
                  subtitle: t(
                    "Livestock types page headings",
                    "Cinwaannada bogga noocyada xoolaha"
                  ),
                  icon: Layers,
                  tone: "from-green-500 to-teal-600",
                  titleKey: "typesTitle" as const,
                  subtitleKey: "typesSubtitle" as const,
                  titlePhEn: "Livestock types",
                  titlePhSo: "Noocyada Xoolaha",
                  subtitlePhEn:
                    "Official Camels, Cattle, and Sheep & goats type names used in Banadir markets",
                  subtitlePhSo:
                    "Magacyada rasmiga ah ee Geelka, Lo'da iyo Arriga ee suuqyada Banaadir",
                  publicHref: "/livestock/types",
                },
                {
                  id: "snapshot" as const,
                  title: t("Market Snapshot", "Sawirka suuqa"),
                  subtitle: t(
                    "Livestock homepage average / snapshot section headings",
                    "Cinwaannada qaybta celceliska / sawirka suuqa ee bogga xoolaha"
                  ),
                  icon: Radio,
                  tone: "from-teal-500 to-cyan-600",
                  titleKey: "snapshotTitle" as const,
                  subtitleKey: "snapshotSubtitle" as const,
                  titlePhEn: "Live Price Snapshot",
                  titlePhSo: "Sawirka qiimaha tooska ah",
                  subtitlePhEn:
                    "Average prices in Mogadishu — Camels, Cattle & Sheep & goats",
                  subtitlePhSo:
                    "Celceliska qiimaha Muqdisho — Geelka, Lo'da iyo Arriga",
                  publicHref: "/livestock",
                },
              ] as const
            ).map(
              (section) =>
                tab === section.id && (
                  <Card key={section.id} className="overflow-hidden !p-0">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-white px-5 py-5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
                            section.tone
                          )}
                        >
                          <section.icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {section.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {section.subtitle}
                          </p>
                          <Link
                            href={section.publicHref}
                            target="_blank"
                            className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 hover:underline"
                          >
                            {t("Open public page", "Fur bogga dadweynaha")} <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5 px-5 py-6 sm:px-6">
                      {!profile ? (
                        <p className="py-8 text-center text-sm text-slate-400">
                          {t("Loading…", "Waa la soo dejinayaa…")}
                        </p>
                      ) : (
                        <>
                          <Field
                            label={t("Section title", "Cinwaanka qaybta")}
                            value={profile[section.titleKey]}
                            onChange={(v) =>
                              setProfile({
                                ...profile,
                                [section.titleKey]: v,
                              })
                            }
                          />
                          <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              {t("Section subtitle", "Sharaxaadda qaybta")}
                            </label>
                            <textarea
                              value={profile[section.subtitleKey]}
                              onChange={(e) =>
                                setProfile({
                                  ...profile,
                                  [section.subtitleKey]: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder={lang === "so" ? section.subtitlePhSo : section.subtitlePhEn}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                            />
                            <p className="mt-1.5 text-[11px] text-slate-400">
                              {t("Default on public page:", "Bogga dadweynaha wuxuu bilaabmaa:")} “{lang === "so" ? section.titlePhSo : section.titlePhEn}”
                            </p>
                          </div>
                          {saveBar(section.title)}
                        </>
                      )}
                    </div>
                  </Card>
                )
            )}

            {tab === "rates5y" &&
              companyAdminTabAllowedByPlan("rates5y", planTier, {
                sector,
                isLivestockCompany: isLivestock,
              }) && (
              <div className="flex w-full flex-1 items-center justify-center self-stretch px-2 py-4">
                <Card
                  className={cn(
                    "mx-auto flex w-full min-h-[26rem] shrink-0 flex-col overflow-hidden !p-0 shadow-lg shadow-slate-900/5 sm:min-h-[28rem]",
                    sector === "electricity"
                      ? "max-w-4xl sm:max-w-5xl"
                      : "max-w-2xl sm:max-w-3xl"
                  )}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white px-6 py-5 sm:px-8">
                    <div className="flex flex-col items-center text-center">
                      <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                        {ratesTitle}
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-center space-y-5 px-6 py-7 sm:px-10 sm:py-8">
                    {!profile ? (
                      <p className="py-4 text-center text-sm text-slate-400">
                        {t("Loading…", "Waa la soo dejinayaa…")}
                      </p>
                    ) : sector === "electricity" ? (
                      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                        {[...historyYears].reverse().map((year) => {
                          const yearKey = String(year);
                          const locked = historyLocked.has(year);
                          const tier = profile.tierRateHistory[yearKey] ?? {
                            low: "",
                            mid: "",
                            high: "",
                          };
                          return (
                            <div
                              key={year}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                  {year}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {ELECTRICITY_ADMIN_TIER_FIELDS.map((col) => (
                                  <div key={col.key}>
                                    <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                      {col.label}
                                    </p>
                                    {locked ? (
                                      <div className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold tabular-nums text-slate-800 sm:h-12">
                                        {formatAdminRate(tier[col.key])}
                                      </div>
                                    ) : (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier[col.key] ?? ""}
                                        onChange={(e) =>
                                          setProfile({
                                            ...profile,
                                            tierRateHistory: {
                                              ...profile.tierRateHistory,
                                              [yearKey]: {
                                                ...tier,
                                                [col.key]: e.target.value,
                                              },
                                            },
                                          })
                                        }
                                        placeholder="e.g. 0.41"
                                        className="h-11 text-center text-base font-semibold tabular-nums sm:h-12"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 min-[320px]:grid-cols-2 min-[320px]:gap-4">
                        {[...historyYears].reverse().map((year) => {
                          const yearKey = String(year);
                          const locked = historyLocked.has(year);
                          return (
                            <div
                              key={year}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="mb-2">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                  {year} ({rateUnit})
                                </p>
                              </div>
                              {locked ? (
                                <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold tabular-nums text-slate-800 sm:h-14 sm:text-lg">
                                  {formatAdminRate(
                                    profile.yearlyRateHistory[yearKey]
                                  )}
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={profile.yearlyRateHistory[yearKey] ?? ""}
                                  onChange={(e) =>
                                    setProfile({
                                      ...profile,
                                      yearlyRateHistory: {
                                        ...profile.yearlyRateHistory,
                                        [yearKey]: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="e.g. 0.41"
                                  className="h-12 text-center text-base font-semibold tabular-nums sm:h-14 sm:text-lg"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {profile ? (
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        <p className="text-center text-[11px] font-medium text-slate-500">
                          {hasEditableHistory
                            ? t(
                                "Enter each year once. After Save, that year cannot be changed.",
                                "Sanad kasta hal mar geli. Kadib kaydinta, sanadkaas lama beddeli karo."
                              )
                            : t(
                                "Price history is locked. Saved years cannot be changed.",
                                "Taariikhda qiimaha waa xiran tahay. Sanadaha la kaydiyay lama beddeli karo."
                              )}
                        </p>
                        {error ? (
                          <p className="text-center text-xs font-bold text-rose-600">
                            {error}
                          </p>
                        ) : null}
                        {hasEditableHistory ? (
                          <AdminSaveButton
                            label={t("Save Price History", "Kaydi taariikhda qiimaha")}
                            savingLabel={t("Saving…", "Waa la kaydinayaa…")}
                            savedLabel={t("Saved successfully", "Si guul leh ayaa loo kaydiyay")}
                            saving={pending}
                            saved={justSaved}
                            disabled={!profile}
                            fullWidth
                            onClick={() => saveProfile("price history")}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            )}

            {tab === "reports" && (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2">
                <CompanyReportsPanel
                  acronym={acronym}
                  sector={sector}
                  sectorLabel={sectorLabel}
                  rateUnit={rateUnit}
                  rateYears={rateYears}
                  currentYear={currentYear}
                  profile={profile}
                  prices={prices}
                  ownPriceCount={priceTotal}
                  onOpenPrices={() => setTab("prices")}
                />
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[var(--shadow)] sm:p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-black text-slate-900">
                      {t("Filtered price report", "Warbixinta qiimaha ee la sifeeyay")}
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-slate-500">
                      {t(
                        "Full history of your company price updates only — choose From / To dates, then Search Report.",
                        "Taariikhda buuxda ee cusboonaysiinta qiimaha shirkaddaada keliya — dooro taariikhda laga bilaabo / ilaa, kadibna Raadi warbixinta."
                      )}
                    </p>
                  </div>
                  <ReportsAnalyticsPanel
                    showCompanyFilter={false}
                    companySector={sector}
                    refreshKey={reportRefreshKey}
                    companyLogo={displayLogo}
                    companyName={companyName}
                    companyAcronym={acronym}
                    companyAddress={profile?.address || profile?.location || ""}
                    adminName={fullName}
                    adminEmail={email}
                  />
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div className="mx-auto flex w-full max-w-5xl flex-col py-2">
                <NotificationCenter
                  canMessageSuperAdmin
                  currentUserId={userId}
                />
              </div>
            )}

            {tab === "password" && (
              <div className="mx-auto flex w-full max-w-5xl flex-col justify-center py-4">
                <ChangePasswordForm />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function CompanySubscriptionView() {
  const { lang, t } = useLang();
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState("");
  const [paidAmount, setPaidAmount] = useState<string | null>(null);
  const [paidMonths, setPaidMonths] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/subscription-renewal", {
      credentials: "include",
      headers: authPortalHeaders("admin"),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const sub = body.subscription;
        if (!res.ok || !sub) {
          setMissing(true);
          return;
        }
        setPlanName(sub.plan?.name || "");
        setPaidAmount(
          sub.paidAmount == null ? null : Number(sub.paidAmount).toFixed(2)
        );
        setPaidMonths(
          Number.isInteger(Number(sub.paidMonths)) && Number(sub.paidMonths) > 0
            ? Number(sub.paidMonths)
            : null
        );
        setStatus(sub.status || "");
        setStartDate(String(sub.startDate || "").slice(0, 10));
        setExpiryDate(String(sub.expiryDate || "").slice(0, 10));
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 py-2">
      <h2 className="text-lg font-black text-slate-900">{t("Subscription", "Qidmad")}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {loading
                ? t("Loading…", "Waa la soo dejinayaa…")
                : missing
                  ? t("No active subscription", "Qidmad firfircoon ma jirto")
                  : publicPlanName(planName, lang)}
            </p>
            <p className="text-xs text-slate-500">{t("Subscription status", "Xaaladda qidmada")}</p>
          </div>
        </div>
        {!loading && missing ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {t(
              "You do not have an active subscription. Contact the admin to activate one.",
              "Qidmad firfircoon ma lihid. La xiriir maamulka si loo furto."
            )}
          </p>
        ) : null}
        {!loading && !missing ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {t("Status", "Xaaladda")}
              </dt>
              <dd className="mt-1"><StatusBadge status={status} /></dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {t("Amount paid", "Lacagta la bixiyay")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {paidAmount == null ? t("Not recorded", "Lama diiwaangelin") : `$${paidAmount}`}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {t("Start date", "Taariikhda bilowga")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{startDate}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {t("Expiry date", "Taariikhda dhammaadka")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{expiryDate}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {t("Months paid", "Bilaha la bixiyay")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {paidMonths == null
                  ? t("Not recorded", "Lama diiwaangelin")
                  : lang === "so"
                    ? `${paidMonths} bil oo qorshahan ah. Markay dhammaato akoonku wuu xirmaa.`
                    : `${paidMonths} month${paidMonths === 1 ? "" : "s"} of this plan. The account locks when they end.`}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
      <SubscriptionRenewalPanel portal="admin" />
    </div>
  );
}

function CompanyOverviewPanel({
  fullName,
  personalAvatar,
  personInitials,
  acronym,
  sector,
  rateUnit,
  rateYears,
  currentYear,
  profile,
  prices,
  ownPriceCount,
  href,
  welcomeHint,
  planTier,
  onNavigate,
}: {
  fullName: string;
  personalAvatar: string | null;
  personInitials: string;
  acronym: string;
  sector: Sector | null;
  rateUnit: string;
  rateYears: number[];
  currentYear: number;
  profile: ProfileForm | null;
  prices: PriceRow[];
  ownPriceCount: number;
  href: string;
  welcomeHint: string;
  planTier: CompanyPlanTier | null;
  onNavigate: (tab: Tab) => void;
}) {
  const { t } = useLang();
  const isLivestockCompany = sector === "livestock";
  const historyAllowed =
    isLivestockCompany ||
    planTier === "standard" ||
    planTier === "premium";
  const historyRows = rateYears.map((year) => ({
    year,
    value: profile?.yearlyRateHistory[String(year)] ?? "",
  }));
  const chartRows = rateYears
    .map((year) => {
      const t = profile?.tierRateHistory[String(year)];
      const low = Number(t?.low);
      const mid = Number(t?.mid);
      const high = Number(t?.high);
      const yearly = Number(profile?.yearlyRateHistory[String(year)]);
      const rate =
        Number.isFinite(low) && low > 0
          ? low
          : Number.isFinite(yearly) && yearly > 0
            ? yearly
            : 0;
      return {
        year,
        rate,
        ...(sector === "electricity" && low > 0 ? { low } : {}),
        ...(sector === "electricity" && mid > 0 ? { mid } : {}),
        ...(sector === "electricity" && high > 0 ? { high } : {}),
      };
    })
    .filter(
      (r) =>
        r.rate > 0 ||
        (r.low && r.low > 0) ||
        (r.mid && r.mid > 0) ||
        (r.high && r.high > 0)
    )
    .sort((a, b) => a.year - b.year);
  const rates = chartRows.map((r) => r.rate);
  const latestHistoryRate =
    chartRows.length > 0 ? chartRows[chartRows.length - 1]!.rate : 0;
  const currentYearRaw = Number(
    profile?.yearlyRateHistory[String(currentYear)] ?? profile?.currentPrice ?? 0
  );
  const currentRateNum =
    Number.isFinite(currentYearRaw) && currentYearRaw > 0
      ? currentYearRaw
      : latestHistoryRate;
  const currentRateDisplay =
    currentRateNum > 0 ? `$${currentRateNum.toFixed(2)}` : "—";
  const first = rates[0] ?? 0;
  const last = rates.length ? rates[rates.length - 1]! : currentRateNum;
  const deltaPct = first > 0 && rates.length >= 2 ? ((last - first) / first) * 100 : 0;
  const hasRateTrend = rates.length >= 2;
  const firstYear = chartRows[0]?.year;
  const lastYear = chartRows[chartRows.length - 1]?.year;
  // One row per save (professionals / service provider only)
  const entryCount = (() => {
    const buckets = new Set<string>();
    for (const p of prices) {
      const d = new Date(p.dateRecorded);
      if (Number.isNaN(d.getTime())) continue;
      buckets.add(
        `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${d.getUTCMinutes()}`
      );
    }
    if (buckets.size > 0) return buckets.size;
    return ownPriceCount > 0 ? ownPriceCount : 0;
  })();

  const livestockLinks = [
    {
      label: t("Page Hero", "Madaxa bogga"),
      value: t("Edit hero", "Wax ka beddel madaxa"),
      hint: t("Livestock hero text and logo", "Qoraalka iyo logo-ga madaxa xoolaha"),
      tone: "border-orange-200 from-orange-50",
      badge: "bg-orange-500",
      icon: PanelsTopLeft,
      tab: "hero" as Tab,
    },
    {
      label: t("Categories", "Qaybaha"),
      value: t("Categories", "Qaybaha"),
      hint: t("Home · Camels · Cattle · Sheep & goats", "Bogga hore · Geelka · Lo'da · Arriga"),
      tone: "border-emerald-200 from-emerald-50",
      badge: "bg-emerald-600",
      icon: LayoutGrid,
      tab: "categories" as Tab,
    },
    {
      label: t("Types", "Noocyada"),
      value: t("Types page", "Bogga noocyada"),
      hint: t("Livestock types headings", "Cinwaannada noocyada xoolaha"),
      tone: "border-teal-200 from-teal-50",
      badge: "bg-teal-600",
      icon: Layers,
      tab: "types" as Tab,
    },
    {
      label: t("Ref. Prices", "Qiimaha tixraaca"),
      value: "2016–2026",
      hint: t("First Class / Second Class reference prices", "Qiimaha tixraaca Birimo / Sugunto"),
      tone: "border-violet-200 from-violet-50",
      badge: "bg-violet-600",
      icon: Calculator,
      tab: "prices" as Tab,
    },
  ];

  const kpis = isLivestockCompany
    ? livestockLinks
    : (
        [
          {
            label: t("Current rate", "Qiimaha hadda"),
            value: currentRateDisplay,
            hint: `${rateUnit} · ${currentYear}`,
            tone: "border-emerald-200 from-emerald-50",
            badge: "bg-emerald-600",
            icon: Calculator,
            tab: "prices" as Tab,
          },
          {
            label: t("Price entries", "Gelitaanka qiimaha"),
            value: String(entryCount),
            hint: t("Price updates saved", "Cusboonaysiinta qiimaha ee la kaydiyay"),
            tone: "border-violet-200 from-violet-50",
            badge: "bg-violet-600",
            icon: BarChart3,
            tab: "prices" as Tab,
          },
          ...(historyAllowed
            ? [
                {
                  label: t("Rate Change", "Isbeddelka qiimaha"),
                  value: hasRateTrend
                    ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`
                    : "—",
                  hint: hasRateTrend
                    ? `$${first.toFixed(2)} → $${last.toFixed(2)} · ${firstYear}–${lastYear}`
                    : t("Save Price History", "Kaydi taariikhda qiimaha"),
                  tone: "border-teal-200 from-teal-50",
                  badge: "bg-teal-600",
                  icon: hasRateTrend && deltaPct < 0 ? TrendingDown : TrendingUp,
                  tab: "rates5y" as Tab,
                },
              ]
            : []),
          {
            label: t("Public page", "Bogga dadweynaha"),
            value: t("Open live", "Fur tooska"),
            hint: href,
            tone: "border-amber-200 from-amber-50",
            badge: "bg-amber-500",
            icon: ExternalLink,
            tab: null as Tab | null,
          },
        ] as Array<{
          label: string;
          value: string;
          hint: string;
          tone: string;
          badge: string;
          icon: typeof Calculator;
          tab: Tab | null;
        }>
      );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-4">
          <PersonAvatar
            src={personalAvatar}
            name={fullName}
            initials={personInitials}
            size="lg"
            badge="CA"
            priority
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-100/80">
              {t("Welcome back", "Ku soo dhawoow")}
            </p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              <span>{fullName}</span>
              <WaveHand />
            </h1>
            <p className="mt-1 max-w-xl text-[14px] font-medium text-emerald-50/90">
              {welcomeHint}
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-1 px-1 py-1">
        <div className="grid grid-cols-4 gap-2 min-[360px]:gap-3">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const className = cn(
              "group w-full rounded-2xl border bg-gradient-to-br via-white to-white p-4 text-left shadow-[var(--shadow)] transition-all duration-300 transform-gpu animate-fade-in-up hover:-translate-y-0.5 ",
              kpi.tone,
              (kpi.tab || href) && "cursor-pointer active:scale-[0.99]"
            );
            const body = (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {kpi.label}
                  </p>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110",
                      kpi.badge
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                </div>
                <p className="truncate text-[18px] font-black text-slate-900">
                  {kpi.value}
                </p>
                <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
                  {kpi.hint}
                </p>
              </>
            );

            if (kpi.tab) {
              return (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => onNavigate(kpi.tab!)}
                  className={className}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {body}
                </button>
              );
            }

            if (href) {
              return (
                <Link
                  key={kpi.label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {body}
                </Link>
              );
            }

            return (
              <div
                key={kpi.label}
                className={className}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {body}
              </div>
            );
          })}
        </div>
      </div>

      {isLivestockCompany ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: t("Livestock home", "Bogga xoolaha"), href: "/livestock", tab: "hero" as Tab },
            { label: t("Types page", "Bogga noocyada"), href: "/livestock/types", tab: "types" as Tab },
            {
              label: t("Reference guide", "Hagaha tixraaca"),
              href: "/livestock/reference",
              tab: "prices" as Tab,
            },
            { label: t("Camels", "Geelka"), href: "/livestock/geel", tab: "categories" as Tab },
            { label: t("Cattle", "Lo'da"), href: "/livestock/loda", tab: "categories" as Tab },
            { label: t("Sheep & goats", "Arriga"), href: "/livestock/arri", tab: "categories" as Tab },
            { label: t("System home", "Bogga hore"), href: "/", tab: "categories" as Tab },
          ].map((item) => (
            <div
              key={item.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {item.label}
                </p>
                <p className="truncate text-[12px] text-slate-500">{item.href}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  {t("Edit", "Wax ka beddel")}
                </button>
                <Link
                  href={item.href}
                  target="_blank"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : historyAllowed ? (
        <Card className="overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-4">
            <div>
              <h3 className="text-base font-black text-slate-900">{t("Price History", "Taariikhda qiimaha")}</h3>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {acronym} · {rateUnit}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("rates5y")}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 hover:underline"
            >
              {t("View", "Arag")} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 sm:p-5">
            {chartRows.length >= 1 ? (
              <CompanyAdminRateTrendChart
                rows={chartRows}
                rateUnit={rateUnit}
                height={280}
              />
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
                <Activity className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">
                  {t("No yearly rates yet", "Weli qiimo sanadle ah ma jiro")}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate("prices")}
                  className="text-[12px] font-bold text-emerald-700 hover:underline"
                >
                  {t("Update current price", "Cusbooneysii qiimaha hadda")} →
                </button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-4">
            <h3 className="text-base font-black text-slate-900">
              {t("Current rate", "Qiimaha hadda")}
            </h3>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {acronym} · {rateUnit} · {currentYear}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <p className="text-3xl font-black text-slate-900">{currentRateDisplay}</p>
            <p className="max-w-sm text-[13px] font-medium text-slate-500">
              {t(
                "Your free plan includes the Price Calculator and current price only. Upgrade for Price History.",
                "Qidmada bilaash ah waxay oggol tahay xisaabiyaha iyo qiimaha hadda oo keliya. Cusboonaysii si aad u hesho taariikhda."
              )}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("prices")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700"
            >
              {t("Update current price", "Cusbooneysii qiimaha hadda")} →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function PersonAvatar({
  src,
  name,
  initials,
  size = "sm",
  badge,
  priority = false,
}: {
  src: string | null;
  name: string;
  initials: string;
  size?: "sm" | "lg";
  badge?: "CA";
  priority?: boolean;
}) {
  const box =
    size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : "h-11 w-11 rounded-xl";
  const badgeBox = cn(
    "absolute z-20 flex items-center justify-center rounded-md bg-emerald-950 font-black leading-none text-white shadow-md",
    size === "lg"
      ? "bottom-1 right-1 h-5 min-w-5 px-1 text-[9px]"
      : "bottom-0.5 right-0.5 h-4 min-w-[1.05rem] px-0.5 text-[8px]"
  );
  const initialSize = size === "lg" ? "text-lg text-emerald-800" : "text-[11px]";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden bg-slate-100 text-emerald-800 shadow-sm",
        box,
        size === "lg" && "shadow-md"
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover object-center"
          style={{ objectPosition: companyAdminAvatarObjectPosition(src) }}
          sizes={size === "lg" ? "(max-width: 768px) 128px, 160px" : "88px"}
          quality={100}
          unoptimized
          priority={priority}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-black leading-none bg-emerald-700 text-white",
            initialSize
          )}
        >
          {initials}
        </span>
      )}
      {badge ? <span className={badgeBox}>{badge}</span> : null}
    </span>
  );
}

function CompanyRatesTrendPanel({
  sector,
  sectorLabel,
  rateUnit,
  historyRows,
  currentYear,
  profile,
}: {
  sector: Sector | null;
  sectorLabel: string;
  rateUnit: string;
  historyRows: { year: number; value: string; isCurrent: boolean }[];
  currentYear: number;
  profile: ProfileForm | null;
}) {
  const { t } = useLang();
  const chartRows = historyRows
    .map((r) => {
      const t = profile?.tierRateHistory[String(r.year)];
      const low = Number(t?.low);
      const mid = Number(t?.mid);
      const high = Number(t?.high);
      const yearly = Number(r.value);
      const rate =
        Number.isFinite(low) && low > 0
          ? low
          : Number.isFinite(yearly) && yearly > 0
            ? yearly
            : 0;
      return {
        year: r.year,
        rate,
        ...(sector === "electricity" && low > 0 ? { low } : {}),
        ...(sector === "electricity" && mid > 0 ? { mid } : {}),
        ...(sector === "electricity" && high > 0 ? { high } : {}),
      };
    })
    .filter(
      (r) =>
        r.rate > 0 ||
        (r.low && r.low > 0) ||
        (r.mid && r.mid > 0) ||
        (r.high && r.high > 0)
    );

  const rates = chartRows.map((r) => r.rate);
  const first = rates[0] ?? 0;
  const last = rates[rates.length - 1] ?? 0;
  const high = rates.length ? Math.max(...rates) : 0;
  const low = rates.length ? Math.min(...rates) : 0;
  const delta = last - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;
  const rising = delta >= 0;
  const TrendIcon = rising ? TrendingUp : TrendingDown;

  const fmt = (n: number) =>
    Number.isFinite(n) ? n.toFixed(n >= 10 ? 1 : 2) : "—";

  return (
    <Card className="overflow-hidden !p-0 shadow-lg shadow-slate-900/5 animate-fade-in-up">
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50/50 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md">
              <Activity className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t("Price History Trends", "Isbeddelka taariikhda qiimaha")}
              </h3>
              <p className="mt-0.5 text-[13px] font-medium text-slate-500">
                {sectorLabel} {t("chart", "shaxda")} · {rateUnit}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide",
              rising
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {rising ? "+" : ""}
            {fmt(delta)} ({rising ? "+" : ""}
            {deltaPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-3 sm:px-6">
        {[
          {
            label: t("Current", "Hadda"),
            value: fmt(last),
            sub: String(currentYear),
            tone: "from-emerald-500 to-teal-500",
            badge: "bg-emerald-600",
            icon: Calculator,
          },
          {
            label: t("Highest", "Ugu sarreeya"),
            value: fmt(high),
            sub: t("Peak rate", "Qiimaha ugu sarreeya"),
            tone: "from-violet-500 to-indigo-500",
            badge: "bg-violet-600",
            icon: TrendingUp,
          },
          {
            label: t("Lowest", "Ugu hooseeya"),
            value: fmt(low),
            sub: t("Floor rate", "Qiimaha ugu hooseeya"),
            tone: "from-amber-500 to-orange-500",
            badge: "bg-amber-500",
            icon: TrendingDown,
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
          <div
            key={stat.label}
            className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300 transform-gpu hover:-translate-y-0.5  animate-fade-in-up"
            style={{ animationDelay: `${120 + i * 80}ms` }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {stat.label}
              </p>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110",
                  stat.badge
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
            </div>
            <p className="text-xl font-black tabular-nums tracking-tight text-slate-900">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {stat.sub}
            </p>
          </div>
          );
        })}
      </div>

      <div className="relative px-3 py-4 sm:px-5 sm:py-5">
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-b from-white via-emerald-50/30 to-white p-3 ring-1 ring-emerald-100 sm:p-4">
          {chartRows.length >= 1 ? (
            <CompanyAdminRateTrendChart
              rows={chartRows}
              rateUnit={rateUnit}
              height={280}
            />
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
              <Activity className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">
                {t("Add yearly rates to see your trend chart", "Ku dar qiimaha sanadlaha si aad u aragto shaxda isbeddelka")}
              </p>
              <p className="text-[12px] font-medium text-slate-400">
                {t(
                  "Open Price History in the Dashboard menu and save values for each year.",
                  "Fur Taariikhda qiimaha ee liiska Sahanka, kadibna kaydi qiimaha sanad kasta."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CompanyReportsPanel({
  acronym,
  sector,
  sectorLabel,
  rateUnit,
  rateYears,
  currentYear,
  profile,
  prices,
  ownPriceCount,
  onOpenPrices,
}: {
  acronym: string;
  sector: Sector | null;
  sectorLabel: string;
  rateUnit: string;
  rateYears: number[];
  currentYear: number;
  profile: ProfileForm | null;
  prices: PriceRow[];
  ownPriceCount: number;
  onOpenPrices?: () => void;
}) {
  const { t } = useLang();
  const currentRate =
    profile?.yearlyRateHistory[String(currentYear)] ||
    profile?.currentPrice ||
    "";
  const historyRows = rateYears.map((year) => ({
    year,
    value: profile?.yearlyRateHistory[String(year)] ?? "",
    isCurrent: year === currentYear,
  }));
  const entryCount = (() => {
    const buckets = new Set<string>();
    for (const p of prices) {
      const d = new Date(p.dateRecorded);
      if (Number.isNaN(d.getTime())) continue;
      buckets.add(
        `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${d.getUTCMinutes()}`
      );
    }
    if (buckets.size > 0) return buckets.size;
    return ownPriceCount > 0 ? ownPriceCount : 0;
  })();
  const chartRates = historyRows
    .map((r) => Number(r.value))
    .filter((n) => Number.isFinite(n) && n > 0);
  const firstRate = chartRates[0] ?? 0;
  const lastRate =
    chartRates[chartRates.length - 1] ?? (Number(currentRate) || 0);
  const trendDelta =
    firstRate > 0 && chartRates.length >= 2
      ? ((lastRate - firstRate) / firstRate) * 100
      : 0;

  const stats = [
    {
      id: "entries",
      label: t("Price entries", "Gelitaanka qiimaha"),
      value: String(entryCount),
      hint: t("Price updates saved", "Cusboonaysiinta qiimaha ee la kaydiyay"),
      tone: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white",
      badge: "bg-violet-600 text-white",
      valueClass: "text-violet-950",
      icon: BarChart3,
      clickable: true as const,
    },
    {
      id: "current",
      label: t("Current rate", "Qiimaha hadda"),
      value: currentRate || "—",
      hint: `${rateUnit} · ${currentYear}`,
      tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white",
      badge: "bg-emerald-600 text-white",
      valueClass: "text-emerald-950",
      icon: Calculator,
      clickable: false as const,
    },
    {
      id: "trend",
      label: t("Rate Change", "Isbeddelka qiimaha"),
      value: `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}%`,
      hint: t("From first to current year", "Laga bilaabo sanadkii ugu horreeyay ilaa kan hadda"),
      tone: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white",
      badge: "bg-teal-600 text-white",
      valueClass: "text-teal-950",
      icon: trendDelta >= 0 ? TrendingUp : TrendingDown,
      clickable: false as const,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-5 py-0">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-md ring-1 ring-white/25 backdrop-blur">
              <FileBarChart2 className="h-7 w-7 text-emerald-100" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                {t("Reports", "Warbixinno")}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {t("Market reports", "Warbixinnada suuqa")}
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] font-medium text-emerald-50/90 sm:text-[14px]">
                {t("Live rates and trends for your dashboard.", "Qiimaha tooska ah iyo isbeddelka sahankaaga.")}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-lg sm:min-w-[9.5rem]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("Current", "Hadda")} {currentYear}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-900">
              {currentRate || "—"}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">{rateUnit}</p>
          </div>
        </div>
      </div>

      <div className="-mx-1 px-1 py-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const className = cn(
              "group w-full rounded-2xl border p-4 text-left shadow-[var(--shadow)] transition-all duration-300 transform-gpu animate-fade-in-up hover:-translate-y-0.5 ",
              stat.tone,
              stat.clickable && "cursor-pointer active:scale-[0.99]"
            );
            const body = (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {stat.label}
                  </p>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110",
                      stat.badge
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[15px] font-black leading-snug break-words",
                    stat.valueClass
                  )}
                >
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[12px] font-medium leading-snug text-slate-600 break-words">
                  {stat.hint}
                </p>
              </>
            );

            if (stat.clickable) {
              return (
                <button
                  key={stat.id}
                  type="button"
                  onClick={() => onOpenPrices?.()}
                  title={t("Open price entry — count updates after every save", "Fur gelinta qiimaha — tirada ayaa kordha kayd kasta")}
                  className={className}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  {body}
                </button>
              );
            }

            return (
              <div
                key={stat.id}
                className={className}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                {body}
              </div>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white px-5 py-4 sm:px-6">
          <h3 className="text-base font-black text-slate-900">
            {acronym} · {t("Price History", "Taariikhda qiimaha")}
          </h3>
          <p className="mt-0.5 text-[13px] font-medium text-slate-500">
            {sector === "electricity"
              ? t("Electricity · Usage tiers by year (USD / kWh)", "Korontada · Heerarka isticmaalka sanad kasta (USD / kWh)")
              : t("Water · Rates by year (USD / m³)", "Biyaha · Qiimaha sanad kasta (USD / m³)")}
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-5 sm:px-6">
          {historyRows.map((row) => (
            <div
              key={row.year}
              className={cn(
                "rounded-2xl border px-3 py-3 text-center",
                row.isCurrent
                  ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-slate-50/60"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {row.year}
                {row.isCurrent ? t(" · Current", " · Hadda") : ""}
              </p>
              <p className="mt-1.5 text-lg font-black tabular-nums text-slate-900">
                {row.value || "—"}
              </p>
            </div>
          ))}
        </div>
        {(sector === "water" || sector === "electricity") && (
          <p className="border-t border-slate-100 px-5 py-3 text-center text-[12px] font-medium text-slate-500 sm:px-6">
            {t(
              `${sectorLabel} report for ${acronym} only — other providers are not included.`,
              `Warbixinta ${sectorLabel} ee ${acronym} keliya — bixiyeyaasha kale kuma jiraan.`
            )}
          </p>
        )}
      </Card>

      <CompanyRatesTrendPanel
        sector={sector}
        sectorLabel={sectorLabel}
        rateUnit={rateUnit}
        historyRows={historyRows}
        currentYear={currentYear}
        profile={profile}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: typeof Phone;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}
