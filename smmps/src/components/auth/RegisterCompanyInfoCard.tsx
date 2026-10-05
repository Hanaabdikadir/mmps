"use client";

import { Building2, Beef, Droplets, Mail, MapPin, Tag, Zap } from "lucide-react";
import {
  BANADIR_DISTRICTS,
  type BanadirDistrict,
} from "@/lib/banadir-districts";
import { type CompanyRegistrationType } from "@/lib/company-registration";
import { marketInputClass } from "@/components/auth/auth-market-ui";
import { RegisterFormSelect, type RegisterFormSelectOption } from "@/components/auth/RegisterFormSelect";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type RegisterCompanyInfoValues = {
  companyName: string;
  companyType: CompanyRegistrationType | "";
  companyDistrict: BanadirDistrict | "";
  companyEmail: string;
  companyAddress: string;
};

export type CompanyInfoFieldErrors = Partial<
  Record<
    | "companyName"
    | "companyType"
    | "companyDistrict"
    | "companyEmail"
    | "companyAddress",
    string
  >
>;

type RegisterCompanyInfoCardProps = {
  values: RegisterCompanyInfoValues;
  onChange: <K extends keyof RegisterCompanyInfoValues>(
    key: K,
    value: RegisterCompanyInfoValues[K]
  ) => void;
  onBlurField?: (key: keyof RegisterCompanyInfoValues) => void;
  fieldErrors?: CompanyInfoFieldErrors;
  /** When company type was chosen in an earlier wizard step */
  hideCompanyType?: boolean;
};

const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";

const inputErrorClass =
  "border-red-300 focus:border-red-500 focus:ring-red-200 hover:border-red-300 hover:bg-red-50/20";

function FieldRow({
  label,
  htmlFor,
  icon: Icon,
  iconAlign = "center",
  showFieldIcon = true,
  fieldIconClassName,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  icon: typeof Building2;
  iconAlign?: "center" | "top";
  showFieldIcon?: boolean;
  fieldIconClassName?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  return (
    <div data-register-field={htmlFor}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        {showFieldIcon ? (
          <Icon
            className={cn(
              "pointer-events-none absolute left-3 z-[1] h-4 w-4",
              fieldIconClassName ?? "text-gray-400",
              iconAlign === "top" ? "top-3" : "top-1/2 -translate-y-1/2"
            )}
          />
        ) : null}
        {children}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RegisterCompanyInfoCard({
  values,
  onChange,
  onBlurField,
  fieldErrors,
  hideCompanyType = false,
}: RegisterCompanyInfoCardProps) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;

  const companyTypeOptions: RegisterFormSelectOption[] = [
    {
      value: "Water Supply Company",
      label: copy.waterSupplyCompany[lang],
      icon: Droplets,
      iconClassName: "text-sky-500",
    },
    {
      value: "Electricity Supply Company",
      label: copy.electricitySupplyCompany[lang],
      icon: Zap,
      iconClassName: "text-amber-500",
    },
    {
      value: "Livestock Market Company",
      label: copy.livestockMarketCompany[lang],
      icon: Beef,
      iconClassName: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-3.5">
      <FieldRow
        htmlFor="company-name"
        label={copy.companyName[lang]}
        icon={Building2}
        fieldIconClassName="text-teal-600"
        error={fieldErrors?.companyName}
      >
        <input
          id="company-name"
          required
          autoCorrect="off"
          spellCheck={false}
          placeholder={copy.companyNamePlaceholder[lang]}
          value={values.companyName}
          onChange={(e) => onChange("companyName", e.target.value)}
          onBlur={() => onBlurField?.("companyName")}
          aria-invalid={fieldErrors?.companyName ? true : undefined}
          aria-describedby={
            fieldErrors?.companyName ? "company-name-error" : undefined
          }
          className={cn(
            marketInputClass,
            fieldErrors?.companyName && inputErrorClass
          )}
        />
      </FieldRow>

      {!hideCompanyType ? (
        <FieldRow
          htmlFor="company-type"
          label={copy.companyType[lang]}
          icon={Tag}
          showFieldIcon={false}
          fieldIconClassName="text-emerald-600"
          error={fieldErrors?.companyType}
        >
          <RegisterFormSelect
            id="company-type"
            panelTitle={copy.selectCompanyTypePanel[lang]}
            placeholder={copy.selectCompanyTypePanel[lang]}
            value={values.companyType}
            invalid={Boolean(fieldErrors?.companyType)}
            onChange={(v) =>
              onChange("companyType", v as CompanyRegistrationType | "")
            }
            options={companyTypeOptions}
          />
        </FieldRow>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FieldRow
          htmlFor="company-district"
          label={copy.districtBanadir[lang]}
          icon={MapPin}
          fieldIconClassName="text-red-500"
          error={fieldErrors?.companyDistrict}
        >
          <RegisterFormSelect
            id="company-district"
            theme="district"
            showValueIconInTrigger={false}
            panelTitle={copy.districtBanadirRegion[lang]}
            placeholder={copy.selectDistrict[lang]}
            value={values.companyDistrict}
            invalid={Boolean(fieldErrors?.companyDistrict)}
            onChange={(v) => {
              // Validate via parent onChange only — do not call onBlurField here.
              // Blur would read stale React state (still "") and re-apply districtRequired.
              onChange("companyDistrict", v as BanadirDistrict | "");
            }}
            options={BANADIR_DISTRICTS.map((district) => ({
              value: district,
              label: district,
              icon: MapPin,
              iconClassName: "text-red-500",
            }))}
          />
        </FieldRow>

        <FieldRow
          htmlFor="company-email"
          label={copy.companyEmail[lang]}
          icon={Mail}
          fieldIconClassName="text-sky-600"
          error={fieldErrors?.companyEmail}
        >
          <input
            id="company-email"
            type="text"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            spellCheck={false}
            placeholder="info@company.so"
            value={values.companyEmail}
            onChange={(e) => onChange("companyEmail", e.target.value)}
            onBlur={() => onBlurField?.("companyEmail")}
            aria-invalid={fieldErrors?.companyEmail ? true : undefined}
            aria-describedby={
              fieldErrors?.companyEmail ? "company-email-error" : undefined
            }
            className={cn(
              marketInputClass,
              fieldErrors?.companyEmail && inputErrorClass
            )}
          />
        </FieldRow>
      </div>

      <FieldRow
        htmlFor="company-address"
        label={copy.companyAddress[lang]}
        icon={MapPin}
        iconAlign="top"
        fieldIconClassName="text-amber-600"
        error={fieldErrors?.companyAddress}
      >
        <textarea
          id="company-address"
          required
          rows={2}
          autoCorrect="off"
          spellCheck={false}
          placeholder={copy.companyAddressPlaceholder[lang]}
          value={values.companyAddress}
          onChange={(e) => onChange("companyAddress", e.target.value)}
          onBlur={() => onBlurField?.("companyAddress")}
          aria-invalid={fieldErrors?.companyAddress ? true : undefined}
          aria-describedby={
            fieldErrors?.companyAddress ? "company-address-error" : undefined
          }
          className={cn(
            marketInputClass,
            "min-h-[72px] resize-y py-2.5 leading-snug",
            fieldErrors?.companyAddress && inputErrorClass
          )}
        />
      </FieldRow>
    </div>
  );
}
