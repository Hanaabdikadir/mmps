import { normalizeBanadirDistrict } from "@/lib/banadir-districts";
import { isBlockedCompanyEmailDomain, isValidRegisterEmail } from "@/lib/email";
import type { CompanyRegistrationSector } from "@/lib/registration-requirements";

export const REGISTRATION_COMPANY_COUNTRY = "Somalia" as const;

/** MMPS sector company types (registration step). */
export const COMPANY_REGISTRATION_TYPES = [
  "Water Supply Company",
  "Electricity Supply Company",
  "Livestock Market Company",
] as const;

export type CompanyRegistrationType = (typeof COMPANY_REGISTRATION_TYPES)[number];

const COMPANY_TYPE_SECTOR: Record<CompanyRegistrationType, CompanyRegistrationSector> = {
  "Water Supply Company": "water",
  "Electricity Supply Company": "electricity",
  "Livestock Market Company": "livestock",
};

const SECTOR_COMPANY_TYPE: Record<CompanyRegistrationSector, CompanyRegistrationType> = {
  water: "Water Supply Company",
  electricity: "Electricity Supply Company",
  livestock: "Livestock Market Company",
};

export function companyTypeToSector(
  type: string
): CompanyRegistrationSector | null {
  if (!isCompanyRegistrationType(type)) return null;
  return COMPANY_TYPE_SECTOR[type];
}

export function sectorToCompanyType(
  sector: CompanyRegistrationSector
): CompanyRegistrationType {
  return SECTOR_COMPANY_TYPE[sector];
}

export function formatRegisteredCompanyLocation(
  district: string,
  address: string
): string {
  const street = address.trim();
  const d = district.trim();
  return `${street}, ${d} District, Banadir Region, ${REGISTRATION_COMPANY_COUNTRY}`;
}

export function isCompanyRegistrationType(value: string): value is CompanyRegistrationType {
  return (COMPANY_REGISTRATION_TYPES as readonly string[]).includes(value);
}

export type CompanyInfoFieldError =
  | "companyTypeRequired"
  | "districtRequired"
  | "companyAddressRequired"
  | "companyAddressTooShort"
  | "companyEmailRequired"
  | "companyEmailInvalid"
  | "companyEmailGmail"
  | "companyNameRequired"
  | "companyNameTooShort";

const COMPANY_INFO_ERROR_EN: Record<CompanyInfoFieldError, string> = {
  companyTypeRequired: "Please select a company type.",
  districtRequired: "Please select a Banadir district.",
  companyAddressRequired: "Company address is required.",
  companyAddressTooShort: "Company address must be at least 5 characters.",
  companyEmailRequired: "Company email address is required.",
  companyEmailInvalid: "Enter a valid company email like name@gmail.com",
  companyEmailGmail:
    "Company email cannot use @gmail.com — use your company domain.",
  companyNameRequired: "Company name is required.",
  companyNameTooShort: "Company name must be at least 2 characters.",
};

/** English message for API / server responses. */
export function companyInfoFieldErrorMessage(code: CompanyInfoFieldError): string {
  return COMPANY_INFO_ERROR_EN[code];
}

const COMPANY_NAME_MIN = 2;
const COMPANY_ADDRESS_MIN = 5;

export function validateCompanyInfoFields(input: {
  companyType?: string;
  companyName?: string;
  companyDistrict?: string;
  companyAddress?: string;
  companyEmail?: string;
}): CompanyInfoFieldError | null {
  if (!input.companyType?.trim() || !isCompanyRegistrationType(input.companyType.trim())) {
    return "companyTypeRequired";
  }
  if (input.companyName !== undefined) {
    const name = input.companyName.trim();
    if (!name) return "companyNameRequired";
    if (name.length < COMPANY_NAME_MIN) return "companyNameTooShort";
  }
  if (!input.companyDistrict?.trim() || !normalizeBanadirDistrict(input.companyDistrict.trim())) {
    return "districtRequired";
  }
  const address = input.companyAddress?.trim() ?? "";
  if (!address) {
    return "companyAddressRequired";
  }
  if (address.length < COMPANY_ADDRESS_MIN) {
    return "companyAddressTooShort";
  }
  const email = input.companyEmail?.trim();
  if (!email) {
    return "companyEmailRequired";
  }
  if (!isValidRegisterEmail(email)) {
    return "companyEmailInvalid";
  }
  if (isBlockedCompanyEmailDomain(email)) {
    return "companyEmailGmail";
  }
  return null;
}
