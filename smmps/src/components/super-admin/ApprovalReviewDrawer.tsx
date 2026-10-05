"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  Download,
  Eye,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
  X,
  XCircle,
  CreditCard,
} from "lucide-react";
import type { CompanyRecord } from "@/lib/super-admin-service";
import { providerMetaForSlug } from "@/lib/company-scope";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import {
  companyAdminAvatarFor,
  companyAdminAvatarObjectPosition,
  initialsFromName,
} from "@/lib/company-admin-avatars";
import { cn } from "@/lib/utils";
import { authPortalHeaders } from "@/lib/auth-portal";
import {
  applicantCompanyLogo,
  docsFor,
  formatDate,
  formatDateTime,
  isApplicantUploadedAsset,
  isLivestockBrokerApplicant,
  profileFor,
  SECTOR_META,
  statusChip,
  statusLabel,
  statusBadgeBox,
  type CompanyDoc,
  type DisplayStatus,
} from "@/components/super-admin/approval-helpers";
import { ApprovalDocumentViewer } from "@/components/super-admin/ApprovalDocumentViewer";
import { RegistrationChatPanel } from "@/components/auth/RegistrationChatPanel";
import {
  Modal,
  Field as ModalField,
  inputCls,
} from "@/components/ui/DataTable";
import { SHARED_SECTOR_DOCUMENTS } from "@/lib/registration-requirements";
import {
  planDurationChoiceLabel,
  planInstallmentAmount,
  type PublicSubscriptionPlan,
} from "@/lib/pricing-plans";
import { registrationDocumentUrl } from "@/lib/registration-document-url";

type Tab = "account" | "company" | "documents" | "payment" | "messages";

function isReceiptImage(fileName: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(fileName);
}

function PaymentReviewPanel({ company }: { company: CompanyRecord }) {
  const docs = company.registrationDocuments ?? {};
  const storedId = Number(docs.plan_id);
  const receiptFile = docs.payment_receipt?.trim() || "";
  const paymentMethod = String(docs.payment_method || "")
    .trim()
    .toLowerCase();
  const methodLabel =
    paymentMethod === "mastercard"
      ? "MasterCard"
      : paymentMethod === "visa"
        ? "Visa"
      : paymentMethod === "evc"
        ? "EVC Plus"
        : "";
  const receiptUrl =
    receiptFile && !methodLabel ? registrationDocumentUrl(receiptFile) : "";
  const [official, setOfficial] = useState<PublicSubscriptionPlan | null>(null);

  useEffect(() => {
    if (!Number.isFinite(storedId) || storedId <= 0) {
      setOfficial(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/subscriptions/public", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { plans?: PublicSubscriptionPlan[] }) => {
        if (cancelled) return;
        const match = (data.plans ?? []).find((plan) => plan.id === storedId) ?? null;
        setOfficial(match);
      })
      .catch(() => {
        if (!cancelled) setOfficial(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storedId, company.id]);

  const name =
    official?.name ||
    docs.plan_name?.trim() ||
    (Number.isFinite(storedId) && storedId > 0 ? `Plan #${storedId}` : "");
  const price = official ? String(official.price) : docs.plan_price?.trim() || "";
  const days = official
    ? String(official.durationDays)
    : docs.plan_duration_days?.trim() || "";
  const accountType = official?.accountType || docs.plan_sector?.trim() || "";
  const isFreePlan =
    (official != null && Number(official.price) <= 0) ||
    (price !== "" && Number(price) <= 0);
  const payMonths = Number(docs.pay_months);
  const amount =
    price && !isFreePlan
      ? Number.isFinite(payMonths) && payMonths >= 1 && days
        ? `$${planInstallmentAmount(Number(price), Number(days), payMonths).toFixed(2)}`
        : `$${price}`
      : price
        ? `$${price}`
        : null;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
          Selected subscription plan
        </p>
        <p className="mt-1 truncate text-sm font-bold text-slate-950">
          {name || "Plan not recorded"}
        </p>
        <p className="mt-0.5 text-[12px] font-semibold text-amber-900/80">
          {[
            amount,
            isFreePlan && days
              ? planDurationChoiceLabel(Number(days), "en", true)
              : null,
            docs.pay_months
              ? `${docs.pay_months} month${Number(docs.pay_months) === 1 ? "" : "s"} paid`
              : null,
            accountType || null,
          ]
            .filter(Boolean)
            .join(" · ") || "Awaiting plan details"}
        </p>
      </div>

      {methodLabel ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Payment method
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{methodLabel}</p>
          {docs.payment_card_last4 ? (
            <p className="mt-1 text-xs font-semibold text-emerald-900/85">
              ****{docs.payment_card_last4}
              {docs.payment_card_expiry ? ` · exp ${docs.payment_card_expiry}` : ""}
              {docs.payment_card_holder ? ` · ${docs.payment_card_holder}` : ""}
            </p>
          ) : null}
          {docs.evc_transaction_id ? (
            <p className="mt-1 font-mono text-xs font-semibold text-emerald-900/85">
              Tx {docs.evc_transaction_id}
              {docs.evc_account_no ? ` · ${docs.evc_account_no}` : ""}
              {docs.evc_amount ? ` · $${docs.evc_amount}` : ""}
            </p>
          ) : null}
          {docs.evc_phone ? (
            <p className="mt-1 text-xs font-semibold text-emerald-900/85">
              Phone: {docs.evc_phone}
            </p>
          ) : null}
        </div>
      ) : receiptUrl ? (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
          {isReceiptImage(receiptFile) ? (
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt="Payment receipt screenshot"
                className="max-h-56 w-full bg-slate-50 object-contain"
              />
            </a>
          ) : (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 px-3 py-3 text-sm font-bold text-amber-900"
            >
              <span className="truncate">{receiptFile}</span>
              <span className="shrink-0">Open receipt</span>
            </a>
          )}
        </div>
      ) : isFreePlan ? (
        <p className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-xs font-semibold text-emerald-900">
          Free plan — no payment required.
        </p>
      ) : (
        <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          Payment method not recorded yet.
        </p>
      )}
    </div>
  );
}

function resolveReviewImage(company: CompanyRecord): string | null {
  // Applicant upload only — never decorate pending reviews with stock logos.
  if (isApplicantUploadedAsset(company.image)) return company.image!.trim();

  const slug =
    company.companySlug?.trim() ||
    providerMetaForSlug(company.id)?.slug ||
    null;

  if (slug && slug !== "water" && slug !== "electricity" && slug !== "livestock") {
    const metaImage = providerMetaForSlug(slug)?.image?.trim();
    if (metaImage) return metaImage;
  }

  // Seed Livestock Market company only (not every livestock applicant).
  if (
    company.id === "livestock-market" ||
    company.companySlug === "livestock-market"
  ) {
    return LIVESTOCK_MARKET_LOGO;
  }
  return null;
}

const TABS: {
  key: Tab;
  step: string;
  label: string;
  tone: "indigo" | "violet" | "sky" | "amber" | "teal";
  activeCircle: string;
  idleCircle: string;
  activeLabel: string;
  idleLabel: string;
  connector: string;
  pageBg: string;
}[] = [
  {
    key: "account",
    step: "01",
    label: "Account",
    tone: "indigo",
    activeCircle: "bg-indigo-600 text-white shadow-[0_0_0_4px_#e0e7ff]",
    idleCircle: "bg-indigo-50 text-indigo-600",
    activeLabel: "text-indigo-700",
    idleLabel: "text-indigo-500/80",
    connector: "bg-indigo-300",
    pageBg: "bg-gradient-to-b from-indigo-50/70 via-white to-white",
  },
  {
    key: "company",
    step: "02",
    label: "Company",
    tone: "violet",
    activeCircle: "bg-violet-600 text-white shadow-[0_0_0_4px_#ede9fe]",
    idleCircle: "bg-violet-50 text-violet-600",
    activeLabel: "text-violet-700",
    idleLabel: "text-violet-500/80",
    connector: "bg-violet-300",
    pageBg: "bg-gradient-to-b from-violet-50/70 via-white to-white",
  },
  {
    key: "documents",
    step: "03",
    label: "Documents",
    tone: "sky",
    activeCircle: "bg-sky-600 text-white shadow-[0_0_0_4px_#e0f2fe]",
    idleCircle: "bg-sky-50 text-sky-600",
    activeLabel: "text-sky-700",
    idleLabel: "text-sky-500/80",
    connector: "bg-sky-300",
    pageBg: "bg-gradient-to-b from-sky-50/70 via-white to-white",
  },
  {
    key: "payment",
    step: "04",
    label: "Payment",
    tone: "amber",
    activeCircle: "bg-amber-600 text-white shadow-[0_0_0_4px_#fef3c7]",
    idleCircle: "bg-amber-50 text-amber-700",
    activeLabel: "text-amber-800",
    idleLabel: "text-amber-600/80",
    connector: "bg-amber-300",
    pageBg: "bg-gradient-to-b from-amber-50/70 via-white to-white",
  },
  {
    key: "messages",
    step: "05",
    label: "Messages",
    tone: "teal",
    activeCircle: "bg-teal-700 text-white shadow-[0_0_0_4px_#ccfbf1]",
    idleCircle: "bg-teal-50 text-teal-700",
    activeLabel: "text-teal-800",
    idleLabel: "text-teal-600/80",
    connector: "bg-teal-300",
    pageBg: "bg-gradient-to-b from-teal-50/60 via-white to-white",
  },
];

export function ApprovalReviewDrawer({
  company,
  displayStatus,
  onClose,
  onEditRejectionReason,
}: {
  company: CompanyRecord;
  displayStatus: DisplayStatus;
  onClose: () => void;
  onEditRejectionReason?: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("account");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [adminUserId, setAdminUserId] = useState<number | null>(null);
  const [docReviews, setDocReviews] = useState<
    Record<
      string,
      {
        status: string;
        reason: string | null;
        reviewedAt: string | null;
        reviewedByName?: string | null;
        reuploaded?: boolean;
        replacedAt?: string | null;
      }
    >
  >({});
  const [rejectDoc, setRejectDoc] = useState<CompanyDoc | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState("");
  const [docActionBusy, setDocActionBusy] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{
    reason: string | null;
    rejectedAt: string | null;
    rejectedByName: string | null;
  }>({
    reason: company.rejectionReason ?? null,
    rejectedAt: company.rejectedAt ?? null,
    rejectedByName: company.rejectedByName ?? null,
  });

  useEffect(() => {
    setRejection({
      reason: company.rejectionReason ?? null,
      rejectedAt: company.rejectedAt ?? null,
      rejectedByName: company.rejectedByName ?? null,
    });
  }, [company.id, company.rejectionReason, company.rejectedAt, company.rejectedByName]);

  useEffect(() => {
    if (displayStatus !== "REJECTED") return;
    if (!/^\d+$/.test(company.id)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/super-admin/users/${company.id}/rejection-reason`
        );
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && json.rejection) {
          setRejection({
            reason: json.rejection.reason ?? null,
            rejectedAt: json.rejection.rejectedAt ?? null,
            rejectedByName: json.rejection.rejectedByName ?? null,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [company.id, displayStatus]);

  const meta = SECTOR_META[company.sector];
  const docs = docsFor(company);
  const profile = profileFor(company);
  const isBroker = isLivestockBrokerApplicant(company);
  const uploadedCount = docs.filter((d) => d.previewUrl).length;
  const loginEmail = company.email;
  const companyEmail = profile.companyEmail;
  const logoSrc = applicantCompanyLogo(company);
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const threadUserId = Number(company.id);
  const canMessage =
    Number.isInteger(threadUserId) && threadUserId > 0;
  const personPhoto = companyAdminAvatarFor({
    email: loginEmail,
    fullName: profile.contactPerson,
    companySlug: company.companySlug,
    companyName: company.name,
    companyType: company.companyType,
    registrationDocuments: company.registrationDocuments,
    allowSectionStock: false,
  });
  const personInitials = initialsFromName(profile.contactPerson, loginEmail);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: authPortalHeaders("super"),
        });
        const json = await res.json().catch(() => ({}));
        const id = Number(json?.user?.id);
        if (!cancelled && Number.isFinite(id) && id > 0) {
          setAdminUserId(id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Number.isInteger(threadUserId) || threadUserId <= 0) return;
    let cancelled = false;
    async function loadReviews() {
      try {
        const res = await fetch(
          `/api/super-admin/users/${threadUserId}/document-reviews`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const next: typeof docReviews = {};
        for (const slot of json.slots || []) {
          next[slot.id] = slot.review;
        }
        setDocReviews(next);
      } catch {
        /* ignore */
      }
    }
    void loadReviews();
    const timer =
      tab === "documents" ? window.setInterval(() => void loadReviews(), 4000) : 0;
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [threadUserId, tab]);

  useEffect(() => {
    if (tab !== "documents") return;
    if (!Number.isInteger(threadUserId) || threadUserId <= 0) return;
    void fetch(`/api/super-admin/users/${threadUserId}/review-documents`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => {
    });
  }, [tab, threadUserId]);

  async function reviewDocument(
    doc: CompanyDoc,
    action: "ACCEPT" | "REJECT",
    reason?: string
  ) {
    if (!Number.isInteger(threadUserId) || threadUserId <= 0) return;
    setDocActionBusy(doc.slotId || doc.id);
    try {
      const res = await fetch(
        `/api/super-admin/users/${threadUserId}/document-reviews`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: doc.slotId || doc.id,
            action,
            reason: reason || undefined,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Could not update document");
      }
      const next: typeof docReviews = {};
      for (const slot of json.slots || []) {
        next[slot.id] = slot.review;
      }
      setDocReviews(next);
      if (action === "REJECT") {
        setRejectDoc(null);
        setRejectDocReason("");
      }
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Could not update document review"
      );
    } finally {
      setDocActionBusy(null);
    }
  }

  function openDoc(i: number) {
    setViewerIndex(i);
    setViewerOpen(true);
  }

  function downloadDoc(doc: CompanyDoc) {
    if (!doc.previewUrl) return;
    const a = document.createElement("a");
    a.href = doc.previewUrl;
    a.download = doc.name;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-0 z-50 flex w-full flex-col border-slate-200/80 bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)] animate-fade-in-right sm:inset-y-0 sm:right-0 sm:left-auto sm:max-w-[min(100vw,600px)] sm:border-l">
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <CompanyAvatar company={company} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                      {company.name}
                    </h2>
                    <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                  </div>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                    {company.acronym} ·{" "}
                    {isBroker ? "Livestock Broker" : meta.label}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn(statusBadgeBox, statusChip(displayStatus))}>
                    {statusLabel(displayStatus)}
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-5">
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] z-0 flex h-0.5"
              aria-hidden
            >
              {TABS.slice(0, -1).map((t) => (
                <span
                  key={`line-${t.key}`}
                  className={cn("h-full min-w-0 flex-1 rounded-full", t.connector)}
                />
              ))}
            </div>
            <div className="relative z-10 grid grid-cols-5">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold transition-colors",
                        active ? t.activeCircle : t.idleCircle
                      )}
                    >
                      {t.step}
                    </span>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[10px] font-bold uppercase tracking-[0.08em]",
                        active ? t.activeLabel : t.idleLabel
                      )}
                    >
                      {t.key === "company" && isBroker ? "Broker" : t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {displayStatus === "REJECTED" && (
          <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                  Status: Rejected
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-950">
                  Reason: {rejection.reason || "No reason recorded yet."}
                </p>
                <p className="mt-1 text-xs text-rose-800/80">
                  Rejected by: {rejection.rejectedByName || "Super Admin"}
                  {rejection.rejectedAt
                    ? ` · Rejected on: ${formatDateTime(rejection.rejectedAt)}`
                    : ""}
                </p>
              </div>
              {onEditRejectionReason ? (
                <button
                  type="button"
                  onClick={() => void onEditRejectionReason()}
                  className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Edit Reason
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col transition-colors",
            tab === "messages"
              ? cn("overflow-hidden px-5 py-5", activeTab.pageBg)
              : cn("overflow-y-auto px-5 py-5", activeTab.pageBg)
          )}
        >
          {tab === "account" && (
            <SectionCard
              title="Account"
              subtitle="Registration step 01 · in form order"
              icon={UserRound}
              tone="indigo"
            >
              <div className="flex w-full flex-col">
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3 py-3">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-indigo-100">
                    {personPhoto ? (
                      <Image
                        src={personPhoto}
                        alt={profile.contactPerson}
                        fill
                        className="object-cover"
                        style={{
                          objectPosition:
                            companyAdminAvatarObjectPosition(personPhoto),
                        }}
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <span className="text-sm font-black text-indigo-700">
                        {personInitials}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500">
                      Authorized contact
                    </p>
                    <p className="truncate text-[14px] font-bold text-slate-900">
                      {profile.contactPerson}
                    </p>
                  </div>
                </div>
                <Field label="1. Full Name" value={profile.contactPerson} />
                <Field
                  label="2. Email Address (system login)"
                  value={
                    <a
                      href={`mailto:${loginEmail}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {loginEmail}
                    </a>
                  }
                />
                <Field
                  label="3. Phone Number"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {company.phone}
                    </span>
                  }
                />
              </div>
            </SectionCard>
          )}

          {tab === "company" && (
            <SectionCard
              title={isBroker ? "Broker" : "Company"}
              subtitle="Registration step 02 · in form order"
              icon={Building2}
              tone="violet"
            >
              <div className="flex w-full flex-col">
                <Field
                  label={isBroker ? "1. Broker Logo" : "1. Company Logo"}
                  value={
                    logoSrc ? (
                      <span className="mt-1 inline-flex items-center gap-3">
                        <span className="relative h-20 w-20 overflow-hidden rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">
                          <Image
                            src={logoSrc}
                            alt={`${company.name} logo`}
                            fill
                            sizes="160px"
                            quality={100}
                            unoptimized={logoSrc.startsWith("/uploads/")}
                            className="object-contain"
                          />
                        </span>
                        <span className="text-[12px] font-medium text-emerald-700">
                          Uploaded
                        </span>
                      </span>
                    ) : (
                      "Not uploaded"
                    )
                  }
                />
                <Field
                  label={isBroker ? "2. Broker Name" : "2. Company Name"}
                  value={company.name}
                />
                <Field
                  label={isBroker ? "3. Market Section" : "3. Company Type"}
                  value={profile.companyType}
                />
                <Field
                  label={isBroker ? "4. Markets" : "4. District"}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-violet-500" />
                      {isBroker
                        ? company.registrationDocuments?.market_names?.trim() ||
                          company.companyAddress?.trim() ||
                          profile.address ||
                          "—"
                        : profile.district}
                    </span>
                  }
                />
                <Field
                  label={
                    isBroker
                      ? "5. Broker Email Address"
                      : "5. Company Email Address"
                  }
                  value={
                    companyEmail && companyEmail !== "—" ? (
                      <a
                        href={`mailto:${companyEmail}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {companyEmail}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                {!isBroker ? (
                  <Field label="6. Company Address" value={profile.address} />
                ) : null}
              </div>
            </SectionCard>
          )}

          {tab === "documents" && (
            <SectionCard
              title="Documents"
              subtitle={`Registration step 03 · ${uploadedCount} of ${docs.length} uploaded`}
              icon={FolderOpen}
              tone="sky"
            >
              {uploadedCount > 0 && (
                <button
                  type="button"
                  onClick={() => openDoc(docs.findIndex((d) => d.previewUrl) || 0)}
                  className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                >
                  <Eye className="h-4 w-4" />
                  Open document reader
                </button>
              )}
              <p className="mb-3 text-xs font-medium text-slate-500">
                Accept or reject each document separately (1, 2, or all 3).
              </p>
              <ul className="space-y-2.5">
                {docs.map((d, i) => {
                  const slotId =
                    d.slotId ||
                    SHARED_SECTOR_DOCUMENTS.find((s) => s.label === d.label)?.id ||
                    d.id;
                  const review = docReviews[slotId];
                  const reviewStatus = (review?.status || "PENDING").toUpperCase();
                  const merged: CompanyDoc = {
                    ...d,
                    slotId,
                    status:
                      reviewStatus === "ACCEPTED"
                        ? "Verified"
                        : reviewStatus === "REJECTED"
                          ? "Rejected"
                          : d.previewUrl
                            ? "Pending"
                            : "Missing",
                    rejectReason: review?.reason || null,
                    reuploaded: review?.reuploaded === true,
                  };
                  return (
                    <DocCard
                      key={d.id}
                      index={i + 1}
                      doc={merged}
                      busy={docActionBusy === slotId}
                      canReview={
                        Number.isInteger(threadUserId) &&
                        threadUserId > 0 &&
                        displayStatus !== "APPROVED"
                      }
                      onPreview={() => openDoc(i)}
                      onDownload={() => downloadDoc(d)}
                      onAccept={() => void reviewDocument(merged, "ACCEPT")}
                      onReject={() => {
                        setRejectDoc(merged);
                        setRejectDocReason(merged.rejectReason || "");
                      }}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          )}

          {tab === "payment" && (
            <SectionCard
              title="Payment"
              subtitle="Registration step 04 · plan & payment proof"
              icon={CreditCard}
              tone="amber"
            >
              <PaymentReviewPanel company={company} />
            </SectionCard>
          )}

          {tab === "messages" && (
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {canMessage && adminUserId ? (
                <RegistrationChatPanel
                  mode="admin"
                  threadUserId={threadUserId}
                  currentUserId={adminUserId}
                  applicantName={
                    profile.contactPerson || company.fullName || company.name
                  }
                  className="h-full min-h-0 w-full max-w-none"
                />
              ) : canMessage ? (
                <div className="grid min-h-[16rem] w-full flex-1 place-items-center rounded-3xl border border-dashed border-teal-200 bg-white text-sm text-slate-500">
                  Loading secure chat…
                </div>
              ) : (
                <div className="w-full rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Messaging unavailable
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Chat is available for applicant registrations linked to a
                    user account.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </aside>

      <ApprovalDocumentViewer
        docs={docs}
        startIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      <Modal
        open={!!rejectDoc}
        onClose={() => {
          if (docActionBusy) return;
          setRejectDoc(null);
          setRejectDocReason("");
        }}
        title="Reject Document"
        footer={
          <>
            <button
              type="button"
              disabled={!!docActionBusy}
              onClick={() => {
                setRejectDoc(null);
                setRejectDocReason("");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!!docActionBusy || !rejectDocReason.trim() || !rejectDoc}
              onClick={() => {
                if (!rejectDoc) return;
                void reviewDocument(rejectDoc, "REJECT", rejectDocReason.trim());
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {docActionBusy ? "Saving…" : "Confirm Reject"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Rejecting{" "}
          <span className="font-semibold text-slate-900">
            {rejectDoc?.label || rejectDoc?.name}
          </span>
          . Other documents are not affected.
        </p>
        <ModalField
          label="Reason"
          hint="Required — the applicant will see this reason."
        >
          <textarea
            className={cn(inputCls, "min-h-[100px] resize-y")}
            value={rejectDocReason}
            onChange={(e) => setRejectDocReason(e.target.value)}
            placeholder="Why is this document rejected?"
            autoFocus
          />
        </ModalField>
      </Modal>
    </>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof UserRound;
  tone: "indigo" | "violet" | "sky" | "amber";
  children: ReactNode;
}) {
  const tones = {
    indigo: {
      card: "border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-white",
      icon: "bg-indigo-600 text-white shadow-indigo-900/15",
      title: "text-indigo-950",
      sub: "text-indigo-700/70",
    },
    violet: {
      card: "border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-white",
      icon: "bg-violet-600 text-white shadow-violet-900/15",
      title: "text-violet-950",
      sub: "text-violet-700/70",
    },
    sky: {
      card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-teal-50/20",
      icon: "bg-sky-600 text-white shadow-sky-900/15",
      title: "text-sky-950",
      sub: "text-sky-700/70",
    },
    amber: {
      card: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/30",
      icon: "bg-amber-600 text-white shadow-amber-900/15",
      title: "text-amber-950",
      sub: "text-amber-800/70",
    },
  }[tone];

  return (
    <section className={cn("flex w-full flex-1 flex-col rounded-2xl border p-5 shadow-sm", tones.card)}>
      <div className="mb-5 flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-md",
            tones.icon
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-sm font-bold tracking-tight", tones.title)}>{title}</h3>
          <p className={cn("text-[11px] font-medium", tones.sub)}>{subtitle}</p>
        </div>
      </div>
      <div className="flex w-full flex-1 flex-col">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-black/[0.04] py-3 last:border-0 last:pb-0 first:pt-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-full shrink-0 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500 sm:w-[42%]">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function DocCard({
  index,
  doc,
  onPreview,
  onDownload,
  onAccept,
  onReject,
  canReview = false,
  busy = false,
}: {
  index: number;
  doc: CompanyDoc;
  onPreview: () => void;
  onDownload: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  canReview?: boolean;
  busy?: boolean;
}) {
  const isPdf = doc.ext === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(doc.ext);
  const canOpen = Boolean(doc.previewUrl);
  const title = `${index}. ${doc.label || doc.name} *`;
  const statusLabelText =
    doc.status === "Verified"
      ? "Accepted"
      : doc.status === "Rejected"
        ? "Rejected"
        : doc.status === "Missing"
          ? "Missing"
          : doc.reuploaded
            ? "Re-uploaded · waiting"
            : "Waiting review";

  return (
    <li className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-black tabular-nums",
            doc.status === "Verified"
              ? "bg-emerald-600 text-white"
              : doc.status === "Rejected"
                ? "bg-rose-600 text-white"
                : canOpen
                  ? "bg-sky-600 text-white"
                  : isPdf
                    ? "bg-rose-50 text-rose-600"
                    : isImage
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {doc.name} · {doc.sizeLabel}
            {doc.previewUrl ? ` · ${formatDate(doc.uploadedOn)}` : ""}
          </p>
          {doc.status === "Rejected" && doc.rejectReason ? (
            <p className="mt-1 text-[11px] font-medium text-rose-700">
              Reason: {doc.rejectReason}
            </p>
          ) : null}
          {doc.reuploaded && doc.status === "Pending" ? (
            <p className="mt-1 text-[11px] font-semibold text-amber-700">
              New file uploaded — accept or reject again.
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
            doc.status === "Verified"
              ? "bg-emerald-50 text-emerald-700"
              : doc.status === "Rejected"
                ? "bg-rose-50 text-rose-700"
                : doc.status === "Missing"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
          )}
        >
          {statusLabelText}
        </span>
        <button
          type="button"
          onClick={onPreview}
          disabled={!canOpen}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
          title="Read / Preview"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!canOpen}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      {canReview && canOpen ? (
        <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={busy || doc.status === "Verified"}
            onClick={onAccept}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-40"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ) : null}
    </li>
  );
}

function CompanyAvatar({
  company,
  size = "md",
}: {
  company: CompanyRecord;
  size?: "md" | "lg";
}) {
  const meta = SECTOR_META[company.sector];
  const image = resolveReviewImage(company);
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const px = size === "lg" ? 112 : 88;
  if (image) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1.5 shadow-sm",
          box
        )}
      >
        <Image
          src={image}
          alt={`${company.name} logo`}
          width={px}
          height={px}
          quality={100}
          unoptimized={image.startsWith("/uploads/")}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500",
        box
      )}
    >
      <meta.icon className="h-5 w-5" />
    </span>
  );
}
