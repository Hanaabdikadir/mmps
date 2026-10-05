"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Users,
  Search,
  RefreshCw,
  User,
  UserRound,
  UserRoundX,
  UserCheck,
  Power,
  ChevronDown,
  RotateCcw,
  Building2,
  Store,
  Mail,
  Phone,
  Lock,
  Droplets,
  Zap,
  MapPin,
} from "lucide-react";
import { Modal } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { AuthPasswordField } from "@/components/auth/auth-ui";
import { RegisterCompanyInfoCard } from "@/components/auth/RegisterCompanyInfoCard";
import { RegisterUploadZone } from "@/components/auth/RegisterUploadZone";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import {
  companyAdminAvatarFor,
  companyAdminAvatarObjectPosition,
} from "@/lib/company-admin-avatars";
import { cn } from "@/lib/utils";
import { formatRoleBadge, isCompanyRole, isLivestockRole } from "@/lib/role-labels";
import type { BanadirDistrict } from "@/lib/banadir-districts";
import {
  companyTypeToSector,
  type CompanyRegistrationType,
} from "@/lib/company-registration";
import {
  brokerDisplayName,
  formatBrokerManagedAccounts,
  livestockSectionTitle,
  livestockSpeciesLabel,
  serializeLivestockTypeChoices,
  type LivestockMarketSection,
} from "@/lib/register-flow";
import {
  isFreePlanPrice,
  planColorName,
  planDurationChoiceLabel,
  planMonthlyRateLabel,
  subscriptionPlanMatches,
} from "@/lib/pricing-plans";
import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";
import { RegisterFormSelect } from "@/components/auth/RegisterFormSelect";
import { professionalLivestockMarketLabel } from "@/lib/livestock-registration-markets";
import type { PublicLivestockMarket } from "@/lib/livestock-registration-markets";
import {
  REGISTRATION_COMPANY_LOGO_FIELD,
} from "@/lib/registration-requirements";
import { marketInputClass } from "@/components/auth/auth-market-ui";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import {
  PHONE_MAX_DIGITS,
  REGISTER_PASSWORD_MIN_LENGTH,
  phoneDigitCount,
  registerErrorMessage,
  sanitizePhoneInput,
  validateEmailField,
  validatePhoneField,
} from "@/lib/register-validation";
import { LIVESTOCK_MANAGER_EMAIL } from "@/lib/livestock-manager-broker";

type UserRow = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  accountStatus: string;
  createdAt: string;
  companySlug?: string | null;
  companyName?: string | null;
  companySector?: string | null;
  companyType?: string | null;
  contactRole?: string | null;
  companyLocation?: string | null;
  companyAddress?: string | null;
  market?: { id: number; name: string; location?: string | null } | null;
  assignedMarketNames?: string[];
  personalPhotoFile?: string | null;
  registrationDocuments?: Record<string, string> | null;
  company: { id: number; name: string } | null;
  broker: {
    id: number;
    name: string;
    livestockFocus?: string | null;
    categories?: { slug: string; name: string; nameSomali?: string | null }[];
  } | null;
  deletedAt?: string | null;
};

type AccountKind = "company" | "broker";

const EMPTY_USER_FORM = {
  kind: "company" as AccountKind,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  companyType: "",
  companyDistrict: "",
  companyAddress: "",
  companyEmail: "",
  livestockSections: [] as string[],
  livestockMarketId: "",
  planId: "",
};

type AccountFilter = "ALL" | "ACTIVE" | "SUSPENDED" | "DELETED";

const filterSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

const TABLE_TEXT =
  "inline-flex max-w-full min-w-0 items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide";

function roleTextClass(role: string) {
  if (isLivestockRole(role)) {
    return "text-teal-700";
  }
  if (isCompanyRole(role)) {
    return "text-indigo-700";
  }
  return "text-slate-600";
}

function roleLabel(role: string) {
  return formatRoleBadge(role);
}

function accountTextClass(u: UserRow, catalogCount?: number) {
  const managed = formatBrokerManagedAccounts({
    rawTypes: u.companyType || u.broker?.livestockFocus,
    assigned: u.broker?.categories,
    catalogCount,
  });
  if (managed === "ALL") return "text-teal-800";
  if (managed?.includes("·")) return "text-teal-800";
  const livestock = livestockAccountLabel(u);
  if (livestock === "Camel") return "text-amber-700";
  if (livestock === "Cattle") return "text-orange-700";
  if (livestock === "Goat") return "text-emerald-700";
  const sector = userSector(u);
  if (sector === "Water") return "text-sky-700";
  if (sector === "Electricity") return "text-amber-600";
  return "text-slate-700";
}

function marketTextClass(label: string) {
  const n = label.toLowerCase();
  if (n.includes("dayax")) return "text-emerald-700";
  if (n.includes("sinka")) return "text-teal-700";
  if (n.includes("deniile") || n.includes("dayniile")) return "text-green-700";
  if (n.includes("xoolaha")) return "text-lime-700";
  if (n.includes("medina") || n.includes("madiino")) return "text-cyan-700";
  return "text-emerald-700";
}

const ACCOUNT_ACRONYM_ALIASES: { test: RegExp; acronym: string }[] = [
  { test: /bawadco|banadir water/i, acronym: "BAWADCO" },
  { test: /towfiiq|tawfiiq|hawdco|hamar water|horad water/i, acronym: "TOWFIIQ" },
  { test: /wabax/i, acronym: "WABAX" },
  { test: /\bbeco\b/i, acronym: "BECO" },
  { test: /\bmps\b|mogadishu power/i, acronym: "MPS" },
  { test: /\bbse\b|blue sky/i, acronym: "BSE" },
];

function livestockAccountLabel(u: UserRow): "Camel" | "Cattle" | "Goat" | null {
  const managed = formatBrokerManagedAccounts({
    rawTypes: u.companyType || u.broker?.livestockFocus,
    assigned: u.broker?.categories,
  });
  if (managed && managed.includes("·")) return null;
  if (managed === "ALL") return null;
  return livestockSpeciesLabel(
    u.companyType,
    u.contactRole,
    u.broker?.livestockFocus,
    u.broker?.name,
    u.companyName
  );
}

function displayAccountName(u: UserRow, catalogCount?: number): string {
  const livestock = formatBrokerManagedAccounts({
    rawTypes: u.companyType || u.broker?.livestockFocus,
    assigned: u.broker?.categories,
    catalogCount,
  });
  if (livestock) return livestock;

  const single = livestockSectionTitle(livestockAccountLabel(u));
  if (single) return single;

  const raw = (u.company?.name || u.broker?.name || u.companyName || "").trim();
  if (!raw) return "—";
  const hay = `${raw} ${u.companySlug || ""}`.trim();

  const providers = [
    ...MOGADISHU_WATER_PROVIDERS,
    ...MOGADISHU_ELECTRICITY_PROVIDERS,
  ];
  const hit = providers.find((p) => {
    const keys = [p.name, p.acronym, p.slug].filter((k): k is string => Boolean(k)).map((k) => k.toLowerCase());
    const n = hay.toLowerCase();
    return keys.some((k) => n === k || n.includes(k) || k.includes(n));
  });
  if (hit?.acronym) return hit.acronym;

  const alias = ACCOUNT_ACRONYM_ALIASES.find((row) => row.test.test(hay));
  if (alias) return alias.acronym;

  return raw;
}

type DisplaySector = "Water" | "Livestock" | "Electricity";

function userSector(u: UserRow): DisplaySector | null {
  if (u.role === "SUPER_ADMIN") return null;

  const fromType = companyTypeToSector(u.companyType || "");
  if (fromType === "water") return "Water";
  if (fromType === "electricity") return "Electricity";
  if (fromType === "livestock") return "Livestock";

  if (
    u.broker ||
    u.role.includes("LIVESTOCK") ||
    (u.companySector || "").toLowerCase().includes("livestock")
  ) {
    return "Livestock";
  }

  const sector = (u.companySector || "").toLowerCase();
  if (sector.includes("water")) return "Water";
  if (sector.includes("electric")) return "Electricity";

  const hay = [
    u.company?.name,
    u.companyName,
    u.companySlug,
    u.companyType,
  ]
    .filter((k): k is string => Boolean(k))
    .join(" ")
    .toLowerCase();

  if (
    hay.includes("livestock") ||
    hay.includes("camel") ||
    hay.includes("cattle") ||
    hay.includes("goat") ||
    hay.includes("sheep") ||
    hay.includes("xoolaha")
  ) {
    return "Livestock";
  }
  if (
    hay.includes("electric") ||
    hay.includes("power") ||
    hay.includes("energy") ||
    hay.includes("beco")
  ) {
    return "Electricity";
  }
  if (hay.includes("water") || hay.includes("biyo")) return "Water";

  return null;
}

function livestockMarketLabel(u: UserRow): string | null {
  const candidates = [
    u.market?.name,
    ...(u.assignedMarketNames ?? []),
    u.companyLocation,
    u.companyAddress,
    u.market?.location,
  ];
  for (const value of candidates) {
    const label = professionalLivestockMarketLabel(value);
    if (label) return label;
  }
  return null;
}

function sectorLabel(sector: DisplaySector) {
  if (sector === "Water") return "Water Supply";
  if (sector === "Electricity") return "Electricity";
  return "Livestock";
}

function SectorChip({ user }: { user: UserRow }) {
  const sector = userSector(user);
  if (!sector) {
    return <span className={cn(TABLE_TEXT, "text-slate-400")}>—</span>;
  }

  if (sector === "Livestock") {
    const market = livestockMarketLabel(user);
    const label = market ?? "Unassigned market";
    return (
      <span className={cn(TABLE_TEXT, market ? marketTextClass(label) : "text-slate-400")}>
        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.25} />
        <span className="min-w-0 truncate">{label}</span>
      </span>
    );
  }

  const tone = sector === "Water" ? "text-sky-700" : "text-amber-600";
  const Icon = sector === "Water" ? Droplets : Zap;
  return (
    <span className={cn(TABLE_TEXT, tone)}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0 truncate">{sectorLabel(sector)}</span>
    </span>
  );
}

function AccountChip({
  status,
  deleted,
}: {
  status: string;
  deleted?: boolean;
}) {
  if (deleted) {
    return <span className={cn(TABLE_TEXT, "text-violet-600")}>Deleted</span>;
  }
  const active = status === "ACTIVE";
  return (
    <span className={cn(TABLE_TEXT, active ? "text-emerald-600" : "text-rose-600")}>
      {active ? "Active" : "Suspended"}
    </span>
  );
}

const LIVESTOCK_SPECIES_PHOTO: Record<"Camel" | "Cattle" | "Goat", string> = {
  Camel: "/images/livestock/camel.jpg",
  Cattle: "/images/livestock/loda-cattle.jpg",
  Goat: "/images/livestock/goat.jpg",
};

const NEW_USER_LIVESTOCK_TYPES = [
  {
    section: "Camel Market Section",
    label: "Camel",
    photo: LIVESTOCK_SPECIES_PHOTO.Camel,
    selected: "border-amber-400 bg-amber-50 ring-1 ring-amber-200",
    idle: "border-amber-200 bg-white hover:border-amber-500 hover:bg-amber-50",
    labelClass: "text-amber-800",
  },
  {
    section: "Cattle Market Section",
    label: "Cattle",
    photo: LIVESTOCK_SPECIES_PHOTO.Cattle,
    selected: "border-teal-400 bg-teal-50 ring-1 ring-teal-200",
    idle: "border-teal-200 bg-white hover:border-teal-500 hover:bg-teal-50",
    labelClass: "text-teal-800",
  },
  {
    section: "Goat Market Section",
    label: "Goat",
    photo: LIVESTOCK_SPECIES_PHOTO.Goat,
    selected: "border-violet-400 bg-violet-50 ring-1 ring-violet-200",
    idle: "border-violet-200 bg-white hover:border-violet-500 hover:bg-violet-50",
    labelClass: "text-violet-800",
  },
] as const;

function CreateFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900/75">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const createInputErrorClass =
  "border-red-300 focus:border-red-500 focus:ring-red-200 hover:border-red-300 hover:bg-red-50/20";

function CreateFormField({
  id,
  label,
  icon: Icon,
  iconClassName = "text-emerald-600",
  error,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  iconClassName?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2",
            iconClassName
          )}
        />
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UserAvatar({ user }: { user: UserRow }) {
  const species = livestockAccountLabel(user);
  const photo =
    companyAdminAvatarFor(user) ||
    (species ? LIVESTOCK_SPECIES_PHOTO[species] : null);
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (photo) {
    return (
      <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
        <Image
          src={photo}
          alt={user.fullName}
          width={80}
          height={80}
          quality={100}
          unoptimized
          className="h-full w-full object-cover"
          style={{ objectPosition: companyAdminAvatarObjectPosition(photo) }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-black text-white shadow-sm">
      {initials || "U"}
    </span>
  );
}

export function UsersManager() {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const { confirm, dialog } = useConfirmDialog();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [livestockCategoryCount, setLivestockCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [livestockMarkets, setLivestockMarkets] = useState<PublicLivestockMarket[]>(
    []
  );
  const [plans, setPlans] = useState<
    { id: number; name: string; price: string; accountType: string; durationDays: number }[]
  >([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoPreviewUrl = useFileObjectUrl(logoFile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("ALL");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useActionMessage(2000);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/users${query ? `?q=${encodeURIComponent(query)}` : ""}`
      );
      const data = await res.json();
      setUsers(
        (data.users || []).filter(
          (u: UserRow) =>
            String(u.email || "").toLowerCase() !== LIVESTOCK_MANAGER_EMAIL
        )
      );
      setLivestockCategoryCount(Number(data.livestockCategoryCount) || 0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(true);
    }, 8000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    function normalizeMarkets(raw: unknown): PublicLivestockMarket[] {
      if (!Array.isArray(raw)) return [];
      const seen = new Set<number>();
      const out: PublicLivestockMarket[] = [];
      for (const row of raw) {
        const item = row as { id?: unknown; name?: unknown; location?: unknown };
        const id = Number(item.id);
        const name = typeof item.name === "string" ? item.name.trim() : "";
        if (!Number.isFinite(id) || id <= 0 || !name || seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          name,
          location: typeof item.location === "string" ? item.location : null,
        });
      }
      return out;
    }

    async function loadMarkets() {
      try {
        const publicRes = await fetch("/api/markets/public", { cache: "no-store" });
        const publicJson = await publicRes.json().catch(() => ({}));
        let list = normalizeMarkets(
          (publicJson as { markets?: unknown }).markets
        );

        if (list.length === 0) {
          const adminRes = await fetch("/api/livestock/markets", {
            cache: "no-store",
          });
          const adminJson = await adminRes.json().catch(() => ({}));
          list = normalizeMarkets((adminJson as { markets?: unknown }).markets);
        }

        if (!cancelled) setLivestockMarkets(list);
      } catch {
        if (!cancelled) setLivestockMarkets([]);
      }
    }

    void loadMarkets();
    void fetch("/api/subscriptions?view=plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { plans?: { id: number; name: string; price: string; accountType: string; durationDays: number; active?: boolean }[] }) => {
        if (cancelled) return;
        setPlans(
          (data.plans || []).filter((plan) => plan.active !== false)
        );
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const livestockMarketOptions = useMemo(
    () =>
      livestockMarkets.map((market, index) => {
        const accents = [
          { icon: "text-emerald-600", row: "bg-emerald-50 text-emerald-800" },
          { icon: "text-amber-600", row: "bg-amber-50 text-amber-800" },
          { icon: "text-teal-600", row: "bg-teal-50 text-teal-800" },
          { icon: "text-orange-600", row: "bg-orange-50 text-orange-800" },
          { icon: "text-green-600", row: "bg-green-50 text-green-800" },
        ][index % 5];
        return {
          value: String(market.id),
          label: market.name,
          icon: MapPin,
          iconClassName: accents.icon,
          rowClassName: accents.row,
        };
      }),
    [livestockMarkets]
  );

  const stats = useMemo(() => {
    const live = users.filter((u) => !u.deletedAt && u.status === "APPROVED");
    const isOff = (s: string) => s === "SUSPENDED" || s === "INACTIVE";
    return {
      total: live.length,
      active: live.filter((u) => u.accountStatus === "ACTIVE").length,
      suspended: live.filter((u) => isOff(u.accountStatus)).length,
      deleted: users.filter((u) => Boolean(u.deletedAt)).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (accountFilter === "DELETED") return Boolean(u.deletedAt);
      if (u.deletedAt) return false;
      if (u.status !== "APPROVED") return false;
      if (accountFilter === "ACTIVE") return u.accountStatus === "ACTIVE";
      if (accountFilter === "SUSPENDED") {
        return (
          u.accountStatus === "SUSPENDED" || u.accountStatus === "INACTIVE"
        );
      }
      return true;
    });
  }, [users, accountFilter]);

  function resetCreateForm() {
    setForm(EMPTY_USER_FORM);
    setLogoFile(null);
    setError("");
    setPhoneError("");
    setEmailError("");
  }

  async function create() {
    setSaving(true);
    setError("");
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required");
      setSaving(false);
      return;
    }
    const emailErr = validateEmailField(form.email);
    if (emailErr) {
      const message = registerErrorMessage(emailErr, lang);
      setEmailError(message);
      setError(message);
      setSaving(false);
      return;
    }
    setEmailError("");
    const phoneErr = validatePhoneField(form.phone);
    if (phoneErr) {
      setPhoneError(registerErrorMessage(phoneErr, lang));
      setSaving(false);
      return;
    }
    setPhoneError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      setSaving(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setSaving(false);
      return;
    }
    const livestockSection = serializeLivestockTypeChoices(form.livestockSections);
    const companyName =
      form.kind === "broker"
        ? brokerDisplayName(fullName, livestockSection as LivestockMarketSection)
        : form.companyName.trim();
    if (form.kind === "company" && !companyName) {
      setError("Company name is required");
      setSaving(false);
      return;
    }
    if (form.kind === "company" && !form.companyType) {
      setError("Select Water Supply or Electricity.");
      setSaving(false);
      return;
    }
    if (form.kind === "broker" && form.livestockSections.length === 0) {
      setError("Select one, two, or three livestock categories.");
      setSaving(false);
      return;
    }
    if (!form.planId) {
      setError("Select a subscription plan.");
      setSaving(false);
      return;
    }
    if (form.kind === "broker" && !form.livestockMarketId) {
      setError("Please select a livestock market.");
      setSaving(false);
      return;
    }
    if (form.kind === "company" && !form.companyDistrict) {
      setError("Select a Banadir district");
      setSaving(false);
      return;
    }
    if (
      form.kind === "company" &&
      (!form.companyAddress.trim() || form.companyAddress.trim().length < 5)
    ) {
      setError("Company address must be at least 5 characters");
      setSaving(false);
      return;
    }
    if (!logoFile && form.kind !== "broker") {
      setError("Please upload a company logo.");
      setSaving(false);
      return;
    }
    try {
      const payload = new FormData();
      payload.append("fullName", fullName);
      payload.append("email", form.email.trim());
      payload.append("phone", form.phone.trim());
      payload.append("password", form.password);
      payload.append("confirmPassword", form.confirmPassword);
      payload.append("role", form.kind === "broker" ? "LIVESTOCK_BROKER_USER" : "COMPANY_ADMIN");
      payload.append("companyName", companyName);
      payload.append("companyType", form.companyType);
      payload.append(
        "companyDistrict",
        form.kind === "broker" ? form.companyDistrict || "" : form.companyDistrict
      );
      payload.append("companyAddress", form.companyAddress.trim());
      payload.append("companyEmail", (form.companyEmail || form.email).trim());
      payload.append("livestockSection", livestockSection);
      payload.append("planId", form.planId);
      if (form.livestockMarketId) {
        payload.append("marketId", form.livestockMarketId);
      }
      if (logoFile) {
        payload.append(REGISTRATION_COMPANY_LOGO_FIELD, logoFile);
      }

      const res = await fetch("/api/users", {
        method: "POST",
        body: payload,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to create user");
        return;
      }
      setOpen(false);
      resetCreateForm();
      setActionMessage({
        type: "ok",
        text: `${fullName} was created and can sign in with this email and password.`,
      });
      await load();
    } catch {
      setError("Could not save user to the database");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: UserRow) {
    const next = u.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const ok = await confirm(
      next === "SUSPENDED"
        ? {
            title: "Suspend account?",
            description: `${u.fullName} (${u.email}) will not be able to sign in until activated again. Company and broker public visibility are unchanged — use Companies or Brokers to hide those.`,
            confirmLabel: "Suspend",
            tone: "warning",
          }
        : {
            title: "Activate account?",
            description: `${u.fullName} (${u.email}) will be able to sign in again.`,
            confirmLabel: "Activate",
            tone: "primary",
          }
    );
    if (!ok) return;
    setActionBusyId(u.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, accountStatus: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || `Could not ${next === "SUSPENDED" ? "suspend" : "activate"} user.`,
        });
        return;
      }
      setActionMessage({
        type: "ok",
        text:
          next === "SUSPENDED"
            ? `${u.fullName} suspended.`
            : `${u.fullName} activated.`,
      });
      await load(true);
    } finally {
      setActionBusyId(null);
    }
  }

  async function activateCompany(u: UserRow) {
    const ok = await confirm({
      title: "Activate company access?",
      description: `This creates a company profile for ${u.fullName} and adds them to Companies.`,
      confirmLabel: "Activate company",
      tone: "primary",
    });
    if (!ok) return;
    setActionBusyId(u.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, activateCompany: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Could not activate company access.",
        });
        return;
      }
      setActionMessage({
        type: "ok",
        text: `${u.fullName} is now a company admin and appears on Companies.`,
      });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function restore(u: UserRow) {
    const ok = await confirm({
      title: "Restore user?",
      description: `${u.fullName} (${u.email}) will be moved back to Active users and can sign in again.`,
      confirmLabel: "Restore",
      tone: "primary",
    });
    if (!ok) return;
    setActionBusyId(u.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, restore: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Could not restore user.",
        });
        return;
      }
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id
            ? { ...row, deletedAt: null, accountStatus: "ACTIVE" }
            : row
        )
      );
      setActionMessage({
        type: "ok",
        text: `${u.fullName} restored.`,
      });
    } finally {
      setActionBusyId(null);
    }
  }

  async function remove(u: UserRow) {
    const ok = await confirm({
      title: "Delete user?",
      description: `${u.fullName} (${u.email}) will be moved to Deleted users and will not be able to sign in.`,
      confirmLabel: "Delete user",
      tone: "danger",
    });
    if (!ok) return;
    setActionBusyId(u.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/users?id=${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "Could not delete user from the database.",
        });
        return;
      }
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id
            ? {
                ...row,
                deletedAt: new Date().toISOString(),
                accountStatus: "INACTIVE",
              }
            : row
        )
      );
      setActionMessage({
        type: "ok",
        text: `${u.fullName} moved to Deleted users.`,
      });
    } finally {
      setActionBusyId(null);
    }
  }

  function applySearch() {
    setQuery(searchDraft.trim());
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      {/* Header — same as Pending Approvals */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
            <Users className="h-6 w-6 text-white" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Users
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Create and manage MMPS user accounts, roles, and access.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setOpen(true);
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New User
        </button>
      </div>

      {/* KPI row */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <KpiCard
          label="Total"
          value={stats.total}
          hint="All users"
          icon={Users}
          tone="indigo"
          onClick={() => setAccountFilter("ALL")}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          hint="Accounts on"
          icon={Power}
          tone="emerald"
          onClick={() => setAccountFilter("ACTIVE")}
        />
        <KpiCard
          label="Suspended"
          value={stats.suspended}
          hint="Accounts off"
          icon={UserRoundX}
          tone="rose"
          onClick={() => setAccountFilter("SUSPENDED")}
        />
        <KpiCard
          label="Deleted"
          value={stats.deleted}
          hint="Removed accounts"
          icon={Trash2}
          tone="violet"
          onClick={() => setAccountFilter("DELETED")}
        />
      </div>

      {/* Search + filters */}
      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search name or email…"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          <div className="relative w-full sm:w-[10rem]">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value as AccountFilter)}
              className={filterSelectClass}
              aria-label="Filter by account status"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Deleted</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2.25}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              setQuery("");
              setAccountFilter("ALL");
              void load();
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">
              {accountFilter === "DELETED" ? "Deleted users" : "System users"}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {filtered.length} {filtered.length === 1 ? "user" : "users"} shown
            </p>
          </div>
          {actionMessage ? (
            <p
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                actionMessage.type === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {actionMessage.text}
            </p>
          ) : null}
        </div>

        <div className="w-full">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-100 px-3 py-2.5">User</th>
                <th className="border-b border-slate-100 px-2 py-2.5">Role</th>
                <th className="border-b border-slate-100 px-2 py-2.5">Account</th>
                <th className="border-b border-slate-100 px-2 py-2.5">Sector</th>
                <th className="border-b border-slate-100 px-2 py-2.5 text-center">
                  Status
                </th>
                <th className="border-b border-slate-100 px-2 py-2.5 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm font-semibold text-slate-400"
                  >
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm font-semibold text-slate-400"
                  >
                    {accountFilter === "DELETED"
                      ? "No deleted users."
                      : "No users match the current filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="min-w-0 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {u.fullName}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="min-w-0 px-2 py-2.5">
                      <span className={cn(TABLE_TEXT, roleTextClass(u.role))}>
                        <UserRound className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                        <span className="min-w-0 truncate">{roleLabel(u.role)}</span>
                      </span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5">
                      <span className={cn(TABLE_TEXT, "justify-start", accountTextClass(u, livestockCategoryCount))}>
                        <span className="min-w-0 whitespace-normal break-words">
                          {displayAccountName(u, livestockCategoryCount)}
                        </span>
                      </span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5">
                      <SectorChip user={u} />
                    </td>
                    <td className="min-w-0 px-2 py-2.5 text-center">
                      <AccountChip
                        status={u.accountStatus}
                        deleted={Boolean(u.deletedAt)}
                      />
                    </td>
                    <td className="px-1.5 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {u.deletedAt ? (
                          <button
                            type="button"
                            disabled={actionBusyId === u.id}
                            onClick={() => void restore(u)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Restore user"
                            aria-label="Restore user"
                          >
                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        ) : (
                          <>
                        {u.role === "REGISTERED" && u.status === "APPROVED" ? (
                          <button
                            type="button"
                            disabled={actionBusyId === u.id}
                            onClick={() => void activateCompany(u)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Activate company access"
                            aria-label="Activate company access"
                          >
                            <Building2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={actionBusyId === u.id}
                          onClick={() => void toggleStatus(u)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            u.accountStatus === "ACTIVE"
                              ? "Suspend account"
                              : "Activate account"
                          }
                          aria-label={
                            u.accountStatus === "ACTIVE"
                              ? "Suspend account"
                              : "Activate account"
                          }
                        >
                          {u.accountStatus === "ACTIVE" ? (
                            <UserRoundX className="h-3.5 w-3.5" strokeWidth={2.25} />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusyId === u.id}
                          onClick={() => void remove(u)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete user"
                          aria-label="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New User"
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label="Create user"
              saving={saving}
              savingLabel="Creating…"
              onClick={create}
              className="!min-w-[9.5rem]"
            />
          </>
        }
      >
        <div className="space-y-5 pb-10">
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Register as
            </p>
            <div className="grid grid-cols-2 items-stretch gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    kind: "company",
                    livestockSections: [],
                    livestockMarketId: "",
                    planId: "",
                  })
                }
                className={cn(
                  "flex h-full min-h-[5.5rem] items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition",
                  form.kind === "company"
                    ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Building2 className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span>
                  <span className="block text-[13px] font-black text-slate-900">
                    Company
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500">
                    Water or electricity
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    kind: "broker",
                    companyType: "",
                    companyDistrict: "",
                    livestockMarketId: form.livestockMarketId,
                  })
                }
                className={cn(
                  "flex h-full min-h-[5.5rem] items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition",
                  form.kind === "broker"
                    ? "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
                    : "border-sky-200 bg-white hover:border-sky-500 hover:bg-sky-50"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                  <Store className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span>
                  <span className="block text-[13px] font-black text-slate-900">
                    Livestock broker
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500">
                    Market broker account
                  </span>
                </span>
              </button>
            </div>
          </div>

          {form.kind === "company" ? (
            <div className="grid grid-cols-2 items-stretch gap-2.5">
              {(
                [
                  {
                    id: "Water Supply Company",
                    title: "Water Supply",
                    icon: Droplets,
                    selected: "border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200",
                    idle: "border-cyan-200 bg-white hover:border-cyan-500 hover:bg-cyan-50",
                    iconWrap: "bg-cyan-600 text-white",
                    iconIdle: "bg-cyan-100 text-cyan-700",
                  },
                  {
                    id: "Electricity Supply Company",
                    title: "Electricity Supply",
                    icon: Zap,
                    selected: "border-orange-400 bg-orange-50 ring-1 ring-orange-200",
                    idle: "border-orange-200 bg-white hover:border-orange-500 hover:bg-orange-50",
                    iconWrap: "bg-orange-500 text-white",
                    iconIdle: "bg-orange-100 text-orange-600",
                  },
                ] as const
              ).map((item) => {
                const selected = form.companyType === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setForm({ ...form, companyType: item.id })}
                    className={cn(
                      "flex h-full min-h-[5.5rem] items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition",
                      selected ? item.selected : item.idle
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        selected ? item.iconWrap : item.iconIdle
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[13px] font-black text-slate-900">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 items-stretch gap-2">
              {NEW_USER_LIVESTOCK_TYPES.map((item) => {
                const selected = form.livestockSections.includes(item.section);
                return (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        livestockSections: selected
                          ? form.livestockSections.filter((section) => section !== item.section)
                          : form.livestockSections.length >= 3
                            ? form.livestockSections
                            : [...form.livestockSections, item.section],
                      })
                    }
                    className={cn(
                      "flex h-full min-h-[7rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center transition",
                      selected ? item.selected : item.idle
                    )}
                  >
                    <span className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                      <Image
                        src={item.photo}
                        alt={item.label}
                        width={96}
                        height={96}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-black uppercase tracking-wide",
                        item.labelClass
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <CreateFormSection title="Subscription plan">
            <select
              className={filterSelectClass}
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              <option value="">Select a plan</option>
              {plans
                .filter((plan) =>
                  subscriptionPlanMatches(
                    plan.accountType,
                    form.kind === "broker"
                      ? "livestock"
                      : form.companyType.toLowerCase().includes("water")
                        ? "water"
                        : "electricity",
                    form.kind === "broker" ? "broker" : "company",
                    plan.durationDays
                  )
                )
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {planColorName(plan.price, plan.durationDays, "en")} ·{" "}
                    {isFreePlanPrice(plan.price)
                      ? "Free"
                      : planMonthlyRateLabel(Number(plan.price), plan.durationDays, "en")}{" "}
                    ·{" "}
                    {planDurationChoiceLabel(
                      plan.durationDays,
                      "en",
                      isFreePlanPrice(plan.price)
                    )}
                  </option>
                ))}
            </select>
          </CreateFormSection>

          <CreateFormSection title={copy.personalInfo[lang]}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CreateFormField
                id="new-user-first-name"
                label={copy.firstName[lang]}
                icon={User}
                iconClassName="text-emerald-600"
              >
                <input
                  id="new-user-first-name"
                  autoComplete="given-name"
                  placeholder={copy.firstName[lang]}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={marketInputClass}
                />
              </CreateFormField>
              <CreateFormField
                id="new-user-last-name"
                label={copy.lastName[lang]}
                icon={User}
                iconClassName="text-teal-600"
              >
                <input
                  id="new-user-last-name"
                  autoComplete="family-name"
                  placeholder={copy.lastName[lang]}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={marketInputClass}
                />
              </CreateFormField>
            </div>
            <CreateFormField
              id="new-user-email"
              label={copy.email[lang]}
              icon={Mail}
              iconClassName="text-emerald-600"
              error={emailError}
            >
              <input
                id="new-user-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@gmail.com"
                value={form.email}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm({ ...form, email: next });
                  const code = next.trim() ? validateEmailField(next) : null;
                  setEmailError(code ? registerErrorMessage(code, lang) : "");
                }}
                className={cn(marketInputClass, emailError && createInputErrorClass)}
              />
            </CreateFormField>
            <CreateFormField
              id="new-user-phone"
              label={copy.phone[lang]}
              icon={Phone}
              iconClassName="text-emerald-600"
              error={phoneError}
            >
              <input
                id="new-user-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={copy.phonePlaceholder[lang]}
                value={form.phone}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm({ ...form, phone: sanitizePhoneInput(raw) });
                  setPhoneError(
                    phoneDigitCount(raw) > PHONE_MAX_DIGITS
                      ? registerErrorMessage("phoneTooLong", lang)
                      : ""
                  );
                }}
                className={cn(marketInputClass, phoneError && createInputErrorClass)}
              />
            </CreateFormField>
            <AuthPasswordField
              id="new-user-password"
              label={copy.password[lang]}
              icon={Lock}
              iconClassName="text-amber-600"
              toggleClassName="text-amber-600 hover:text-amber-800"
              placeholder={copy.enterPassword[lang]}
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              minLength={REGISTER_PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              inputClassName={marketInputClass}
            />
            <AuthPasswordField
              id="new-user-confirm-password"
              label={copy.confirmPassword[lang]}
              icon={Lock}
              iconClassName="text-amber-600"
              toggleClassName="text-amber-600 hover:text-amber-800"
              placeholder={copy.retypePassword[lang]}
              value={form.confirmPassword}
              onChange={(v) => setForm({ ...form, confirmPassword: v })}
              minLength={REGISTER_PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              disablePaste
              inputClassName={marketInputClass}
            />
          </CreateFormSection>

          <CreateFormSection
            title={
              form.kind === "company" ? copy.companyLogo[lang] : copy.profilePhoto[lang]
            }
          >
            <RegisterUploadZone
              zoneId="new-user-photo"
              label={
                form.kind === "company"
                  ? copy.uploadCompanyLogo[lang]
                  : copy.uploadPhoto[lang]
              }
              description={
                form.kind === "company"
                  ? copy.uploadCompanyLogoHint[lang]
                  : copy.profilePhotoOptionalHint[lang]
              }
              hint={copy.fileHintImage[lang]}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              file={logoFile}
              previewUrl={logoPreviewUrl}
              onChange={setLogoFile}
              required={form.kind !== "broker"}
              imageOnly
              accent="teal"
            />
          </CreateFormSection>

          {form.kind === "company" ? (
            <CreateFormSection title={copy.companyInfo[lang]}>
              <RegisterCompanyInfoCard
                values={{
                  companyName: form.companyName,
                  companyType: (form.companyType as CompanyRegistrationType | "") || "",
                  companyDistrict: (form.companyDistrict as BanadirDistrict | "") || "",
                  companyEmail: form.companyEmail,
                  companyAddress: form.companyAddress,
                }}
                onChange={(key, value) =>
                  setForm({
                    ...form,
                    [key]: value,
                  } as typeof form)
                }
                hideCompanyType
              />
            </CreateFormSection>
          ) : (
            <CreateFormField
              id="new-user-livestock-market"
              label={copy.livestockMarket[lang]}
              icon={MapPin}
              iconClassName="text-teal-600"
            >
              <RegisterFormSelect
                id="new-user-livestock-market"
                theme="livestock"
                showValueIconInTrigger={false}
                value={form.livestockMarketId}
                placeholder={copy.selectLivestockMarket[lang]}
                panelTitle={copy.selectLivestockMarket[lang]}
                options={livestockMarketOptions}
                onChange={(value) => {
                  const market = livestockMarkets.find((m) => String(m.id) === value);
                  setForm({
                    ...form,
                    livestockMarketId: value,
                    companyAddress: market?.name || form.companyAddress,
                    companyDistrict: form.companyDistrict,
                  });
                }}
              />
            </CreateFormField>
          )}
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
