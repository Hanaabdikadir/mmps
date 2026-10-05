export type CompanyRegistrationSector = "water" | "electricity" | "livestock";

export type RegistrationDocumentId =
  | "business_license"
  | "tax_certificate"
  | "sector_license"
  | "official_letter"
  | "id_passport"
  | "personal_photo"
  | "payment_receipt";

export interface RegistrationRequirementItem {
  id: string;
  title: string;
  detail?: string;
}

export interface RegistrationDocumentSlot {
  id: RegistrationDocumentId;
  label: string;
  /** Somali label for register UI (EN/SO toggle). */
  labelSo?: string;
  description?: string;
  descriptionSo?: string;
  required: boolean;
  accept?: string;
  formatsHint?: string;
}

export interface SectorRegistrationMeta {
  id: CompanyRegistrationSector;
  title: string;
  somali: string;
  subtitle: string;
  subtitleSo?: string;
  accentClass: string;
  headerClass: string;
  borderClass: string;
  bgClass: string;
}

/** Xoolaha → Korontada → Biyaha */
export const SECTOR_REGISTRATION_ORDER: CompanyRegistrationSector[] = [
  "livestock",
  "electricity",
  "water",
];

/** Applies to every company registration (Super Admin review checklist). */
export const COMMON_COMPANY_REQUIREMENTS: RegistrationRequirementItem[] = [
  {
    id: "banadir",
    title: "Operate in Banadir (Mogadishu)",
    detail: "Company or trader serves markets, providers, or customers in the Mogadishu area.",
  },
  {
    id: "contact",
    title: "Authorized contact person",
    detail: "Account holder must match a director, manager, or official company representative.",
  },
  {
    id: "business",
    title: "Valid business registration",
    detail: "Legal business name and registration documents on file.",
  },
  {
    id: "sector-license",
    title: "Sector operating license",
    detail: "Water utility, electricity supply, or livestock market / trading permit as applicable.",
  },
  {
    id: "data",
    title: "Commitment to verified prices",
    detail: "Submit accurate sector prices and updates for Super Admin review before public display.",
  },
  {
    id: "approval",
    title: "Super Admin approval",
    detail: "Dashboard access is granted only after document review and account approval.",
  },
];

export const SECTOR_REGISTRATION_META: Record<
  CompanyRegistrationSector,
  SectorRegistrationMeta
> = {
  livestock: {
    id: "livestock",
    title: "Livestock (Xoolaha)",
    somali: "Xoolaha",
    subtitle: "Livestock Markets · Live Mogadishu Prices",
    subtitleSo: "Suuqyada Xoolaha · Qiimaha Muqdisho Tooska ah",
    accentClass: "text-[#00A84E]",
    headerClass: "bg-gradient-to-r from-[#00A84E] to-emerald-600",
    borderClass: "border-emerald-200",
    bgClass: "bg-emerald-50/60",
  },
  electricity: {
    id: "electricity",
    title: "Electricity (Korontada)",
    somali: "Korontada",
    subtitle: "Electricity Utilities · Live Mogadishu Prices",
    subtitleSo: "Adeegyada Korontada · Qiimaha Muqdisho Tooska ah",
    accentClass: "text-[#FF8000]",
    headerClass: "bg-gradient-to-r from-[#FF8000] to-amber-500",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50/60",
  },
  water: {
    id: "water",
    title: "Water supply (Biyaha)",
    somali: "Biyaha",
    subtitle: "Water Utilities · Live Mogadishu Prices",
    subtitleSo: "Adeegyada Biyaha · Qiimaha Muqdisho Tooska ah",
    accentClass: "text-[#0084FF]",
    headerClass: "bg-gradient-to-r from-[#0084FF] to-sky-600",
    borderClass: "border-sky-200",
    bgClass: "bg-sky-50/60",
  },
};

export const WATER_SECTOR_REQUIREMENTS: RegistrationRequirementItem[] = [
  {
    id: "water-license",
    title: "Water supply license",
    detail: "Issued by the relevant municipal or utility authority in Banadir.",
  },
  {
    id: "water-source",
    title: "Documented water source",
    detail: "Borehole, well, river intake, or treated plant.",
  },
  {
    id: "water-coverage",
    title: "Service coverage area",
    detail: "Districts or neighborhoods served (e.g. Hodan, Wadajir, Karan).",
  },
  {
    id: "water-quality",
    title: "Water quality or compliance record",
    detail: "Recent test report or compliance statement where available.",
  },
  {
    id: "water-prices",
    title: "Price categories for MMPS",
    detail: "Household and commercial rates aligned with platform water modules.",
  },
  {
    id: "water-profile",
    title: "Provider profile & contacts",
    detail: "Company description, hotline, and billing contact for verification.",
  },
];

export const ELECTRICITY_SECTOR_REQUIREMENTS: RegistrationRequirementItem[] = [
  {
    id: "elec-license",
    title: "Electricity generation or supply license",
    detail: "Permit for generation, mini-grid, or distribution in Mogadishu.",
  },
  {
    id: "elec-type",
    title: "Supply technology",
    detail: "Solar, diesel, hybrid, or grid-linked — as reported on MMPS provider pages.",
  },
  {
    id: "elec-coverage",
    title: "Coverage & customer segments",
    detail: "Areas served and residential vs commercial customer mix.",
  },
  {
    id: "elec-capacity",
    title: "Installed capacity",
    detail: "Total kW or MW available for the served network.",
  },
  {
    id: "elec-prices",
    title: "Price structure (per kWh)",
    detail: "Residential, commercial, and any tiered rates for live price reporting.",
  },
  {
    id: "elec-profile",
    title: "Provider profile & contacts",
    detail: "Company details for public provider listings and admin verification.",
  },
];

export const LIVESTOCK_SECTOR_REQUIREMENTS: RegistrationRequirementItem[] = [
  {
    id: "live-license",
    title: "Livestock market or trading license",
    detail: "Permit to trade or operate within recognized Mogadishu livestock markets.",
  },
  {
    id: "live-location",
    title: "Primary market or trading location",
    detail: "Main market, abattoir link, or trading point used for price collection.",
  },
  {
    id: "live-categories",
    title: "Livestock categories covered",
    detail: "Geelka (camels), Loda (cattle), Arriga (goats & sheep), and other types reported.",
  },
  {
    id: "live-association",
    title: "Association or cooperative registration",
    detail: "Required when registering on behalf of a group; optional for sole traders.",
  },
  {
    id: "live-health",
    title: "Veterinary / health compliance",
    detail: "Statement or certificate showing animals meet market health requirements.",
  },
  {
    id: "live-prices",
    title: "Reference & live price reporting",
    detail: "Ability to submit MMPS reference prices and daily market updates.",
  },
];

/**
 * Same required uploads for water, electricity, and livestock company registration.
 * Company logo is collected separately via {@link REGISTRATION_COMPANY_LOGO_FIELD}.
 */
export const SHARED_SECTOR_DOCUMENTS: RegistrationDocumentSlot[] = [
  {
    id: "business_license",
    label: "Business registration certificate",
    labelSo: "Shahaadada diiwaangelinta ganacsiga",
    description: "Valid business registration from authorities",
    descriptionSo: "Diiwaangelin ganacsi oo sax ah oo ka timid maamulka",
    required: true,
  },
  {
    id: "id_passport",
    label: "ID / passport",
    labelSo: "Aqoonsi / baasaboor",
    description: "Clear copy of identification document",
    descriptionSo: "Nuqul cad oo aqoonsiga",
    required: true,
  },
  {
    id: "personal_photo",
    label: "Personal photo",
    labelSo: "Sawir shakhsiyeed",
    description: "Recent passport-style personal photo",
    descriptionSo: "Sawir cusub oo nooca baasaboorka ah",
    required: true,
  },
  {
    id: "payment_receipt",
    label: "Payment method",
    labelSo: "Habka lacag-bixinta",
    description: "Choose EVC Plus or MasterCard when selecting a paid plan (no screenshot)",
    descriptionSo: "Dooro EVC Plus ama MasterCard markaad doorato qidmad lacag leh (screenshot lama baahna)",
    required: false,
    accept: "image/*,.pdf",
    formatsHint: "Optional — payment method is chosen on the plan step",
  },
];

/** @deprecated Use {@link SHARED_SECTOR_DOCUMENTS} — kept for admin review imports. */
export const UTILITY_SECTOR_REVIEW_DOCUMENTS: RegistrationDocumentSlot[] =
  SHARED_SECTOR_DOCUMENTS;

/** Label for company logo (separate from document slots). */
export const COMPANY_LOGO_SUMMARY_LABEL = "Company logo";

export function isCompanyRegistrationSector(
  value: string
): value is CompanyRegistrationSector {
  return value === "water" || value === "electricity" || value === "livestock";
}

export function sectorRequirements(
  sector: CompanyRegistrationSector
): RegistrationRequirementItem[] {
  switch (sector) {
    case "water":
      return WATER_SECTOR_REQUIREMENTS;
    case "electricity":
      return ELECTRICITY_SECTOR_REQUIREMENTS;
    case "livestock":
      return LIVESTOCK_SECTOR_REQUIREMENTS;
  }
}

export function requiredDocumentSlots(
  sector: CompanyRegistrationSector
): RegistrationDocumentSlot[] {
  void sector;
  return SHARED_SECTOR_DOCUMENTS.filter((d) => d.required);
}

/** Slots shown in Super Admin review drawers (same required set for all sectors). */
export function reviewDocumentSlots(
  sector: CompanyRegistrationSector
): RegistrationDocumentSlot[] {
  void sector;
  // Screenshot payment slot removed — method is shown on the plan review card.
  return SHARED_SECTOR_DOCUMENTS.filter((d) => d.id !== "payment_receipt");
}

export function requiredDocumentIds(sector: CompanyRegistrationSector): RegistrationDocumentId[] {
  return requiredDocumentSlots(sector)
    .filter((d) => d.required)
    .map((d) => d.id);
}

/** Short lists shown under “document requirements by company type” (register UI). */
export const SECTOR_COMPANY_DOCUMENT_LISTS: Record<CompanyRegistrationSector, string[]> = {
  water: SHARED_SECTOR_DOCUMENTS.filter((d) => d.required).map((d) => d.label),
  electricity: SHARED_SECTOR_DOCUMENTS.filter((d) => d.required).map((d) => d.label),
  livestock: SHARED_SECTOR_DOCUMENTS.filter((d) => d.required).map((d) => d.label),
};

export const REQUIRED_DOCUMENTS_SUMMARY = [
  "Company registration certificate",
  "Sector operating license (Xoolaha / Korontada / Biyaha)",
  "National ID or passport copy",
  "Payment receipt screenshot (EVC 0619643334)",
  COMPANY_LOGO_SUMMARY_LABEL,
] as const;

export const REGISTRATION_DOCUMENT_FORM_PREFIX = "document_";
export const REGISTRATION_COMPANY_LOGO_FIELD = "companyLogo";
