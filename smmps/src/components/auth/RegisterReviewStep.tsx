"use client";

import { AlertCircle, Building2, CheckCircle2, CreditCard, FolderCheck, User } from "lucide-react";
import { documentIconStyle } from "@/components/auth/RegisterRequirements";
import {
  isCompanyRegistrationSector,
  requiredDocumentSlots,
  SECTOR_REGISTRATION_META,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import type { RegisterCompanyInfoValues } from "@/components/auth/RegisterCompanyInfoCard";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type ReviewSectionTheme = {
  card: string;
  headerIcon: string;
  icon: string;
  title: string;
  label: string;
  rowBorder: string;
  value: string;
};

const ACCOUNT_REVIEW_THEME: ReviewSectionTheme = {
  card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-white to-white ring-1 ring-emerald-100/80",
  headerIcon: "bg-emerald-600 text-white",
  icon: "text-white",
  title: "text-emerald-950",
  label: "text-emerald-800",
  rowBorder: "border-emerald-100/90",
  value: "text-gray-900",
};

const COMPANY_REVIEW_THEME: ReviewSectionTheme = {
  card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-white to-white ring-1 ring-emerald-100/80",
  headerIcon: "bg-emerald-600 text-white",
  icon: "text-white",
  title: "text-emerald-950",
  label: "text-emerald-800",
  rowBorder: "border-emerald-100/90",
  value: "text-gray-900",
};

const DOCUMENTS_REVIEW_FALLBACK: ReviewSectionTheme = {
  card: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white ring-1 ring-amber-100/80",
  headerIcon: "bg-emerald-600 text-white",
  icon: "text-white",
  title: "text-teal-950",
  label: "text-emerald-800",
  rowBorder: "border-amber-100/90",
  value: "text-gray-900",
};

const DOCUMENTS_REVIEW_BY_SECTOR: Record<
  "water" | "electricity" | "livestock",
  ReviewSectionTheme
> = {
  water: {
    card: "border-teal-200/90 bg-gradient-to-br from-teal-50/95 via-white to-white ring-1 ring-teal-100/80",
    headerIcon: "bg-teal-600 text-white",
    icon: "text-white",
    title: "text-teal-950",
    label: "text-teal-800",
    rowBorder: "border-teal-100/90",
    value: "text-gray-900",
  },
  electricity: {
    card: "border-orange-200/90 bg-gradient-to-br from-orange-50/95 via-white to-white ring-1 ring-orange-100/80",
    headerIcon: "bg-[#FF8000] text-white",
    icon: "text-white",
    title: "text-orange-950",
    label: "text-orange-800",
    rowBorder: "border-orange-100/90",
    value: "text-gray-900",
  },
  livestock: {
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-white ring-1 ring-amber-100/80",
    headerIcon: "bg-[#d97706] text-white",
    icon: "text-white",
    title: "text-amber-950",
    label: "text-amber-800",
    rowBorder: "border-amber-100/90",
    value: "text-gray-900",
  },
};

function SummaryBlock({
  title,
  icon: Icon,
  theme,
  children,
}: {
  title: string;
  icon: typeof User;
  theme: ReviewSectionTheme;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4", theme.card)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            theme.headerIcon
          )}
        >
          <Icon className={cn("h-4 w-4", theme.icon)} strokeWidth={2.25} />
        </span>
        <h3 className={cn("text-sm font-bold tracking-tight", theme.title)}>{title}</h3>
      </div>
      <dl className="text-sm">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReviewSectionTheme;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(6.25rem,8rem)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b py-2.5 last:border-0 last:pb-0 first:pt-0",
        theme.rowBorder
      )}
    >
      <dt className={cn("text-[11px] font-bold uppercase tracking-wide sm:text-xs", theme.label)}>
        {label}
      </dt>
      <dd className={cn("text-sm font-semibold leading-snug", theme.value)}>{value || "—"}</dd>
    </div>
  );
}

export function RegisterReviewStep({
  fullName,
  email,
  phone,
  companyInfo,
  companySector,
  companyLogoName,
  documents,
}: {
  fullName: string;
  email: string;
  phone: string;
  companyInfo: RegisterCompanyInfoValues;
  companySector: string;
  companyLogoName: string | null;
  documents: Partial<Record<RegistrationDocumentId, File | null>>;
}) {
  const { lang, t } = useLang();
  const copy = TRANSLATIONS.register;
  const sector = isCompanyRegistrationSector(companySector) ? companySector : null;
  const sectorMeta = sector ? SECTOR_REGISTRATION_META[sector] : null;
  const slots = sector ? requiredDocumentSlots(sector) : [];
  const documentsTheme = sector
    ? DOCUMENTS_REVIEW_BY_SECTOR[sector]
    : DOCUMENTS_REVIEW_FALLBACK;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-900">
          {copy.reviewAndSubmit[lang]}
        </p>
        <div className="mt-2 flex gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p className="text-sm leading-relaxed text-amber-950">
            <span className="font-bold">{copy.beforeYouSubmit[lang]}</span>{" "}
            {copy.beforeYouSubmitBlurb[lang]}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200/90 bg-sky-50/95 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
            <CreditCard className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-900">
              {copy.subscriptionNoticeTitle[lang]}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-sky-950">
              {sector === "livestock"
                ? copy.subscriptionNoticeBroker[lang]
                : copy.subscriptionNoticeCompany[lang]}
            </p>
          </div>
        </div>
      </div>

      <SummaryBlock title={copy.reviewAccount[lang]} icon={User} theme={ACCOUNT_REVIEW_THEME}>
        <Row theme={ACCOUNT_REVIEW_THEME} label={copy.reviewName[lang]} value={fullName.trim()} />
        <Row theme={ACCOUNT_REVIEW_THEME} label={copy.email[lang]} value={email.trim()} />
        <Row
          theme={ACCOUNT_REVIEW_THEME}
          label={copy.reviewPhone[lang]}
          value={phone.trim() || copy.notProvided[lang]}
        />
      </SummaryBlock>

      <SummaryBlock title={copy.reviewCompany[lang]} icon={Building2} theme={COMPANY_REVIEW_THEME}>
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewName[lang]}
          value={companyInfo.companyName.trim()}
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewType[lang]}
          value={
            companyInfo.companyType === "Water Supply Company"
              ? copy.waterSupplyCompany[lang]
              : companyInfo.companyType === "Electricity Supply Company"
                ? copy.electricitySupplyCompany[lang]
                : companyInfo.companyType === "Livestock Market Company"
                  ? copy.livestockMarketCompany[lang]
                  : companyInfo.companyType
          }
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewDistrict[lang]}
          value={companyInfo.companyDistrict}
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.email[lang]}
          value={companyInfo.companyEmail.trim()}
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewAddress[lang]}
          value={companyInfo.companyAddress.trim()}
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewSector[lang]}
          value={sectorMeta ? `${sectorMeta.somali} (${companySector})` : companySector}
        />
        <Row
          theme={COMPANY_REVIEW_THEME}
          label={copy.reviewLogo[lang]}
          value={companyLogoName ?? copy.notUploaded[lang]}
        />
      </SummaryBlock>

      {slots.length > 0 ? (
        <div className={cn("rounded-xl border p-4", documentsTheme.card)}>
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                documentsTheme.headerIcon
              )}
            >
              <FolderCheck className="h-4 w-4 text-white" strokeWidth={2.25} />
            </span>
            <h3 className={cn("text-sm font-bold tracking-tight", documentsTheme.title)}>
              {copy.reviewDocuments[lang]}
            </h3>
          </div>
          <ul className="space-y-2">
            {slots.map((slot) => {
              const file = documents[slot.id];
              const ok = Boolean(file);
              const style = documentIconStyle(slot.id, sector ?? undefined);
              return (
                <li
                  key={slot.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ring-1",
                    ok
                      ? cn(style.bg, "text-gray-900 ring-black/[0.05]")
                      : "bg-red-50 text-red-800 ring-red-100"
                  )}
                >
                  <CheckCircle2
                    className={cn("h-4 w-4 shrink-0", ok ? style.icon : "text-red-400")}
                  />
                  <span className="min-w-0 flex-1 font-semibold">
                    {t(slot.label, slot.labelSo ?? slot.label)}
                  </span>
                  <span className={cn("truncate text-xs font-medium", ok ? "text-gray-600" : "text-red-700")}>
                    {file?.name ?? copy.missing[lang]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
