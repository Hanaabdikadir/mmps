"use client";

import { AlertCircle, Building2, Check, CheckCircle2 } from "lucide-react";
import type { RegisterCompanyInfoValues } from "@/components/auth/RegisterCompanyInfoCard";
import {
  companyDetailDisplayValue,
  companyDetailsProgress,
  isCompanyDetailStepComplete,
  REGISTER_COMPANY_DETAIL_STEPS,
} from "@/lib/register-company-steps";
import {
  isCompanyRegistrationSector,
  requiredDocumentSlots,
  SECTOR_REGISTRATION_META,
  type CompanyRegistrationSector,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export function RegisterHeroCompanyPanel({
  values,
  companySector = "",
}: {
  values: RegisterCompanyInfoValues;
  companySector?: string;
}) {
  const { lang, t } = useLang();
  const copy = TRANSLATIONS.register;
  const heroValues = {
    companyName: values.companyName,
    companyType: values.companyType,
    companyDistrict: values.companyDistrict,
    companyEmail: values.companyEmail,
    companyAddress: values.companyAddress,
  };
  const { completed, total, percent } = companyDetailsProgress(heroValues);
  const sector = isCompanyRegistrationSector(companySector) ? companySector : null;
  const sectorMeta = sector ? SECTOR_REGISTRATION_META[sector] : null;

  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-5">
      <div className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
          {copy.companyDetails[lang]}
        </p>
        <p className="mt-1.5 text-xs font-medium leading-snug text-emerald-50/95 sm:text-sm">
          {copy.completeFiveFields[lang]}
          {sectorMeta ? (
            <>
              {" "}
              {copy.forWord[lang]}{" "}
              <span className={cn("font-extrabold", sectorMeta.accentClass)}>
                {sectorMeta.somali}
              </span>
            </>
          ) : null}{" "}
          {copy.registrationWord[lang]}.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2 min-[320px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {REGISTER_COMPANY_DETAIL_STEPS.map((item) => {
          const done = isCompanyDetailStepComplete(item, heroValues);
          const display = companyDetailDisplayValue(item, heroValues);
          const hint = t(item.placeholder, item.placeholderSo);
          return (
            <li
              key={item.step}
              className={cn(
                "rounded-lg border px-2.5 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5",
                item.fullWidth && "col-span-2 lg:col-span-1 xl:col-span-2",
                done
                  ? "border-emerald-300/40 bg-emerald-950/25"
                  : "border-white/12 bg-black/15"
              )}
            >
              <div className="flex gap-2">
                <span
                  className={cn(
                    "w-4 shrink-0 text-right text-sm font-extrabold tabular-nums",
                    item.heroNumberClass
                  )}
                >
                  {item.step}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-snug text-white sm:text-xs">
                    <StableBilingual en={item.label} so={item.labelSo} lang={lang} />
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-emerald-100/75">
                    <StableBilingual
                      en={item.description}
                      so={item.descriptionSo}
                      lang={lang}
                      multiline
                    />
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 truncate text-[10px] font-semibold sm:text-[11px]",
                      display ? "text-emerald-100" : "text-white/40 italic"
                    )}
                    title={display || hint}
                  >
                    {display || hint}
                  </p>
                </div>
                {done ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={2.5} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-amber-200/30 bg-amber-950/20 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
          <p className="text-[10px] leading-relaxed text-amber-50/90 sm:text-[11px]">
            <span className="font-bold text-amber-100">
              <StableBilingual en={copy.tip.en} so={copy.tip.so} lang={lang} />
            </span>{" "}
            {copy.companyTypeTip[lang]}
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border border-white/15 bg-black/20 p-3.5 backdrop-blur-sm sm:p-4"
        aria-label={copy.detailsProgress[lang]}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/90">
              {copy.detailsProgress[lang]}
            </p>
            <p className="mt-1 text-xs text-emerald-100/90">
              <span className="font-bold text-white">{completed}</span> {copy.of[lang]}{" "}
              <span className="font-bold text-white">{total}</span> {copy.fieldsCompleted[lang]}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums leading-none text-amber-200">{percent}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15 p-px">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(percent, percent > 0 ? 6 : 0)}%` }}
          />
        </div>
      </section>

      <div className="rounded-xl border border-white/12 bg-black/15 p-3.5 backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/90 text-white shadow-md">
            <Building2 className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200/95">
              {copy.companyDetailsSummary[lang]}
            </p>
            <ul className="mt-2 space-y-1.5">
              {REGISTER_COMPANY_DETAIL_STEPS.map((item) => {
                const done = isCompanyDetailStepComplete(item, heroValues);
                const display = companyDetailDisplayValue(item, heroValues);
                return (
                  <li key={item.step} className="flex items-start gap-2 text-[11px] text-emerald-50/95">
                    <CheckCircle2
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        done ? "text-emerald-300" : "text-white/25"
                      )}
                    />
                    <span className="min-w-0">
                      <span className="font-semibold">
                        <StableBilingual en={item.label} so={item.labelSo} lang={lang} />:
                      </span>{" "}
                      <span className={display ? "text-emerald-100" : "text-white/45"}>
                        {display || "—"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterHeroDocumentsPanel({
  sector,
  documents = {},
  compact,
  companyLogoUploaded = false,
}: {
  sector: CompanyRegistrationSector;
  documents?: Partial<Record<RegistrationDocumentId, File | null>>;
  compact?: boolean;
  companyLogoUploaded?: boolean;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const slots = requiredDocumentSlots(sector);
  const meta = SECTOR_REGISTRATION_META[sector];
  const summaryItems = [
    ...slots.map((slot) => ({
      key: slot.id,
      labelEn: slot.label,
      labelSo: slot.labelSo ?? slot.label,
      descriptionEn: slot.description,
      descriptionSo: slot.descriptionSo ?? slot.description,
      done: Boolean(documents[slot.id]),
    })),
  ];
  const uploadedCount = summaryItems.filter((item) => item.done).length;
  const total = summaryItems.length;
  const progress = total === 0 ? 0 : Math.round((uploadedCount / total) * 100);

  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-5">
      <div className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
          {copy.uploadDocs[lang]}
        </p>
        <p className="mt-1.5 text-xs font-medium leading-snug text-emerald-50/95 sm:text-sm">
          {copy.uploadDocsForSector[lang]}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {summaryItems.map((item) => (
          <li
            key={item.key}
            className={cn(
              "rounded-lg border px-3 py-2.5 backdrop-blur-sm",
              item.done
                ? "border-emerald-300/40 bg-emerald-950/25"
                : "border-white/12 bg-black/15"
            )}
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-snug text-white sm:text-[13px]">
                  <StableBilingual en={item.labelEn} so={item.labelSo} lang={lang} />
                  <span className="text-red-300" aria-hidden>
                    {" "}
                    *
                  </span>
                </p>
                {!compact && item.descriptionEn ? (
                  <p className="mt-0.5 text-[10px] leading-snug text-emerald-100/75 sm:text-[11px]">
                    <StableBilingual
                      en={item.descriptionEn}
                      so={item.descriptionSo ?? item.descriptionEn}
                      lang={lang}
                      multiline
                    />
                  </p>
                ) : null}
              </div>
              {item.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2.5} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section
        className="rounded-xl border border-white/15 bg-black/20 p-3.5 backdrop-blur-sm sm:p-4"
        aria-label={copy.applicationProgress[lang]}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/90">
              {copy.applicationProgress[lang]}
            </p>
            <p className="mt-1 text-xs text-emerald-100/90">
              <span className="font-bold text-white">{uploadedCount}</span> {copy.of[lang]}{" "}
              <span className="font-bold text-white">{total}</span> {copy.documentsUploaded[lang]}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums leading-none text-amber-200">{progress}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15 p-px">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(progress, progress > 0 ? 6 : 0)}%` }}
          />
        </div>
      </section>
    </div>
  );
}
