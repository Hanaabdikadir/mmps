"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  Download,
  Eye,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
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
import {
  applicantCompanyLogo,
  docsFor,
  formatDate,
  formatDateTime,
  isApplicantUploadedAsset,
  profileFor,
  SECTOR_META,
  type CompanyDoc,
} from "@/components/super-admin/approval-helpers";
import { ApprovalDocumentViewer } from "@/components/super-admin/ApprovalDocumentViewer";

export type CompanyAdminInfo = {
  companySlug: string;
  fullName: string;
  email: string;
};

type Tab = "account" | "company" | "documents";

/** Same step layout as Pending Approvals — different palette (teal / amber / cyan). */
const TABS: {
  key: Tab;
  step: string;
  label: string;
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
    activeCircle:
      "bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-4 ring-teal-100",
    idleCircle: "bg-teal-50 text-teal-600 ring-1 ring-teal-200",
    activeLabel: "text-teal-700",
    idleLabel: "text-teal-500/80",
    connector: "bg-teal-300",
    pageBg: "bg-gradient-to-b from-teal-50/70 via-white to-white",
  },
  {
    key: "company",
    step: "02",
    label: "Company",
    activeCircle:
      "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-100",
    idleCircle: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
    activeLabel: "text-amber-700",
    idleLabel: "text-amber-500/80",
    connector: "bg-amber-300",
    pageBg: "bg-gradient-to-b from-amber-50/70 via-white to-white",
  },
  {
    key: "documents",
    step: "03",
    label: "Documents",
    activeCircle:
      "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-4 ring-cyan-100",
    idleCircle: "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200",
    activeLabel: "text-cyan-700",
    idleLabel: "text-cyan-500/80",
    connector: "bg-cyan-300",
    pageBg: "bg-gradient-to-b from-cyan-50/70 via-white to-white",
  },
];

function resolveImage(company: CompanyRecord): string | null {
  if (isApplicantUploadedAsset(company.image)) return company.image!.trim();
  // Seed Livestock Market company only
  if (
    company.id === "livestock-market" ||
    company.companySlug === "livestock-market"
  ) {
    return LIVESTOCK_MARKET_LOGO;
  }
  const slug =
    company.href?.split("/").filter(Boolean).pop() || company.id;
  if (slug === "water" || slug === "electricity" || slug === "livestock") {
    return null;
  }
  return providerMetaForSlug(slug)?.image?.trim() || null;
}

export function CompanyInfoDrawer({
  company,
  admins = [],
  onClose,
}: {
  company: CompanyRecord;
  admins?: CompanyAdminInfo[];
  priceUpdates?: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("account");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [docsMarkedReviewed, setDocsMarkedReviewed] = useState(false);

  const meta = SECTOR_META[company.sector];
  const docs = docsFor(company);
  const profile = profileFor(company);
  const uploadedCount = docs.filter((d) => d.previewUrl).length;
  const logoSrc = applicantCompanyLogo(company);
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const primaryAdmin = admins[0];
  const personName = primaryAdmin?.fullName || profile.contactPerson;
  const personEmail = primaryAdmin?.email || company.email;
  const applicantUserId = Number(company.id);
  const personPhoto = companyAdminAvatarFor({
    email: personEmail,
    fullName: personName,
    companySlug: company.companySlug,
    companyName: company.name,
    companyType: company.companyType,
    registrationDocuments: company.registrationDocuments,
    allowSectionStock: company.status === "APPROVED",
  });
  const personInitials = initialsFromName(personName, personEmail);

  async function markDocumentsReviewed() {
    if (docsMarkedReviewed) return;
    if (!Number.isInteger(applicantUserId) || applicantUserId <= 0) return;
    try {
      const res = await fetch(
        `/api/super-admin/users/${applicantUserId}/review-documents`,
        { method: "POST", cache: "no-store" }
      );
      if (res.ok) setDocsMarkedReviewed(true);
    } catch {
    }
  }

  function openDoc(i: number) {
    setViewerIndex(i);
    setViewerOpen(true);
    void markDocumentsReviewed();
  }

  useEffect(() => {
    if (tab !== "documents") return;
    void markDocumentsReviewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
                    <BadgeCheck className="h-5 w-5 shrink-0 text-teal-500" />
                  </div>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                    {company.acronym} · {meta.label}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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

          <div className="mt-5 flex w-full min-w-0 items-start">
            {TABS.map((t, i) => {
              const active = tab === t.key;
              const isLast = i === TABS.length - 1;
              return (
                <div key={t.key} className="contents">
                  <button
                    type="button"
                    onClick={() => setTab(t.key)}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold transition",
                        active ? t.activeCircle : t.idleCircle
                      )}
                    >
                      {t.step}
                    </span>
                    <span
                      className={cn(
                        "max-w-[5.5rem] truncate text-center text-[10px] font-bold uppercase tracking-[0.08em]",
                        active ? t.activeLabel : t.idleLabel
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                  {!isLast ? (
                    <div
                      className={cn(
                        "mx-2 mt-[1.125rem] h-0.5 min-w-0 flex-1 rounded-full",
                        t.connector
                      )}
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 transition-colors",
            activeTab.pageBg
          )}
        >
          {tab === "account" && (
            <SectionCard
              title="Account"
              subtitle="Company admin access · system login"
              icon={UserRound}
              tone="teal"
            >
              <div className="flex w-full flex-col">
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 px-3 py-3">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-teal-100">
                    {personPhoto ? (
                      <Image
                        src={personPhoto}
                        alt={personName}
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
                      <span className="text-sm font-black text-teal-700">
                        {personInitials}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-600">
                      Company admin
                    </p>
                    <p className="truncate text-[14px] font-bold text-slate-900">
                      {personName}
                    </p>
                  </div>
                </div>
                <Field
                  label="1. Full Name"
                  value={primaryAdmin?.fullName || profile.contactPerson}
                />
                <Field
                  label="2. Login Email"
                  value={
                    <a
                      href={`mailto:${company.email}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {company.email}
                    </a>
                  }
                />
                <Field
                  label="3. Phone Number"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      {company.phone}
                    </span>
                  }
                />
                <Field label="4. Role" value={profile.ownerRole || "Company Admin"} />
                {admins.length > 1 && (
                  <Field
                    label="5. Other Admins"
                    value={
                      <ul className="space-y-1.5">
                        {admins.slice(1).map((a) => (
                          <li key={a.email} className="text-[13px]">
                            <span className="font-semibold text-slate-900">
                              {a.fullName}
                            </span>
                            <span className="text-slate-500"> · {a.email}</span>
                          </li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </div>
            </SectionCard>
          )}

          {tab === "company" && (
            <SectionCard
              title="Company"
              subtitle="Registered company profile"
              icon={Building2}
              tone="amber"
            >
              <div className="flex w-full flex-col">
                <Field
                  label="1. Company Logo"
                  value={
                    logoSrc ? (
                      <span className="mt-1 inline-flex items-center gap-3">
                        <span className="relative h-20 w-20 overflow-hidden rounded-2xl border border-amber-100 bg-white p-2 shadow-sm">
                          <Image
                            src={logoSrc}
                            alt={`${company.name} logo`}
                            fill
                            sizes="160px"
                            quality={100}
                            className="object-contain"
                          />
                        </span>
                        <span className="text-[12px] font-medium text-teal-700">
                          On file
                        </span>
                      </span>
                    ) : (
                      "Not uploaded"
                    )
                  }
                />
                <Field label="2. Company Name" value={company.name} />
                <Field label="3. Short Name" value={company.acronym} />
                <Field label="4. Company Type" value={profile.companyType} />
                <Field
                  label="5. Sector"
                  value={
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                        meta.chip
                      )}
                    >
                      <meta.icon className="h-3 w-3" />
                      {company.sector}
                    </span>
                  }
                />
                <Field
                  label="6. Registered On"
                  value={formatDateTime(company.registeredOn)}
                />
                <Field
                  label="7. District"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      {profile.district || company.region}
                    </span>
                  }
                />
                <Field
                  label="8. Company Email"
                  value={
                    profile.companyEmail && profile.companyEmail !== "—" ? (
                      <a
                        href={`mailto:${profile.companyEmail}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {profile.companyEmail}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field label="9. Company Address" value={profile.address} />
              </div>
            </SectionCard>
          )}

          {tab === "documents" && (
            <SectionCard
              title="Documents"
              subtitle={`${uploadedCount} of ${docs.length} on file`}
              icon={FolderOpen}
              tone="cyan"
            >
              {uploadedCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    openDoc(Math.max(0, docs.findIndex((d) => d.previewUrl)))
                  }
                  className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
                >
                  <Eye className="h-4 w-4" />
                  Open document reader
                </button>
              )}
              <ul className="space-y-2.5">
                {docs.map((d, i) => (
                  <DocCard
                    key={d.id}
                    index={i + 1}
                    doc={d}
                    onPreview={() => openDoc(i)}
                    onDownload={() => downloadDoc(d)}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white px-5 py-4">
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
  tone: "teal" | "amber" | "cyan";
  children: ReactNode;
}) {
  const tones = {
    teal: {
      card: "border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-white to-white",
      icon: "bg-teal-600 text-white shadow-teal-900/15",
      title: "text-teal-950",
      sub: "text-teal-700/70",
    },
    amber: {
      card: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white",
      icon: "bg-amber-500 text-white shadow-amber-900/15",
      title: "text-amber-950",
      sub: "text-amber-700/70",
    },
    cyan: {
      card: "border-cyan-200/90 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/20",
      icon: "bg-cyan-600 text-white shadow-cyan-900/15",
      title: "text-cyan-950",
      sub: "text-cyan-700/70",
    },
  }[tone];

  return (
    <section
      className={cn(
        "flex w-full flex-1 flex-col rounded-2xl border p-5 shadow-sm",
        tones.card
      )}
    >
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
          <h3 className={cn("text-sm font-bold tracking-tight", tones.title)}>
            {title}
          </h3>
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
}: {
  index: number;
  doc: CompanyDoc;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const canOpen = Boolean(doc.previewUrl);
  const isPdf = doc.ext === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(doc.ext);
  const title = `${index}. ${doc.label || doc.name}`;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-cyan-200 hover:shadow-md">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-black tabular-nums",
          canOpen
            ? "bg-cyan-600 text-white"
            : isPdf
              ? "bg-rose-50 text-rose-600"
              : isImage
                ? "bg-teal-50 text-teal-700"
                : "bg-slate-100 text-slate-500"
        )}
      >
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {doc.name} · {doc.sizeLabel}
          {doc.previewUrl ? ` · ${formatDate(doc.uploadedOn)}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
          doc.status === "Verified"
            ? "bg-emerald-50 text-emerald-700"
            : doc.status === "Missing"
              ? "bg-rose-50 text-rose-700"
              : "bg-amber-50 text-amber-700"
        )}
      >
        {doc.status === "Verified" ? "Ready" : doc.status}
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
  const image = resolveImage(company);
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
          alt={company.acronym}
          width={px}
          height={px}
          quality={100}
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
