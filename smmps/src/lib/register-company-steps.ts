export type RegisterCompanyDetailValueKey =
  | "companyName"
  | "companyType"
  | "companyDistrict"
  | "companyEmail"
  | "companyAddress";

/** Labels, colors, and copy for company-detail fields (register form + hero). */
export const REGISTER_COMPANY_DETAIL_STEPS = [
  {
    step: 1,
    label: "Company name",
    labelSo: "Magaca shirkadda",
    description: "Legal name as on business license",
    descriptionSo: "Magaca sharciga ah sida ku qoran shatiyaha ganacsiga",
    placeholder: "Legal name as on business license",
    placeholderSo: "Magaca sharciga ah sida ku qoran shatiyaha ganacsiga",
    valueKey: "companyName" as const,
    formNumberClass: "text-blue-700",
    heroNumberClass: "text-amber-200",
    fullWidth: false,
  },
  {
    step: 2,
    label: "Company type",
    labelSo: "Nooca shirkadda",
    description: "Water supply, electricity supply, or livestock market company",
    descriptionSo: "Shirkadda biyaha, korontada, ama suuqa xoolaha",
    placeholder: "Select company type",
    placeholderSo: "Dooro nooca shirkadda",
    valueKey: "companyType" as const,
    formNumberClass: "text-violet-700",
    heroNumberClass: "text-violet-200",
    fullWidth: false,
  },
  {
    step: 3,
    label: "District (Banadir)",
    labelSo: "Degmada (Banaadir)",
    description: "Select your district within Banadir Region",
    descriptionSo: "Dooro degmadaada ee Gobolka Banaadir",
    placeholder: "Select district",
    placeholderSo: "Dooro degmada",
    valueKey: "companyDistrict" as const,
    formNumberClass: "text-red-600",
    heroNumberClass: "text-red-300",
    fullWidth: false,
  },
  {
    step: 4,
    label: "Company email",
    labelSo: "Iimaylka shirkadda",
    description: "Official company contact email for MMPS",
    descriptionSo: "Iimaylka xiriirka rasmiga ah ee shirkadda ee MMPS",
    placeholder: "info@company.so",
    placeholderSo: "info@company.so",
    valueKey: "companyEmail" as const,
    formNumberClass: "text-indigo-700",
    heroNumberClass: "text-indigo-200",
    fullWidth: false,
  },
  {
    step: 5,
    label: "Company address",
    labelSo: "Cinwaanka shirkadda",
    description: "Street, building, market, or landmark in your district",
    descriptionSo: "Waddada, dhismaha, suuqa, ama calaamada ee degmadaada",
    placeholder: "Street, building, market, or landmark",
    placeholderSo: "Waddada, dhismaha, suuqa, ama calaamada",
    valueKey: "companyAddress" as const,
    formNumberClass: "text-amber-700",
    heroNumberClass: "text-amber-200",
    fullWidth: true,
  },
] as const;

export function formatRegisterCompanyDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function companyDetailDisplayValue(
  step: (typeof REGISTER_COMPANY_DETAIL_STEPS)[number],
  values: Record<RegisterCompanyDetailValueKey, string>
): string {
  if ("staticValue" in step && step.staticValue) return step.staticValue as string;
  if (!("valueKey" in step) || !step.valueKey) return "";
  return values[step.valueKey]?.trim() ?? "";
}

export function isCompanyDetailStepComplete(
  step: (typeof REGISTER_COMPANY_DETAIL_STEPS)[number],
  values: Record<RegisterCompanyDetailValueKey, string>
): boolean {
  if ("staticValue" in step && step.staticValue) return true;
  if (!("valueKey" in step) || !step.valueKey) return false;
  return Boolean(values[step.valueKey]?.trim());
}

export function companyDetailsProgress(values: Record<RegisterCompanyDetailValueKey, string>): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = REGISTER_COMPANY_DETAIL_STEPS.length;
  const completed = REGISTER_COMPANY_DETAIL_STEPS.filter((s) =>
    isCompanyDetailStepComplete(s, values)
  ).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
