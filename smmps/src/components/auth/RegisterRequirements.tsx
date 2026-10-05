"use client";

import { useId, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Beef,
  Building2,
  Check,
  CheckCircle2,
  Droplets,
  FileText,
  FileUp,
  ScrollText,
  Trash2,
  UserCircle,
  Camera,
  Zap,
  CreditCard,
} from "lucide-react";
import type {
  CompanyRegistrationSector,
  RegistrationDocumentId,
  RegistrationDocumentSlot,
} from "@/lib/registration-requirements";
import {
  COMPANY_LOGO_SUMMARY_LABEL,
  requiredDocumentSlots,
  SECTOR_REGISTRATION_META,
  SECTOR_REGISTRATION_ORDER,
} from "@/lib/registration-requirements";
import { SYSTEM_SECTORS_TAGLINE, SYSTEM_SECTORS_TAGLINE_EN } from "@/lib/home-content";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export { CompanyLogoUpload } from "@/components/auth/CompanyLogoUpload";

const DOCUMENT_ICONS: Record<RegistrationDocumentId, LucideIcon> = {
  business_license: Building2,
  tax_certificate: FileText,
  sector_license: ScrollText,
  official_letter: ScrollText,
  id_passport: UserCircle,
  personal_photo: Camera,
  payment_receipt: CreditCard,
};

type DocumentIconStyle = {
  bg: string;
  icon: string;
  uploadedBg: string;
  progressFill: string;
  pillDone: string;
  pillPending: string;
  pillNumber: string;
  /** Card border when a file is uploaded */
  cardBorderUploaded: string;
  fileBox: string;
};

const DOCUMENT_ICON_STYLE: Record<RegistrationDocumentId, DocumentIconStyle> = {
  business_license: {
    bg: "bg-teal-50",
    icon: "text-teal-600",
    uploadedBg: "bg-teal-100",
    progressFill: "bg-teal-500",
    pillDone: "bg-teal-600 text-white",
    pillPending: "bg-teal-50/95 text-teal-900 ring-1 ring-teal-200/90",
    pillNumber: "bg-teal-100 text-teal-800",
    cardBorderUploaded: "border-teal-500 ring-1 ring-teal-200/80",
    fileBox: "border-teal-200 bg-teal-50/80",
  },
  official_letter: {
    bg: "bg-violet-50",
    icon: "text-violet-600",
    uploadedBg: "bg-violet-100",
    progressFill: "bg-violet-500",
    pillDone: "bg-violet-600 text-white",
    pillPending: "bg-violet-50/95 text-violet-900 ring-1 ring-violet-200/90",
    pillNumber: "bg-violet-100 text-violet-800",
    cardBorderUploaded: "border-violet-500 ring-1 ring-violet-200/80",
    fileBox: "border-violet-200 bg-violet-50/80",
  },
  tax_certificate: {
    bg: "bg-sky-50",
    icon: "text-sky-600",
    uploadedBg: "bg-sky-100",
    progressFill: "bg-sky-500",
    pillDone: "bg-sky-600 text-white",
    pillPending: "bg-sky-50/95 text-sky-900 ring-1 ring-sky-200/90",
    pillNumber: "bg-sky-100 text-sky-800",
    cardBorderUploaded: "border-sky-500 ring-1 ring-sky-200/80",
    fileBox: "border-sky-200 bg-sky-50/80",
  },
  id_passport: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    uploadedBg: "bg-indigo-100",
    progressFill: "bg-indigo-500",
    pillDone: "bg-indigo-600 text-white",
    pillPending: "bg-indigo-50/95 text-indigo-900 ring-1 ring-indigo-200/90",
    pillNumber: "bg-indigo-100 text-indigo-800",
    cardBorderUploaded: "border-indigo-500 ring-1 ring-indigo-200/80",
    fileBox: "border-indigo-200 bg-indigo-50/80",
  },
  personal_photo: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    uploadedBg: "bg-amber-100",
    progressFill: "bg-amber-500",
    pillDone: "bg-amber-600 text-white",
    pillPending: "bg-amber-50/95 text-amber-950 ring-1 ring-amber-200/90",
    pillNumber: "bg-amber-100 text-amber-900",
    cardBorderUploaded: "border-amber-500 ring-1 ring-amber-200/80",
    fileBox: "border-amber-200 bg-amber-50/80",
  },
  sector_license: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    uploadedBg: "bg-emerald-100",
    progressFill: "bg-emerald-500",
    pillDone: "bg-emerald-600 text-white",
    pillPending: "bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-200/90",
    pillNumber: "bg-emerald-100 text-emerald-800",
    cardBorderUploaded: "border-emerald-500 ring-1 ring-emerald-200/80",
    fileBox: "border-emerald-200 bg-emerald-50/80",
  },
  payment_receipt: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    uploadedBg: "bg-emerald-100",
    progressFill: "bg-emerald-500",
    pillDone: "bg-emerald-600 text-white",
    pillPending: "bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-200/90",
    pillNumber: "bg-emerald-100 text-emerald-800",
    cardBorderUploaded: "border-emerald-500 ring-1 ring-emerald-200/80",
    fileBox: "border-emerald-200 bg-emerald-50/80",
  },
};

const SECTOR_LICENSE_ICON_STYLE: Record<CompanyRegistrationSector, DocumentIconStyle> = {
  water: {
    bg: "bg-blue-50",
    icon: "text-[#0084FF]",
    uploadedBg: "bg-blue-100",
    progressFill: "bg-[#0084FF]",
    pillDone: "bg-[#0084FF] text-white",
    pillPending: "bg-blue-50/95 text-blue-900 ring-1 ring-blue-200/90",
    pillNumber: "bg-blue-100 text-blue-800",
    cardBorderUploaded: "border-[#0084FF] ring-1 ring-blue-200/80",
    fileBox: "border-blue-200 bg-blue-50/80",
  },
  electricity: {
    bg: "bg-orange-50",
    icon: "text-[#FF8000]",
    uploadedBg: "bg-orange-100",
    progressFill: "bg-[#FF8000]",
    pillDone: "bg-[#FF8000] text-white",
    pillPending: "bg-orange-50/95 text-orange-950 ring-1 ring-orange-200/90",
    pillNumber: "bg-orange-100 text-orange-900",
    cardBorderUploaded: "border-[#FF8000] ring-1 ring-orange-200/80",
    fileBox: "border-orange-200 bg-orange-50/80",
  },
  livestock: {
    bg: "bg-green-50",
    icon: "text-[#00A84E]",
    uploadedBg: "bg-green-100",
    progressFill: "bg-[#00A84E]",
    pillDone: "bg-[#00A84E] text-white",
    pillPending: "bg-green-50/95 text-green-900 ring-1 ring-green-200/90",
    pillNumber: "bg-green-100 text-green-800",
    cardBorderUploaded: "border-[#00A84E] ring-1 ring-green-200/80",
    fileBox: "border-green-200 bg-green-50/80",
  },
};

export function documentIconStyle(
  id: RegistrationDocumentId,
  sector?: CompanyRegistrationSector
): DocumentIconStyle {
  if (id === "sector_license" && sector) {
    return SECTOR_LICENSE_ICON_STYLE[sector];
  }
  return DOCUMENT_ICON_STYLE[id];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SECTOR_ACTIVE_RING: Record<CompanyRegistrationSector, string> = {
  water: "ring-2 ring-[#0084FF]/30 border-[#0084FF]",
  electricity: "ring-2 ring-[#FF8000]/30 border-[#FF8000]",
  livestock: "ring-2 ring-[#00A84E]/30 border-[#00A84E]",
};

const SECTOR_PANEL_RING: Record<CompanyRegistrationSector, string> = {
  water: "ring-2 ring-[#0084FF]/20",
  electricity: "ring-2 ring-[#FF8000]/20",
  livestock: "ring-2 ring-[#00A84E]/20",
};

const sectorIcons = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
} as const;

function SectorDocumentChecklist({
  sector,
  headingClassName = "mt-3 text-xs font-semibold text-gray-800",
}: {
  sector: CompanyRegistrationSector;
  headingClassName?: string;
}) {
  const { lang, t } = useLang();
  const copy = TRANSLATIONS.register;
  const slots = requiredDocumentSlots(sector);

  return (
    <>
      <p className={headingClassName}>
        {copy.requiredUploads[lang]}
      </p>
      <ul className="mt-2 space-y-2">
        {slots.map((slot) => {
          const style = documentIconStyle(slot.id, sector);
          const label = t(slot.label, slot.labelSo ?? slot.label);
          return (
            <li
              key={slot.id}
              className="flex items-start gap-2 text-[11px] leading-snug text-gray-700 sm:text-xs"
            >
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  style.progressFill
                )}
                aria-hidden
              />
              <span className="min-w-0 font-medium text-gray-800">{label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function RegistrationRequirementsByCompanyType({
  activeSector,
  compact,
}: {
  activeSector?: CompanyRegistrationSector;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  function sectorTitle(id: CompanyRegistrationSector) {
    if (id === "water") return copy.sectorWaterLabel[lang];
    if (id === "electricity") return copy.sectorElectricityLabel[lang];
    return copy.sectorLivestockLabel[lang];
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            {copy.companyRegRequirements[lang]}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {copy.uploadDocsAccess[lang]}
          </p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {SECTOR_REGISTRATION_ORDER.map((id) => {
          const meta = SECTOR_REGISTRATION_META[id];
          const Icon = sectorIcons[id];
          const active = activeSector === id;
          return (
            <div
              key={id}
              className={cn(
                "rounded-xl border p-3 transition",
                active
                  ? cn(SECTOR_ACTIVE_RING[id], meta.bgClass)
                  : "border-2 border-emerald-200 bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", meta.headerClass)}>
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <p className={cn("text-xs font-bold uppercase tracking-wide", active ? meta.accentClass : "text-gray-800")}>
                  {sectorTitle(id)}
                </p>
              </div>
              <SectorDocumentChecklist
                sector={id}
                headingClassName="mt-2.5 text-[10px] font-semibold text-gray-700"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SectorRequirementsPanel({ sector }: { sector: CompanyRegistrationSector }) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const meta = SECTOR_REGISTRATION_META[sector];
  const Icon = sectorIcons[sector];
  const sectorTitle =
    sector === "water"
      ? copy.sectorWaterLabel[lang]
      : sector === "electricity"
        ? copy.sectorElectricityLabel[lang]
        : copy.sectorLivestockLabel[lang];
  const subtitle = lang === "so" ? (meta.subtitleSo ?? meta.subtitle) : meta.subtitle;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border p-4",
          meta.borderClass,
          meta.bgClass,
          SECTOR_PANEL_RING[sector]
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-white",
              meta.headerClass
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-wide", meta.accentClass)}>
              {sectorTitle}
            </p>
            <p className="text-[11px] text-gray-600">{subtitle}</p>
          </div>
        </div>
        <SectorDocumentChecklist sector={sector} />
      </div>
      <p className="rounded-xl border-2 border-dashed border-emerald-200 bg-gray-50/90 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
        {copy.uploadMatchingDocs[lang]}
      </p>
    </div>
  );
}

export function CompanyInfoRequirementsHint() {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const tagline = lang === "so" ? SYSTEM_SECTORS_TAGLINE : SYSTEM_SECTORS_TAGLINE_EN;
  return (
    <p className="text-xs leading-relaxed text-gray-500">
      {copy.pickSectorHint[lang]} ({tagline}).
    </p>
  );
}

export function SectorPreviewTiles({
  selected,
  onSelect,
}: {
  selected?: CompanyRegistrationSector;
  onSelect?: (sector: CompanyRegistrationSector) => void;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  return (
    <div
      className="flex w-full gap-2 sm:gap-3"
      role="tablist"
      aria-label={copy.primarySector[lang]}
    >
      {SECTOR_REGISTRATION_ORDER.map((id) => {
        const meta = SECTOR_REGISTRATION_META[id];
        const Icon = sectorIcons[id];
        const active = selected === id;
        const Tag = onSelect ? "button" : "div";
        const subtitle = lang === "so" ? (meta.subtitleSo ?? meta.subtitle) : meta.subtitle;
        return (
          <Tag
            key={id}
            type={onSelect ? "button" : undefined}
            role={onSelect ? "tab" : undefined}
            aria-selected={onSelect ? active : undefined}
            onClick={onSelect ? () => onSelect(id) : undefined}
            className={cn(
              "min-w-0 flex-1 rounded-xl border p-3 text-left transition",
              active
                ? cn("ring-offset-1", SECTOR_ACTIVE_RING[id], meta.bgClass)
                : "border-2 border-emerald-200 bg-gray-50/80 hover:border-emerald-300 hover:bg-white",
              onSelect &&
              "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-white",
                meta.headerClass
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <p className={cn("mt-2 text-sm font-bold", active ? meta.accentClass : "text-gray-800")}>
              {meta.somali}
            </p>
            <p className="text-[11px] leading-snug text-gray-500">{subtitle}</p>
          </Tag>
        );
      })}
    </div>
  );
}

function DocumentUploadCard({
  slot,
  file,
  sector,
  sectorIcon: SectorIcon,
  onChange,
  error,
}: {
  slot: RegistrationDocumentSlot;
  file: File | null;
  sector?: CompanyRegistrationSector;
  sectorIcon?: LucideIcon;
  onChange: (file: File | null) => void;
  error?: string;
}) {
  const { lang, t } = useLang();
  const copy = TRANSLATIONS.register;
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const DefaultIcon = DOCUMENT_ICONS[slot.id];
  const Icon = slot.id === "sector_license" && SectorIcon ? SectorIcon : DefaultIcon;
  const uploaded = Boolean(file);
  const iconStyle = documentIconStyle(slot.id, sector);
  const label = t(slot.label, slot.labelSo ?? slot.label);
  const description = slot.description
    ? t(slot.description, slot.descriptionSo ?? slot.description)
    : "";
  const formatsHint = slot.formatsHint ?? copy.fileHintDocs[lang];
  const zoneDomId = `register-doc-${slot.id}`;
  const errorId = error ? `${zoneDomId}-error` : undefined;

  return (
    <div
      id={zoneDomId}
      data-register-field={`doc_${slot.id}`}
      className={cn(
        "flex h-full flex-col rounded-xl border bg-white p-3 transition sm:p-3.5",
        error
          ? "border-red-300 ring-1 ring-red-100"
          : uploaded
            ? iconStyle.cardBorderUploaded
            : "border-emerald-200"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            uploaded ? iconStyle.uploadedBg : iconStyle.bg,
            iconStyle.icon
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="mt-2 text-xs font-bold leading-snug text-gray-900 sm:min-h-[2.5rem] sm:text-[13px]">
          {label}
          {slot.required ? <span className="text-red-500"> *</span> : null}
          {!slot.required ? (
            <span className="ml-1 text-[10px] font-semibold text-gray-400">
              ({copy.optional[lang]})
            </span>
          ) : null}
        </p>
        {description ? (
          <p className="mt-1 text-[11px] leading-snug text-gray-500 sm:min-h-[2rem]">
            {description}
          </p>
        ) : null}
        <p className="mt-1.5 shrink-0 text-[9px] font-medium uppercase tracking-wide text-gray-400">
          {formatsHint}
        </p>
      </div>

      <div className="mt-auto w-full shrink-0 space-y-2 pt-3">
        {uploaded && file ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-2 py-1.5",
              iconStyle.fileBox
            )}
          >
            <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", iconStyle.icon)} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <p className="break-all text-xs font-semibold leading-snug text-gray-800">
                {file.name}
              </p>
              <span className="text-[10px] font-medium text-gray-500">
                {formatFileSize(file.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
              aria-label={copy.removeFile[lang]}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={slot.accept ?? ".pdf,.png,.jpg,.jpeg,.webp"}
          className="hidden"
          tabIndex={-1}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            if (picked) onChange(picked);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition sm:text-sm",
            uploaded
              ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              : "border-slate-400 bg-white text-slate-800 hover:bg-slate-50"
          )}
        >
          <FileUp className={cn("h-3.5 w-3.5", iconStyle.icon)} />
          {uploaded ? copy.replace[lang] : copy.upload[lang]}
        </button>
        {error ? (
          <p id={errorId} className="text-left text-[11px] font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ApplicationProgressCard({
  uploadedCount,
  total,
  progress,
  slots,
  documents,
  sector,
  companyLogoUploaded = false,
}: {
  uploadedCount: number;
  total: number;
  progress: number;
  slots: RegistrationDocumentSlot[];
  documents: Partial<Record<RegistrationDocumentId, File | null>>;
  sector?: CompanyRegistrationSector;
  companyLogoUploaded?: boolean;
}) {
  const { lang, t } = useLang();
  const copy = TRANSLATIONS.register;
  const complete = progress >= 100;
  const logoOnly = slots.length === 0;
  const progressItems = logoOnly
    ? [
      {
        key: "company_logo",
        label: t(COMPANY_LOGO_SUMMARY_LABEL, copy.companyLogo.so),
        done: companyLogoUploaded,
        style: {
          progressFill: "bg-amber-500",
          pillDone: "bg-amber-600 text-white",
          pillPending: "bg-amber-50/95 text-amber-950 ring-1 ring-amber-200/90",
          pillNumber: "bg-amber-100 text-amber-900",
          cardBorderUploaded: "border-amber-500 ring-1 ring-amber-200/80",
          fileBox: "border-amber-200 bg-amber-50/80",
          bg: "bg-amber-50",
          icon: "text-amber-600",
          uploadedBg: "bg-amber-100",
        },
      },
    ]
    : slots.map((slot) => ({
      key: slot.id,
      label: t(slot.label, slot.labelSo ?? slot.label),
      done: Boolean(documents[slot.id]),
      style: documentIconStyle(slot.id, sector),
    }));
  const sectorChrome =
    sector === "water"
      ? {
        card: "border-blue-200/80 bg-gradient-to-br from-[#f8fafc] via-white to-blue-50/40 ring-1 ring-blue-100/60",
        glow: "radial-gradient(circle at 12% 8%, rgba(0,132,255,0.14), transparent 42%), radial-gradient(circle at 88% 92%, rgba(14,165,233,0.1), transparent 40%)",
        pct: "bg-gradient-to-r from-blue-600 via-sky-600 to-[#0084FF] bg-clip-text text-transparent",
      }
      : sector === "electricity"
        ? {
          card: "border-orange-200/80 bg-gradient-to-br from-[#f8fafc] via-white to-orange-50/40 ring-1 ring-orange-100/60",
          glow: "radial-gradient(circle at 12% 8%, rgba(255,128,0,0.14), transparent 42%), radial-gradient(circle at 88% 92%, rgba(245,158,11,0.1), transparent 40%)",
          pct: "bg-gradient-to-r from-orange-600 via-amber-600 to-[#FF8000] bg-clip-text text-transparent",
        }
        : sector === "livestock"
          ? {
            card: "border-green-200/80 bg-gradient-to-br from-[#f8fafc] via-white to-green-50/40 ring-1 ring-green-100/60",
            glow: "radial-gradient(circle at 12% 8%, rgba(0,168,78,0.14), transparent 42%), radial-gradient(circle at 88% 92%, rgba(16,185,129,0.1), transparent 40%)",
            pct: "bg-gradient-to-r from-emerald-600 via-[#00A84E] to-teal-600 bg-clip-text text-transparent",
          }
          : {
            card: "border-slate-200/80 bg-gradient-to-br from-[#f8fafc] via-white to-slate-50/40 ring-1 ring-slate-100/60",
            glow: "radial-gradient(circle at 12% 8%, rgba(100,116,139,0.12), transparent 42%), radial-gradient(circle at 88% 92%, rgba(148,163,184,0.1), transparent 40%)",
            pct: "bg-gradient-to-r from-teal-600 via-emerald-600 to-slate-600 bg-clip-text text-transparent",
          };

  return (
    <section
      className={cn(
        "relative mt-1 overflow-hidden rounded-2xl border p-4 sm:p-5",
        sectorChrome.card
      )}
      aria-label={copy.applicationProgress[lang]}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: sectorChrome.glow,
        }}
        aria-hidden
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-700">
            {copy.applicationProgress[lang]}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{uploadedCount}</span>
            <span className="text-gray-500"> {copy.of[lang]} </span>
            <span className="font-semibold text-gray-900">{total}</span>
            <span className="text-gray-500">
              {" "}
              {logoOnly ? copy.requiredUpload[lang] : copy.documentsUploaded[lang]}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              complete ? sectorChrome.pct : "text-gray-900"
            )}
          >
            {progress}%
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {copy.complete[lang]}
          </p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex h-3.5 gap-1 overflow-hidden rounded-full bg-gray-200/70 p-0.5 shadow-inner">
          {progressItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "min-w-[6%] flex-1 rounded-full transition-[background-color,opacity] duration-500 ease-out motion-reduce:transition-none",
                item.done ? item.style.progressFill : "bg-gray-300/50"
              )}
              title={item.label}
            />
          ))}
        </div>
      </div>

      <ul className="relative mt-5 flex flex-wrap gap-2">
        {progressItems.map((item) => (
          <li key={item.key}>
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                item.done ? item.style.pillDone : item.style.pillPending
              )}
            >
              {item.done ? (
                <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-current/30",
                    item.style.icon
                  )}
                  aria-hidden
                />
              )}
              <span className="truncate">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RegistrationDocumentsStep({
  sector,
  documents,
  onDocumentChange,
  companyLogoUploaded = false,
  documentErrors,
  documentsRequired = true,
  personalPhotoOptional = false,
}: {
  sector: CompanyRegistrationSector;
  documents: Partial<Record<RegistrationDocumentId, File | null>>;
  onDocumentChange: (id: RegistrationDocumentId, file: File | null) => void;
  companyLogoUploaded?: boolean;
  documentErrors?: Partial<Record<RegistrationDocumentId, string>>;
  /** When false, cards show as optional (no asterisk). Defaults to true. */
  documentsRequired?: boolean;
  personalPhotoOptional?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const slots = requiredDocumentSlots(sector).map((slot) => ({
    ...slot,
    required:
      slot.id === "personal_photo" && personalPhotoOptional
        ? false
        : documentsRequired,
  }));
  const meta = SECTOR_REGISTRATION_META[sector];
  const SectorIcon = sectorIcons[sector];
  const slotIds = slots.map((s) => s.id);
  const uploadedCount = slotIds.filter((id) => documents[id]).length;
  const total = slotIds.length;
  const progress = total === 0 ? 0 : Math.round((uploadedCount / total) * 100);
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          meta.borderClass,
          meta.bgClass
        )}
      >
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.16em]", meta.accentClass)}>
          {copy.uploadDocs[lang]}
        </p>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-gray-600">
          {copy.uploadDocsForSector[lang]}
        </p>
      </div>

      {slots.length > 0 ? (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
          {slots.map((slot) => (
            <DocumentUploadCard
              key={slot.id}
              slot={slot}
              file={documents[slot.id] ?? null}
              sector={sector}
              sectorIcon={SectorIcon}
              onChange={(f) => onDocumentChange(slot.id, f)}
              error={documentErrors?.[slot.id]}
            />
          ))}
        </div>
      ) : null}

      <ApplicationProgressCard
        uploadedCount={uploadedCount}
        total={total}
        progress={progress}
        slots={slots}
        documents={documents}
        sector={sector}
        companyLogoUploaded={companyLogoUploaded}
      />
    </div>
  );
}
