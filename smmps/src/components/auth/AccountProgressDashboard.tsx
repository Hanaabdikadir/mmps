"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileImage,
  FileText,
  FolderOpen,
  IdCard,
  LogOut,
  Menu,
  MessageSquare,
  Minus,
  RefreshCw,
  Send,
  ShieldAlert,
  Upload,
  UserRound,
  CreditCard,
  X,
  XCircle,
} from "lucide-react";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { SYSTEM_SHORT } from "@/lib/home-content";
import { useLang, type Lang } from "@/lib/language-context";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { authPortalHeaders } from "@/lib/auth-portal";
import { brokerHomeHref } from "@/lib/livestock-manager-broker";
import { ApprovalDocumentViewer } from "@/components/super-admin/ApprovalDocumentViewer";
import type { CompanyDoc } from "@/components/super-admin/approval-helpers";
import { RegistrationChatPanel } from "@/components/auth/RegistrationChatPanel";
import { WaveHand } from "@/components/ui/WaveHand";
import {
  formatSystemDate,
  greetingForHour,
} from "@/lib/dashboard-greeting";
import { useUrlTab } from "@/lib/use-url-tab";
import { formatMmpsStamp, mogadishuHour } from "@/lib/mogadishu-time";
import {
  isLivestockBrokerRegistration,
  livestockSectionTitle,
  livestockSpeciesLabel,
} from "@/lib/register-flow";
import { isFreePlanPrice, planColorName, planDurationChoiceLabel, planInstallmentAmount, publicPlanName } from "@/lib/pricing-plans";
import { registrationDocumentUrl } from "@/lib/registration-document-url";

const formatStamp = formatMmpsStamp;

type DocState = "submitted" | "under_review" | "accepted" | "rejected" | "missing";
type StepState = "done" | "current" | "upcoming" | "failed";
type NavId =
  | "application"
  | "documents"
  | "messages"
  | "notifications"
  | "profile";

const NAV_IDS = [
  "application",
  "documents",
  "messages",
  "notifications",
  "profile",
] as const satisfies readonly NavId[];

type ProgressPayload = {
  user: {
    id: number;
    fullName: string;
    email: string;
    status: string;
    role: string;
  };
  portalRedirect?: string | null;
  companyName: string | null;
  companyType: string | null;
  companyDistrict?: string | null;
  companyAddress?: string | null;
  sector: string | null;
  applicantKind?: "broker" | "company" | null;
  livestockSection?: string | null;
  marketName?: string | null;
  selectedPlan?: {
    id: number | null;
    name: string;
    price: number | null;
    durationDays: number | null;
    accountType: string | null;
    payMonths?: number | null;
  } | null;
  verification: string;
  submittedAt: string | null;
  rejectionNote: string | null;
  rejection?: {
    reason: string | null;
    rejectedAt: string | null;
    rejectedBy: string | null;
  } | null;
  timeline?: Array<{
    id: string;
    eventType: string;
    title: string;
    detail: string | null;
    statusLabel: string | null;
    actorLabel: string | null;
    createdAt: string;
  }>;
  canReplaceDocuments?: boolean;
  replaceableDocumentIds?: string[];
  requiredDocumentSlots?: Array<{
    id: string;
    label: string;
    labelSo: string;
    description: string | null;
    descriptionSo: string | null;
  }>;
  documents: Array<{
    id: string;
    label: string;
    fileName: string;
    state: DocState;
    rejectReason?: string | null;
    reuploaded?: boolean;
    uploadedAt?: string | null;
  }>;
  steps: Array<{ id: string; state: StepState }>;
  unreadMessages?: number;
  unreadNotifications?: number;
};

type InboxItem = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const STEP_META: Record<
  string,
  {
    en: string;
    so: string;
    Icon: typeof Send;
    accent: string;
    ring: string;
    label: string;
    badge: string;
  }
> = {
  submitted: {
    en: "Submitted",
    so: "La diray",
    Icon: ClipboardList,
    accent: "text-sky-600",
    ring: "border-sky-500 text-sky-600",
    label: "text-sky-600",
    badge: "bg-sky-500",
  },
  received: {
    en: "Under Review",
    so: "Waa la eegayaa",
    Icon: UserRound,
    accent: "text-teal-600",
    ring: "border-teal-600 text-teal-700",
    label: "text-teal-600",
    badge: "bg-teal-600",
  },
  documents: {
    en: "Documents",
    so: "Dukumentiyo",
    Icon: FolderOpen,
    accent: "text-orange-500",
    ring: "border-orange-500 text-orange-500",
    label: "text-orange-500",
    badge: "bg-orange-500",
  },
  decision: {
    en: "Decision",
    so: "Go'aan",
    Icon: BadgeCheck,
    accent: "text-emerald-700",
    ring: "border-emerald-700 text-emerald-700",
    label: "text-emerald-700",
    badge: "bg-emerald-700",
  },
};

const CONNECTOR_FROM: Record<string, string> = {
  submitted: "from-sky-500",
  received: "from-teal-600",
  documents: "from-orange-500",
  decision: "from-emerald-700",
};

const CONNECTOR_TO: Record<string, string> = {
  submitted: "to-sky-500",
  received: "to-teal-600",
  documents: "to-orange-500",
  decision: "to-emerald-700",
};

const DOC_STATE_COPY: Record<
  DocState,
  { en: string; so: string; className: string }
> = {
  submitted: {
    en: "Submitted",
    so: "La diray",
    className: "border border-sky-300 bg-sky-100 text-sky-900",
  },
  under_review: {
    en: "Waiting review",
    so: "Sugaya eegista",
    className: "border border-amber-300 bg-amber-100 text-amber-950",
  },
  accepted: {
    en: "Accepted",
    so: "La aqbalay",
    className:
      "border border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  rejected: {
    en: "Rejected",
    so: "Waa la diiday",
    className: "border border-rose-300 bg-rose-100 text-rose-900",
  },
  missing: {
    en: "Not uploaded",
    so: "Lama soo gelin",
    className: "border border-slate-300 bg-slate-100 text-slate-800",
  },
};

function statusMeta(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") {
    return {
      key: "APPROVED" as const,
      en: "Approved",
      so: "La ansixiyay",
      badge: "border-emerald-200 bg-white text-emerald-800",
      icon: "text-emerald-600",
      Icon: CheckCircle2,
    };
  }
  if (s === "REJECTED") {
    return {
      key: "REJECTED" as const,
      en: "Rejected",
      so: "Waa la diiday",
      badge: "border-rose-200 bg-white text-rose-800",
      icon: "text-rose-600",
      Icon: XCircle,
    };
  }
  return {
    key: "PENDING" as const,
    en: "Pending Review",
    so: "Sugid dib-u-eegis",
    badge: "border-amber-300 bg-amber-100 text-amber-900",
    icon: "text-amber-700",
    Icon: Clock3,
  };
}

function StatusBadge({
  status,
  lang,
}: {
  status: ReturnType<typeof statusMeta>;
  lang: Lang;
}) {
  const Icon = status.Icon;
  const pending = status.key === "PENDING";
  return (
    <span
      className={cn(
        "inline-flex h-9 w-auto items-center justify-center gap-2 rounded-lg border px-3 text-[12px] font-semibold shadow-sm",
        status.badge
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          status.icon,
          pending && "animate-watch-seconds"
        )}
        strokeWidth={pending ? 2.75 : 2.25}
      />
      <StableBilingual en={status.en} so={status.so} lang={lang} />
    </span>
  );
}

type TimelineRow = NonNullable<ProgressPayload["timeline"]>[number];

/** Client fallback so the timeline never renders as an empty green bar. */
function buildDisplayTimeline(data: ProgressPayload): TimelineRow[] {
  const rows = [...(data.timeline || [])];
  const has = (type: string) =>
    rows.some((r) => r.eventType.toUpperCase() === type);

  const submittedAt =
    data.submittedAt || new Date().toISOString();

  if (!has("SUBMITTED")) {
    rows.push({
      id: "local-submitted",
      eventType: "SUBMITTED",
      title: "Application submitted",
      detail: null,
      statusLabel: "Submitted",
      actorLabel: null,
      createdAt: submittedAt,
    });
  }

  if (data.rejection && !has("REJECTED")) {
    rows.push({
      id: "local-rejected",
      eventType: "REJECTED",
      title: "Application rejected",
      detail: data.rejection.reason,
      statusLabel: "Rejected",
      actorLabel: "MMPS Administration",
      createdAt: data.rejection.rejectedAt || new Date().toISOString(),
    });
  }

  return rows.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      String(a.id).localeCompare(String(b.id))
  );
}

function submissionYear(iso: string | null) {
  if (!iso) return "2026";
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? String(y) : "2026";
}

function docHref(fileName: string) {
  if (fileName.startsWith("/api/secure-files/")) return fileName;
  if (fileName.startsWith("/")) return fileName;
  if (fileName.includes("uploads/")) return `/${fileName.replace(/^\/+/, "")}`;
  return registrationDocumentUrl(fileName);
}

function extFromFileName(fileName: string) {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] || "pdf";
}

function mimeOf(ext: string) {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function uploadedAtFromFileName(fileName: string): string | null {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  const m = base.match(/^(\d{12,13})[-_]/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1_000_000_000_000) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toCompanyDocs(
  documents: ProgressPayload["documents"],
  submittedAt: string | null
): CompanyDoc[] {
  return documents.map((doc) => {
    const hasFile =
      Boolean(doc.fileName?.trim()) &&
      doc.fileName !== "Not uploaded";
    const ext = hasFile ? extFromFileName(doc.fileName) : "pdf";
    const status =
      doc.state === "accepted"
        ? ("Verified" as const)
        : doc.state === "rejected" || doc.state === "missing"
          ? ("Missing" as const)
          : ("Pending" as const);
    const uploadedOn = hasFile
      ? doc.uploadedAt ||
        uploadedAtFromFileName(doc.fileName) ||
        submittedAt ||
        ""
      : "";
    return {
      id: doc.id,
      slotId: doc.id,
      label: doc.label,
      name: doc.fileName,
      uploadedOn,
      status,
      ext,
      mime: mimeOf(ext),
      sizeLabel: hasFile ? "Uploaded" : "Not uploaded",
      previewUrl: hasFile ? docHref(doc.fileName) : undefined,
    };
  });
}

function docTypeMeta(label: string, ext: string) {
  const l = label.toLowerCase();
  if (l.includes("photo") || l.includes("image") || ["png", "jpg", "jpeg"].includes(ext)) {
    return {
      Icon: FileImage,
      tone: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (l.includes("passport") || l.includes("id ") || l.includes("identity")) {
    return {
      Icon: IdCard,
      tone: "border border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (l.includes("license") || l.includes("licence") || ext === "pdf") {
    return {
      Icon: FileText,
      tone: "border border-teal-200 bg-teal-50 text-teal-800",
    };
  }
  return {
    Icon: FileText,
    tone: "border border-slate-200 bg-slate-50 text-slate-700",
  };
}

export function AccountProgressDashboard() {
  const { lang } = useLang();
  const router = useRouter();
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nav, setNav] = useUrlTab(NAV_IDS, "application");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState(() => formatSystemDate(new Date()));
  const [greeting, setGreeting] = useState(() =>
    greetingForHour(mogadishuHour())
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [docBusyId, setDocBusyId] = useState<string | null>(null);
  const [resubmitBusy, setResubmitBusy] = useState(false);
  const [docMessage, setDocMessage] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<NavId>(nav);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const resubmitPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    navRef.current = nav;
  }, [nav]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        headers: authPortalHeaders("user"),
      }).then((r) => r.json());
      if (!me?.user) {
        router.replace("/login?next=/account");
        return;
      }
      const res = await fetch("/api/account/progress", {
        credentials: "include",
        cache: "no-store",
        headers: authPortalHeaders("user"),
      });
      if (res.status === 401) {
        router.replace("/login?next=/account");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : lang === "so"
              ? "Lama soo rarinin xogta."
              : "Could not load progress."
        );
        return;
      }
      const status = String(json.user?.status || "").toUpperCase();
      const role = String(json.user?.role || "");
      const portalRedirect =
        typeof json.portalRedirect === "string" ? json.portalRedirect : "";

      // Approved applicants leave the track dashboard. Pending users stay
      // on /account even if a portal path is present on the payload.
      if (status === "APPROVED") {
        let dest = portalRedirect;
        if (!dest) {
          if (role === "SUPER_ADMIN") dest = "/super-admin";
          else if (role === "COMPANY_ADMIN") {
            dest = "/admin";
          } else if (
            role === "LIVESTOCK_BROKER_USER" ||
            isLivestockBrokerRegistration({
              companyType: String(json.companyType || ""),
              companySector: String(json.sector || ""),
              role,
            })
          ) {
            dest = brokerHomeHref({
              email: String(json.user?.email || ""),
            });
          } else {
            dest = "/login";
          }
        }
        router.replace(dest);
        return;
      }

      setData(json as ProgressPayload);
      setUnreadNotifications(Number(json.unreadNotifications) || 0);
    } catch {
      setError(
        lang === "so" ? "Lama soo rarinin xogta." : "Could not load progress."
      );
    } finally {
      setLoading(false);
    }
  }, [lang, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function refresh() {
      const now = new Date();
      setToday(formatSystemDate(now));
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
      headers: authPortalHeaders(),
    });
    window.location.href = "/login";
  }

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const list = Array.isArray(json.notifications) ? json.notifications : [];
      setInbox(
        list.map((n: InboxItem) => ({
          id: Number(n.id),
          title: String(n.title || ""),
          message: String(n.message || "")
            .replace(/\s*Sign in to replace this document\.?/gi, "")
            .replace(/\s*Sign in to open[^.]*\.?/gi, "")
            .replace(/\s*Sign in to review details\.?/gi, "")
            .trim(),
          createdAt:
            typeof n.createdAt === "string"
              ? n.createdAt
              : new Date(n.createdAt).toISOString(),
          read: Boolean(n.read),
        }))
      );
      setUnreadNotifications(
        Number(json.unread) ||
          list.filter((n: InboxItem) => !n.read).length
      );
    } catch {
      // keep last inbox
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    void loadInbox();

    let cancelled = false;

    async function syncProgress() {
      try {
        if (navRef.current === "notifications") {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_all_read" }),
          }).catch(() => null);
        }
        await loadInbox();

        const res = await fetch("/api/account/progress", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (cancelled || !json?.user) return;

        const status = String(json.user?.status || "").toUpperCase();
        const portalRedirect =
          typeof json.portalRedirect === "string" ? json.portalRedirect : "";
        if (status === "APPROVED") {
          router.replace(portalRedirect || "/login");
          return;
        }

        const nextUnread =
          navRef.current === "notifications"
            ? 0
            : Number(json.unreadNotifications) || 0;
        setUnreadNotifications(nextUnread);
        setData({
          ...(json as ProgressPayload),
          unreadNotifications: nextUnread,
        });
      } catch {
        /* keep last snapshot */
      }
    }

    // Fast live updates so Super Admin document review ticks green without refresh
    const id = window.setInterval(() => {
      void syncProgress();
    }, 3_000);

    function onFocus() {
      void syncProgress();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void syncProgress();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data?.user.id, loadInbox, router]);

  const companyDocs = useMemo(
    () => (data ? toCompanyDocs(data.documents, data.submittedAt) : []),
    [data]
  );
  const livestockSection = useMemo(() => {
    if (!data || data.applicantKind === "company") return null;
    if (data.applicantKind === "broker") {
      return data.livestockSection || null;
    }
    // Legacy payloads without applicantKind
    if (
      !isLivestockBrokerRegistration({
        companyType: data.companyType,
        companySector: data.sector,
        role: data.user.role,
      })
    ) {
      return null;
    }
    return (
      data.livestockSection ||
      livestockSectionTitle(
        livestockSpeciesLabel(data.companyType, data.sector, data.companyName)
      )
    );
  }, [data]);
  const livestockMarket =
    data?.applicantKind === "company"
      ? null
      : data?.marketName?.trim() || null;
  const isLivestockApplicant =
    data?.applicantKind === "broker" ||
    (data?.applicantKind !== "company" &&
      Boolean(
        isLivestockBrokerRegistration({
          companyType: data?.companyType,
          companySector: data?.sector,
          role: data?.user.role,
        })
      ));

  function openDocument(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  async function replaceDocument(docId: string, file: File) {
    if (
      !data?.canReplaceDocuments ||
      !["rejected", "missing"].includes(
        data.documents.find((d) => d.id === docId)?.state || ""
      )
    ) {
      setDocMessage({
        tone: "err",
        text:
          lang === "so"
            ? "Kaliya dukumentiga maqan ama la diiday ayaa la soo gelin/beddeli karaa."
            : "Only a missing or rejected document can be uploaded or replaced.",
      });
      return;
    }
    setDocBusyId(docId);
    setDocMessage(null);
    try {
      const form = new FormData();
      form.set(`document_${docId}`, file);
      const res = await fetch("/api/account/documents", {
        method: "POST",
        body: form,
        credentials: "include",
        cache: "no-store",
        headers: authPortalHeaders("user"),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Upload failed"
        );
      }
      setDocMessage({
        tone: "ok",
        text:
          lang === "so"
            ? "Dukumentiga waa la cusboonaysiiyay."
            : json.resubmitted
              ? "Documents updated and sent for re-review."
              : "Document replaced successfully.",
      });
      await load();
    } catch (e) {
      setDocMessage({
        tone: "err",
        text:
          e instanceof Error
            ? e.message
            : lang === "so"
              ? "Cusboonaysiinta waa fashilantay."
              : "Could not replace document.",
      });
    } finally {
      setDocBusyId(null);
    }
  }

  function firstRejectedDocId(): string | null {
    return data?.documents.find((d) => d.state === "rejected")?.id || null;
  }

  function openResubmitFilePicker() {
    const id = firstRejectedDocId();
    const rowInput = id ? fileInputRefs.current[id] : null;
    (resubmitPickerRef.current || rowInput)?.click();
  }

  async function resubmitForReview(file?: File) {
    if (!data?.canReplaceDocuments) {
      setDocMessage({
        tone: "err",
        text:
          lang === "so"
            ? "Codsiga dib looma diri karo hadda."
            : "This application cannot be resubmitted right now.",
      });
      return;
    }
    const rejectedId = firstRejectedDocId();
    if (!file) {
      if (data.documents.some((d) => d.state === "rejected")) {
        openResubmitFilePicker();
        setDocMessage({
          tone: "ok",
          text:
            lang === "so"
              ? "Dooro faylka cusub ee dukumentiga la diiday."
              : "Choose a new file for the rejected document.",
        });
        return;
      }
    }
    setResubmitBusy(true);
    setDocMessage(null);
    try {
      const form = new FormData();
      form.set("resubmit", "true");
      if (file && rejectedId) {
        form.set(`document_${rejectedId}`, file);
      }
      const res = await fetch("/api/account/documents", {
        method: "POST",
        body: form,
        credentials: "include",
        cache: "no-store",
        headers: authPortalHeaders("user"),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Resubmit failed"
        );
      }
      setDocMessage({
        tone: "ok",
        text:
          lang === "so"
            ? "Codsiga waxaa dib loogu diray dib-u-eegis."
            : "Application resubmitted for review.",
      });
      await load();
    } catch (e) {
      setDocMessage({
        tone: "err",
        text:
          e instanceof Error
            ? e.message
            : lang === "so"
              ? "Dib-u-dirista waa fashilantay."
              : "Could not resubmit application.",
      });
    } finally {
      setResubmitBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#f4f6f5]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  if (data && String(data.user.status).toUpperCase() === "APPROVED") {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#f4f6f5]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#f4f6f5] px-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-8 w-8 text-rose-600" />
          <p className="mt-3 text-sm font-semibold text-rose-800">
            {error ||
              (lang === "so" ? "Xog lama helin." : "No progress data found.")}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            <StableBilingual en="Try again" so="Isku day mar kale" lang={lang} />
          </button>
        </div>
      </div>
    );
  }

  const status = statusMeta(data.user.status);

  const navItems: Array<{
    id: NavId;
    en: string;
    so: string;
    icon: typeof ClipboardList;
    badge?: number;
  }> = [
    {
      id: "application",
      en: "My Application",
      so: "Codsigayga",
      icon: ClipboardList,
    },
    { id: "documents", en: "Documents", so: "Dukumentiyada", icon: FolderOpen },
    {
      id: "messages",
      en: "Messages",
      so: "Fariimaha",
      icon: MessageSquare,
      badge: data.unreadMessages || 0,
    },
    {
      id: "notifications",
      en: "Notifications",
      so: "Ogeysiisyada",
      icon: Bell,
      badge: unreadNotifications,
    },
    { id: "profile", en: "Profile", so: "Profile", icon: UserRound },
  ];

  function setPage(id: NavId) {
    setNav(id);
    navRef.current = id;
    setMobileOpen(false);
    if (id === "messages") {
      setData((prev) => (prev ? { ...prev, unreadMessages: 0 } : prev));
    }
    if (id === "notifications") {
      setUnreadNotifications(0);
      setInbox((prev) => prev.map((n) => ({ ...n, read: true })));
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      })
        .then(() => loadInbox())
        .catch(() => null);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SYSTEM_LOGO_SRC}
          alt=""
          className="h-11 w-11 rounded-full bg-white object-contain p-1"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black tracking-tight text-white">
            {SYSTEM_SHORT}
          </p>
          <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/75">
            Applicant Portal
          </p>
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-hidden px-2.5 py-4">
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
          MENU
        </p>
        {navItems.map((item) => {
          const active = nav === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-black uppercase tracking-[0.06em] transition-all",
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
              <span className="flex-1 truncate">
                <StableBilingual en={item.en} so={item.so} lang={lang} />
              </span>
              {item.badge && item.badge > 0 ? (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold normal-case tracking-normal text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="truncate text-[12px] font-bold text-white">
            {data.user.fullName}
          </p>
          <p className="truncate text-[10px] font-medium text-emerald-200/70">
            {data.user.email}
          </p>
          {isLivestockApplicant && livestockSection ? (
            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
              {livestockSection}
            </p>
          ) : data.companyName ? (
            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">
              {data.companyName}
              {data.sector ? ` · ${data.sector}` : ""}
            </p>
          ) : null}
          {isLivestockApplicant && livestockMarket ? (
            <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-100/80">
              {livestockMarket}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex overflow-hidden overscroll-none bg-[#f4f6f5]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col bg-[#00392b] lg:flex">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(100vw,300px)] max-w-full bg-[#00392b] shadow-2xl">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">{sidebar}</div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-[min(76px,14vw)] min-h-[3.5rem] shrink-0 items-center gap-2 border-b border-slate-200/90 bg-white px-2.5 shadow-sm min-[360px]:gap-3 min-[360px]:px-4 sm:h-[76px] sm:px-5">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="inline-flex max-w-full items-center gap-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-teal-700/80">
              <span className="min-w-0 truncate">
                <StableBilingual
                  en="Welcome back"
                  so="Kusoo dhawoow"
                  lang={lang}
                />
              </span>
              <WaveHand />
            </p>
            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              <StableBilingual en={greeting.en} so={greeting.so} lang={lang} />
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 sm:inline-flex"
              title="Today’s date"
            >
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              <span className="tabular-nums">{today}</span>
            </div>

            <div className="relative hidden sm:block" ref={menuRef}>
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
                  <UserRound className="h-4 w-4" strokeWidth={2.5} />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded bg-emerald-800 px-0.5 text-[7px] font-black leading-none text-white ring-1 ring-white">
                    AP
                  </span>
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[140px] truncate text-[12px] font-bold text-slate-800">
                    {data.user.fullName}
                  </span>
                  <span className="block max-w-[140px] truncate text-[10px] font-medium text-slate-500">
                    {data.user.email}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-slate-400 transition",
                    menuOpen && "rotate-180 text-emerald-600"
                  )}
                />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10"
                >
                  <div className="border-b border-slate-100 px-3.5 py-2.5">
                    <p className="truncate text-[12px] font-bold text-slate-800">
                      {data.user.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                      {data.user.email}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                      Applicant Portal
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setPage("profile");
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <UserRound className="h-4 w-4 text-slate-500" />
                    <StableBilingual en="Profile" so="Profile" lang={lang} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              title="Sign out"
              className="inline-flex h-9 items-center rounded-lg border border-rose-200 px-2.5 text-rose-600 transition hover:bg-rose-50 sm:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8",
            nav === "documents" || nav === "notifications" || nav === "messages"
              ? "overflow-hidden"
              : "overflow-y-auto overscroll-y-contain"
          )}
        >
          {nav === "application" && (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8">
              <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                        <StableBilingual
                          en={`MMPS registration · ${submissionYear(data.submittedAt)}`}
                          so={`Diiwaangelinta MMPS · ${submissionYear(data.submittedAt)}`}
                          lang={lang}
                        />
                      </p>
                      <h2 className="mt-0.5 text-base font-black tracking-tight text-white sm:text-lg">
                        <StableBilingual
                          en="Application Progress"
                          so="Horumarka Codsiga"
                          lang={lang}
                        />
                      </h2>
                    </div>
                    <span className="inline-flex h-9 w-auto items-center justify-center gap-2 rounded-lg border border-emerald-300/50 bg-white px-3 text-[12px] font-bold text-[#00392b] shadow-sm">
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-teal-600"
                        strokeWidth={2.4}
                      />
                      {submissionYear(data.submittedAt)} Cycle
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                        <StableBilingual
                          en="Application Status"
                          so="Xaaladda Codsiga"
                          lang={lang}
                        />
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={status} lang={lang} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                        <StableBilingual
                          en="Submission Date"
                          so="Taariikhda Gudbinta"
                          lang={lang}
                        />
                      </p>
                      <p className="mt-2 flex min-h-9 items-center gap-2 text-sm font-black text-white">
                        <CalendarDays
                          className="h-4 w-4 shrink-0 text-[#6ee7b7]"
                          strokeWidth={2.4}
                        />
                        <span className="break-words">
                          {formatStamp(data.submittedAt, lang)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-7">
                  {(() => {
                    const statusLabel = (state: StepState) => {
                      if (state === "done")
                        return { en: "DONE", so: "DONE" };
                      if (state === "current")
                        return { en: "IN PROGRESS", so: "SOCDA" };
                      if (state === "failed")
                        return { en: "FAILED", so: "FASHIL" };
                      return { en: "WAITING", so: "SUGAYA" };
                    };

                    return (
                      <>
                        <div className="relative hidden md:block">
                          <div className="relative flex items-start justify-between gap-0">
                            {data.steps.map((step, i) => {
                              const meta = STEP_META[step.id];
                              if (!meta) return null;
                              const StepIcon = meta.Icon;
                              const label = statusLabel(step.state);
                              const next = data.steps[i + 1];
                              const connectorFilled =
                                step.state === "done" ||
                                step.state === "current" ||
                                step.state === "failed";
                              const nextFilled =
                                next &&
                                (next.state === "done" ||
                                  next.state === "current" ||
                                  next.state === "failed");

                              return (
                                <div
                                  key={step.id}
                                  className="relative flex min-w-0 flex-1 flex-col items-center text-center"
                                >
                                  {i < data.steps.length - 1 && (
                                    <div
                                      className="pointer-events-none absolute left-[calc(50%+2.1rem)] right-[calc(-50%+2.1rem)] top-[2.05rem] h-[3px] -translate-y-1/2"
                                      aria-hidden
                                    >
                                      <div
                                        className={cn(
                                          "h-full w-full rounded-full bg-slate-200",
                                          connectorFilled &&
                                            nextFilled &&
                                            `bg-gradient-to-r ${CONNECTOR_FROM[step.id]} ${CONNECTOR_TO[next.id]}`,
                                          connectorFilled &&
                                            !nextFilled &&
                                            `bg-gradient-to-r ${CONNECTOR_FROM[step.id]} to-slate-200`
                                        )}
                                      />
                                    </div>
                                  )}

                                  <span
                                    className={cn(
                                      "relative z-[1] flex h-[4.1rem] w-[4.1rem] items-center justify-center rounded-full border-[3px] bg-white shadow-sm",
                                      step.state === "failed"
                                        ? "border-rose-500 text-rose-600"
                                        : meta.ring,
                                      step.state === "upcoming" &&
                                        "opacity-80"
                                    )}
                                  >
                                    {step.state === "failed" ? (
                                      <XCircle className="h-7 w-7" />
                                    ) : (
                                      <StepIcon
                                        className="h-7 w-7"
                                        strokeWidth={2.1}
                                      />
                                    )}

                                    {(step.state === "done" ||
                                      step.state === "current" ||
                                      step.state === "failed") && (
                                      <span
                                        className={cn(
                                          "absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shadow ring-2 ring-white",
                                          step.state === "done" &&
                                            "bg-emerald-600",
                                          step.state === "current" &&
                                            "bg-orange-500",
                                          step.state === "failed" &&
                                            "bg-rose-500"
                                        )}
                                      >
                                        {step.state === "done" ? (
                                          <Check
                                            className="h-3.5 w-3.5"
                                            strokeWidth={3}
                                          />
                                        ) : step.state === "current" ? (
                                          <Clock3 className="h-3.5 w-3.5" />
                                        ) : (
                                          <X className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                    )}
                                  </span>

                                  <p
                                    className={cn(
                                      "mt-3 flex h-4 w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.16em]",
                                      step.state === "failed"
                                        ? "text-rose-500"
                                        : meta.label
                                    )}
                                  >
                                    Step {String(i + 1).padStart(2, "0")}
                                  </p>

                                  <p className="mt-1.5 flex h-8 w-full items-center justify-center px-2 text-[13px] font-black leading-tight text-slate-900">
                                    <StableBilingual
                                      en={meta.en}
                                      so={meta.so}
                                      lang={lang}
                                    />
                                  </p>

                                  <span
                                    className={cn(
                                      "mt-3 inline-flex h-8 min-w-[7.75rem] items-center justify-center gap-1.5 rounded-md border px-2.5 text-[10px] font-black uppercase tracking-wide",
                                      step.state === "done" &&
                                        "border-emerald-300 bg-emerald-50 text-emerald-700",
                                      step.state === "current" &&
                                        "border-orange-300 bg-orange-50 text-orange-600",
                                      step.state === "failed" &&
                                        "border-rose-300 bg-rose-50 text-rose-700",
                                      step.state === "upcoming" &&
                                        "border-slate-200 bg-slate-50 text-slate-500"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-full text-white",
                                        step.state === "done" &&
                                          "bg-emerald-600",
                                        step.state === "current" &&
                                          "bg-orange-500",
                                        step.state === "failed" &&
                                          "bg-rose-500",
                                        step.state === "upcoming" &&
                                          "bg-slate-400"
                                      )}
                                    >
                                      {step.state === "done" ? (
                                        <Check
                                          className="h-2.5 w-2.5"
                                          strokeWidth={3}
                                        />
                                      ) : step.state === "current" ? (
                                        <Clock3 className="h-2.5 w-2.5" />
                                      ) : step.state === "failed" ? (
                                        <X className="h-2.5 w-2.5" />
                                      ) : (
                                        <Minus
                                          className="h-2.5 w-2.5"
                                          strokeWidth={3}
                                        />
                                      )}
                                    </span>
                                    <StableBilingual
                                      en={label.en}
                                      so={label.so}
                                      lang={lang}
                                    />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <ol className="space-y-2 md:hidden">
                          {data.steps.map((step, i) => {
                            const meta = STEP_META[step.id];
                            if (!meta) return null;
                            const StepIcon = meta.Icon;
                            const label = statusLabel(step.state);
                            return (
                              <li
                                key={step.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3",
                                  step.state === "done" &&
                                    "border-emerald-200 bg-emerald-50/70",
                                  step.state === "current" &&
                                    "border-orange-300 bg-orange-50",
                                  step.state === "failed" &&
                                    "border-rose-200 bg-rose-50",
                                  step.state === "upcoming" &&
                                    "border-slate-200 bg-slate-50/80"
                                )}
                              >
                                <span
                                  className={cn(
                                    "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] bg-white",
                                    step.state === "failed"
                                      ? "border-rose-500 text-rose-600"
                                      : meta.ring
                                  )}
                                >
                                  {step.state === "failed" ? (
                                    <XCircle className="h-5 w-5" />
                                  ) : (
                                    <StepIcon className="h-5 w-5" />
                                  )}
                                  {(step.state === "done" ||
                                    step.state === "current") && (
                                    <span
                                      className={cn(
                                        "absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-white ring-2 ring-white",
                                        step.state === "done"
                                          ? "bg-emerald-600"
                                          : "bg-orange-500"
                                      )}
                                    >
                                      {step.state === "done" ? (
                                        <Check
                                          className="h-2.5 w-2.5"
                                          strokeWidth={3}
                                        />
                                      ) : (
                                        <Clock3 className="h-2.5 w-2.5" />
                                      )}
                                    </span>
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-[0.12em]",
                                      meta.label
                                    )}
                                  >
                                    Step {String(i + 1).padStart(2, "0")}
                                  </p>
                                  <p className="text-sm font-black text-slate-900">
                                    <StableBilingual
                                      en={meta.en}
                                      so={meta.so}
                                      lang={lang}
                                    />
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex h-7 min-w-[6.5rem] shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-black uppercase tracking-wide",
                                    step.state === "done" &&
                                      "border-emerald-300 bg-emerald-50 text-emerald-700",
                                    step.state === "current" &&
                                      "border-orange-300 bg-orange-50 text-orange-600",
                                    step.state === "failed" &&
                                      "border-rose-300 bg-rose-50 text-rose-700",
                                    step.state === "upcoming" &&
                                      "border-slate-200 bg-white text-slate-500"
                                  )}
                                >
                                  <StableBilingual
                                    en={label.en}
                                    so={label.so}
                                    lang={lang}
                                  />
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </>
                    );
                  })()}
                </div>
              </section>

              {data.rejection ? (
                <div className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-sm">
                  <div className="border-b border-rose-100 bg-gradient-to-r from-rose-700 via-rose-600 to-rose-500 px-5 py-4 sm:px-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-100">
                      Application Status
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      REJECTED
                    </h3>
                  </div>
                  <div className="space-y-3 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                        Rejection Reason
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {data.rejection.reason || data.rejectionNote}
                      </p>
                    </div>
                    {data.rejection.rejectedAt ? (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Rejected on
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatStamp(data.rejection.rejectedAt, lang)}
                        </p>
                      </div>
                    ) : null}
                    {data.canReplaceDocuments ? (
                      <button
                        type="button"
                        onClick={() => setNav("documents")}
                        className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600"
                      >
                        <Upload className="h-4 w-4" />
                        <StableBilingual
                          en="Replace rejected documents"
                          so="Beddel dukumentiyada la diiday"
                          lang={lang}
                        />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {data.rejectionNote && !data.rejection ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {data.rejectionNote}
                </div>
              ) : null}

              {(() => {
                const timeline = buildDisplayTimeline(data);
                const submittedStamp = data.submittedAt;
                return (
                  <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="rounded-t-3xl border-b border-teal-800/20 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700 px-5 py-4 sm:px-6">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                            <StableBilingual
                              en="History"
                              so="Taariikh"
                              lang={lang}
                            />
                          </p>
                          <h2 className="mt-0.5 text-base font-black tracking-tight text-white sm:text-lg">
                            <StableBilingual
                              en="Application Timeline"
                              so="Taariikhda Codsiga"
                              lang={lang}
                            />
                          </h2>
                          <p className="mt-1 max-w-xl text-sm text-emerald-100/95">
                            <StableBilingual
                              en="Read-only history of your application progress."
                              so="Taariikhda akhriska ee horumarka codsigaaga."
                              lang={lang}
                              multiline
                            />
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/25 bg-white/15 px-3.5 py-2 text-right backdrop-blur-sm">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                            <StableBilingual
                              en="Submitted"
                              so="La gudbiyay"
                              lang={lang}
                            />
                          </p>
                          <p className="mt-1 text-sm font-black text-white">
                            {formatStamp(submittedStamp, lang)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <ol className="space-y-0 px-5 py-5 sm:px-6 sm:py-6">
                      {timeline.map((item, idx) => {
                        const isReject =
                          item.eventType === "REJECTED" ||
                          item.eventType === "REASON_UPDATED";
                        const isDone =
                          item.eventType === "APPROVED" ||
                          item.eventType === "DOCUMENTS_REVIEWED" ||
                          item.eventType === "SUBMITTED";
                        return (
                          <li
                            key={item.id}
                            className="relative flex gap-4 pb-5 last:pb-0"
                          >
                            {idx < timeline.length - 1 ? (
                              <span
                                className="absolute left-[0.85rem] top-8 bottom-0 w-px bg-slate-200"
                                aria-hidden
                              />
                            ) : null}
                            <span
                              className={cn(
                                "relative z-[1] mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                                isReject && "bg-rose-600 text-white",
                                isDone && !isReject && "bg-emerald-600 text-white",
                                !isReject && !isDone && "bg-sky-600 text-white"
                              )}
                            >
                              {isReject ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : (
                                <Check
                                  className="h-3.5 w-3.5"
                                  strokeWidth={3}
                                />
                              )}
                            </span>
                            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-500">
                                  {formatStamp(item.createdAt, lang)}
                                </p>
                                {item.statusLabel ? (
                                  <span
                                    className={cn(
                                      "inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                                      isReject && "bg-rose-100 text-rose-700",
                                      isDone &&
                                        !isReject &&
                                        "bg-emerald-100 text-emerald-700",
                                      !isReject &&
                                        !isDone &&
                                        "bg-sky-100 text-sky-700"
                                    )}
                                  >
                                    {item.statusLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1.5 text-sm font-black text-slate-900">
                                {item.title}
                              </p>
                              {item.detail ? (
                                <p
                                  className={cn(
                                    "mt-2 text-sm leading-relaxed",
                                    isReject
                                      ? "font-semibold text-rose-800"
                                      : "text-slate-600"
                                  )}
                                >
                                  {item.eventType === "REASON_UPDATED"
                                    ? `Updated reason: ${item.detail}`
                                    : item.eventType === "REJECTED"
                                      ? `Reason: ${item.detail}`
                                      : item.detail}
                                </p>
                              ) : null}
                              {item.actorLabel ? (
                                <p className="mt-2 text-[11px] font-medium text-slate-400">
                                  {item.actorLabel}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })()}
            </div>
          )}

          {nav === "documents" && (
            <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col">
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="shrink-0 border-b border-teal-800/20 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700 px-5 py-6 sm:px-6 sm:py-7">
                  <div className="flex min-h-[4.5rem] items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      <FolderOpen className="h-7 w-7" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                        <StableBilingual
                          en="Submitted Documents"
                          so="Dukumentiyada La Gudbiyay"
                          lang={lang}
                        />
                      </h2>
                      <p className="mt-1 text-sm text-emerald-100">
                        {data.canReplaceDocuments &&
                        data.documents.some((d) => d.state === "rejected") ? (
                          <StableBilingual
                            en="Re-upload only the rejected documents, then resubmit for admin review."
                            so="Dib u soo geli kaliya dukumentiyada la diiday, ka dibna dib u dir."
                            lang={lang}
                          />
                        ) : (
                          <StableBilingual
                            en="Preview files the same way MMPS admin reviews them."
                            so="Eeg faylasha sida maamulaha MMPS u eego."
                            lang={lang}
                          />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f7faf9] px-5 py-6 sm:px-8 sm:py-8">
                  {docMessage ? (
                    <div
                      className={cn(
                        "mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold",
                        docMessage.tone === "ok"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-rose-200 bg-rose-50 text-rose-900"
                      )}
                    >
                      {docMessage.text}
                    </div>
                  ) : null}
                  <DocumentsTable
                    documents={data.documents}
                    companyDocs={companyDocs}
                    lang={lang}
                    onView={openDocument}
                    canReplace={Boolean(data.canReplaceDocuments)}
                    replaceableIds={
                      data.replaceableDocumentIds?.length
                        ? data.replaceableDocumentIds
                        : data.documents
                            .filter(
                              (d) =>
                                d.state === "rejected" || d.state === "missing"
                            )
                            .map((d) => d.id)
                    }
                    busyId={docBusyId}
                    fileInputRefs={fileInputRefs}
                    onReplace={replaceDocument}
                  />
                  {data.canReplaceDocuments &&
                  (String(data.user.status).toUpperCase() === "REJECTED" ||
                    data.documents.some((d) => d.state === "rejected")) ? (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-center">
                      <p className="mx-auto max-w-2xl text-sm font-semibold leading-relaxed text-amber-950">
                        <StableBilingual
                          en="Replace the rejected file here. The admin is notified automatically and will review the new upload."
                          so="Halkan ku beddel faylka la diiday. Admin si toos ah ayaa loo ogeysiinayaa oo wuu eegi doonaa soo-gelinta cusub."
                          lang={lang}
                        />
                      </p>
                      <input
                        ref={resubmitPickerRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void resubmitForReview(file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={resubmitBusy}
                        onClick={() => void resubmitForReview()}
                        className="relative z-10 mx-auto mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-600 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {resubmitBusy ? (
                          <StableBilingual
                            en="Submitting…"
                            so="Waa la dirayaa…"
                            lang={lang}
                          />
                        ) : (
                          <StableBilingual
                            en="Resubmit for review"
                            so="Dib u dir dib-u-eegis"
                            lang={lang}
                          />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          )}

          {nav === "notifications" && (
            <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col">
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="shrink-0 border-b border-teal-800/20 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700 px-5 py-6 sm:px-6 sm:py-7">
                  <div className="flex min-h-[4.5rem] items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                        <Bell className="h-7 w-7" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                          <StableBilingual
                            en="Notifications"
                            so="Ogeysiisyada"
                            lang={lang}
                          />
                        </h2>
                        <p className="mt-1 text-sm text-emerald-100">
                          <StableBilingual
                            en="Latest updates about your MMPS registration."
                            so="Cusboonaysiinta ugu dambeeya ee diiwaangelintaada MMPS."
                            lang={lang}
                          />
                        </p>
                      </div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/25 sm:inline-flex">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 animate-pulse-live rounded-full bg-emerald-300" />
                      </span>
                      {unreadNotifications}{" "}
                      <StableBilingual en="new" so="cusub" lang={lang} />
                    </span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f7faf9] px-5 py-6 sm:px-8 sm:py-8">
                  {inbox.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-teal-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                      <StableBilingual
                        en="No notifications yet."
                        so="Weli ogeysiis ma jiro."
                        lang={lang}
                      />
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {inbox.map((n) => (
                        <li
                          key={n.id}
                          className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm transition hover:border-teal-300 hover:shadow-md"
                        >
                          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                            <Bell className="h-4 w-4" strokeWidth={2.3} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">
                              {n.title}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                              {n.message}
                            </p>
                            <p className="mt-1.5 text-xs text-slate-500">
                              {formatStamp(n.createdAt, lang)}
                            </p>
                          </div>
                          {!n.read ? (
                            <span className="mt-1 inline-flex h-7 shrink-0 items-center rounded-lg border border-amber-300 bg-amber-100 px-2.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                              <StableBilingual en="New" so="Cusub" lang={lang} />
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}

          {nav === "messages" && (
            <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col">
              <RegistrationChatPanel
                mode="applicant"
                currentUserId={data.user.id}
                className="h-full min-h-0 max-w-none"
              />
            </div>
          )}

          {nav === "profile" && (
            <div className="mx-auto w-full max-w-6xl">
              <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-teal-800/20 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700 px-5 py-6 sm:px-6 sm:py-7">
                  <div className="flex min-h-[4.5rem] flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-black text-teal-800 shadow-sm">
                        {data.user.fullName
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? "")
                          .join("") || "U"}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
                          {data.user.fullName}
                        </h2>
                        <p className="mt-1 truncate text-sm text-emerald-100">
                          {data.user.email}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={status} lang={lang} />
                  </div>
                </div>

                <div className="bg-[#f7faf9] px-5 py-4 sm:px-6 sm:py-5">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                        <UserRound className="h-3.5 w-3.5" />
                        <StableBilingual
                          en="Full name"
                          so="Magaca buuxa"
                          lang={lang}
                        />
                      </dt>
                      <dd className="mt-2 text-sm font-bold text-slate-900">
                        {data.user.fullName}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                        Email
                      </dt>
                      <dd className="mt-2 truncate text-sm font-bold text-slate-900">
                        {data.user.email}
                      </dd>
                    </div>
                    {isLivestockApplicant ? (
                      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                          <StableBilingual
                            en="Account type"
                            so="Nooca akoonka"
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          <StableBilingual
                            en="Livestock broker"
                            so="Dilaalka xoolaha"
                            lang={lang}
                          />
                        </dd>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                          <StableBilingual
                            en="Company"
                            so="Shirkadda"
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          {data.companyName || "—"}
                        </dd>
                      </div>
                    )}
                    {data.selectedPlan?.name ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 shadow-sm sm:col-span-2">
                        <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-800/80">
                          <CreditCard className="h-3.5 w-3.5" />
                          <StableBilingual
                            en="Selected subscription"
                            so="Qidmada la doortay"
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          {data.selectedPlan.price != null && data.selectedPlan.durationDays
                            ? planColorName(
                                data.selectedPlan.price,
                                data.selectedPlan.durationDays,
                                lang === "so" ? "so" : "en"
                              )
                            : publicPlanName(data.selectedPlan.name, lang)}
                        </dd>
                        <dd className="mt-1 text-xs font-semibold text-emerald-800">
                          {[
                            data.selectedPlan.durationDays &&
                            isFreePlanPrice(data.selectedPlan.price)
                              ? planDurationChoiceLabel(
                                  data.selectedPlan.durationDays,
                                  lang,
                                  true
                                )
                              : null,
                            data.selectedPlan.payMonths
                              ? lang === "so"
                                ? `${data.selectedPlan.payMonths} bil ayaa la bixiyay`
                                : `${data.selectedPlan.payMonths} month${data.selectedPlan.payMonths === 1 ? "" : "s"} paid`
                              : null,
                            data.selectedPlan.price != null &&
                            data.selectedPlan.durationDays &&
                            data.selectedPlan.payMonths
                              ? isFreePlanPrice(data.selectedPlan.price)
                                ? lang === "so"
                                  ? "Bilaash"
                                  : "Free"
                                : `$${planInstallmentAmount(
                                    data.selectedPlan.price,
                                    data.selectedPlan.durationDays,
                                    data.selectedPlan.payMonths
                                  )}`
                              : data.selectedPlan.price != null
                                ? `$${data.selectedPlan.price}`
                                : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </dd>
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                        <StableBilingual en="Sector" so="Qaybta" lang={lang} />
                      </dt>
                      <dd className="mt-2 text-sm font-bold capitalize text-slate-900">
                        {data.sector || "—"}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                        <StableBilingual
                          en={
                            isLivestockApplicant
                              ? "Livestock section"
                              : "Company type"
                          }
                          so={
                            isLivestockApplicant
                              ? "Qaybta xoolaha"
                              : "Nooca shirkadda"
                          }
                          lang={lang}
                        />
                      </dt>
                      <dd className="mt-2 text-sm font-bold text-slate-900">
                        {isLivestockApplicant
                          ? livestockSection || "—"
                          : data.companyType || "—"}
                      </dd>
                    </div>
                    {isLivestockApplicant && livestockMarket ? (
                      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                          <StableBilingual
                            en={
                              livestockMarket.includes("·") ||
                              livestockMarket.includes(",")
                                ? "Markets"
                                : "Market"
                            }
                            so={
                              livestockMarket.includes("·") ||
                              livestockMarket.includes(",")
                                ? "Suuqyada"
                                : "Suuqa"
                            }
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          {livestockMarket}
                        </dd>
                      </div>
                    ) : null}
                    {!isLivestockApplicant && data.companyDistrict ? (
                      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                          <StableBilingual
                            en="District"
                            so="Degmada"
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          {data.companyDistrict}
                        </dd>
                      </div>
                    ) : null}
                    {!isLivestockApplicant && data.companyAddress ? (
                      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                          <StableBilingual
                            en="Company address"
                            so="Cinwaanka shirkadda"
                            lang={lang}
                          />
                        </dt>
                        <dd className="mt-2 text-sm font-bold text-slate-900">
                          {data.companyAddress}
                        </dd>
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm">
                      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-teal-700/80">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <StableBilingual
                          en="Submitted"
                          so="La gudbiyay"
                          lang={lang}
                        />
                      </dt>
                      <dd className="mt-2 text-sm font-bold text-slate-900">
                        {formatStamp(data.submittedAt, lang)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          )}

        </main>
      </div>

      <ApprovalDocumentViewer
        docs={companyDocs}
        startIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

function DocumentsTable({
  documents,
  companyDocs,
  lang,
  limit,
  onView,
  canReplace = false,
  replaceableIds = [],
  busyId = null,
  fileInputRefs,
  onReplace,
}: {
  documents: ProgressPayload["documents"];
  companyDocs: CompanyDoc[];
  lang: Lang;
  limit?: number;
  onView: (index: number) => void;
  canReplace?: boolean;
  replaceableIds?: string[];
  busyId?: string | null;
  fileInputRefs?: React.MutableRefObject<
    Record<string, HTMLInputElement | null>
  >;
  onReplace?: (docId: string, file: File) => void | Promise<void>;
}) {
  const rows = limit ? documents.slice(0, limit) : documents;
  const replaceSet = new Set(replaceableIds);
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        <StableBilingual
          en="No documents uploaded yet."
          so="Weli dukumentiyo lama soo gelin."
          lang={lang}
        />
      </p>
    );
  }
  return (
    <ul className="space-y-3.5">
      {rows.map((doc, i) => {
        const fullIndex = documents.findIndex((d) => d.id === doc.id);
        const index = fullIndex >= 0 ? fullIndex : i;
        const companyDoc = companyDocs[index];
        const ext = companyDoc?.ext || extFromFileName(doc.fileName);
        const meta = docTypeMeta(doc.label, ext);
        const Icon = meta.Icon;
        const st = DOC_STATE_COPY[doc.state];
        const hasFile =
          Boolean(doc.fileName?.trim()) && doc.fileName !== "Not uploaded";
        const canOpen = Boolean(companyDoc?.previewUrl) && hasFile;
        const isBusy = busyId === doc.id;
        const allowReplace =
          Boolean(canReplace && onReplace) &&
          (doc.state === "rejected" || doc.state === "missing") &&
          (replaceSet.size === 0 || replaceSet.has(doc.id));
        return (
          <li
            key={doc.id}
            className={cn(
              "flex min-h-[5.5rem] flex-col gap-4 rounded-2xl border bg-white px-5 py-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-start",
              doc.state === "rejected"
                ? "border-rose-200 hover:border-rose-300"
                : doc.state === "missing"
                  ? "border-slate-200 hover:border-slate-300"
                  : "border-teal-100 hover:border-teal-300"
            )}
          >
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                meta.tone
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col justify-center text-left">
              <p className="text-[15px] font-bold leading-snug text-slate-900">
                {doc.label}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                {hasFile ? (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5">
                    {ext.toUpperCase()}
                  </span>
                ) : null}
                {hasFile && companyDoc?.uploadedOn ? (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5">
                    {formatStamp(companyDoc.uploadedOn, lang)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 break-all text-[12px] font-medium leading-relaxed text-slate-500">
                {hasFile ? (
                  doc.fileName
                ) : (
                  <StableBilingual
                    en="No file yet — click Upload to add it"
                    so="Fayl weli ma jiro — riix Upload si aad u geliso"
                    lang={lang}
                  />
                )}
              </p>
              {doc.state === "rejected" && doc.rejectReason ? (
                <p className="mt-2 break-words text-sm font-semibold leading-snug text-rose-700">
                  <StableBilingual
                    en={`Rejected: ${doc.rejectReason}`}
                    so={`Waa la diiday: ${doc.rejectReason}`}
                    lang={lang}
                  />
                </p>
              ) : null}
              {doc.reuploaded && doc.state !== "accepted" && doc.state !== "rejected" ? (
                <p className="mt-2 break-words text-sm font-semibold leading-snug text-amber-800">
                  <StableBilingual
                    en="Re-uploaded. Waiting for admin to accept this file."
                    so="Dib ayaa loo soo geliyay. Sugaya in admin-ku aqbalo."
                    lang={lang}
                  />
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-bold uppercase tracking-wide shadow-sm",
                st.className
              )}
            >
              <StableBilingual en={st.en} so={st.so} lang={lang} />
            </span>
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => onView(index)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#0d9488] disabled:opacity-40"
                title="Preview"
              >
                <Eye className="h-4 w-4 text-emerald-100" strokeWidth={2.4} />
                <StableBilingual en="View" so="Eeg" lang={lang} />
              </button>
              {allowReplace ? (
                <>
                  <input
                    ref={(el) => {
                      if (fileInputRefs) fileInputRefs.current[doc.id] = el;
                    }}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file && onReplace) void onReplace(doc.id, file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fileInputRefs?.current[doc.id]?.click()}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-4 text-sm font-bold text-orange-800 shadow-sm transition hover:bg-orange-100 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" strokeWidth={2.4} />
                    {isBusy ? (
                      <StableBilingual
                        en="Uploading…"
                        so="Waa la geliyaa…"
                        lang={lang}
                      />
                    ) : doc.state === "missing" ? (
                      <StableBilingual en="Upload" so="Soo geli" lang={lang} />
                    ) : (
                      <StableBilingual en="Replace" so="Beddel" lang={lang} />
                    )}
                  </button>
                </>
              ) : null}
              <a
                href={canOpen ? companyDoc!.previewUrl : undefined}
                download={canOpen ? doc.fileName : undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-800 shadow-sm hover:bg-teal-100",
                  !canOpen && "pointer-events-none opacity-40"
                )}
                title="Download"
              >
                <Download className="h-4 w-4" strokeWidth={2.4} />
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
