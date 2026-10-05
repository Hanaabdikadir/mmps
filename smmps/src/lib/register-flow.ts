/** Progressive registration wizard — matches the MMPS register flowchart. */

import { isCompanyRegistrationType } from "@/lib/company-registration";

export type RegistrationKind = "company" | "broker";

export type UtilityCompanyType =
  | "Water Supply Company"
  | "Electricity Supply Company";

export type LivestockMarketSection =
  | "Camel Market Section"
  | "Cattle Market Section"
  | "Goat Market Section";

export const UTILITY_COMPANY_TYPES = [
  "Water Supply Company",
  "Electricity Supply Company",
] as const satisfies readonly UtilityCompanyType[];

export const LIVESTOCK_MARKET_SECTIONS = [
  "Camel Market Section",
  "Cattle Market Section",
  "Goat Market Section",
] as const satisfies readonly LivestockMarketSection[];

export function utilityTypeToSector(
  type: UtilityCompanyType
): "water" | "electricity" {
  return type === "Water Supply Company" ? "water" : "electricity";
}

/**
 * True for livestock market broker registrations — not utility / livestock
 * market company admins.
 */
export function isLivestockBrokerRegistration(opts: {
  contactRole?: string | null;
  companyType?: string | null;
  companySector?: string | null;
  role?: string | null;
}): boolean {
  const roleName = (opts.role || "").toUpperCase();
  if (roleName === "LIVESTOCK_BROKER_USER") {
    return true;
  }
  if (roleName === "COMPANY_ADMIN") {
    return false;
  }

  const contact = (opts.contactRole || "").toLowerCase();
  if (contact.includes("company admin") || contact.includes("signatory")) {
    return false;
  }
  if (contact.includes("broker")) return true;

  const type = (opts.companyType || "").trim();
  if (type && isCompanyRegistrationType(type)) return false;

  const typeL = type.toLowerCase();
  if (
    typeL.includes("market section") ||
    /\b(camel|cattle|goat|geel|loda|arri)\b/i.test(type)
  ) {
    return true;
  }

  return false;
}

export function isUtilityCompanyType(value: string): value is UtilityCompanyType {
  return (UTILITY_COMPANY_TYPES as readonly string[]).includes(value);
}

export const ALL_LIVESTOCK_TYPES = "__all__";

export function parseLivestockTypeChoices(
  section: string | null | undefined
): string[] {
  const raw = `${section || ""}`.trim();
  if (!raw) return [];
  if (raw === ALL_LIVESTOCK_TYPES) return [ALL_LIVESTOCK_TYPES];
  return [...new Set(raw.split(/[|,]/).map((part) => part.trim()).filter(Boolean))];
}

export function serializeLivestockTypeChoices(ids: string[]): string {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.includes(ALL_LIVESTOCK_TYPES)) return ALL_LIVESTOCK_TYPES;
  return unique.join("|");
}

export function livestockChoiceIdFromCatalogSlug(slug: string): string {
  if (slug === "geel") return "Camel Market Section";
  if (slug === "loda") return "Cattle Market Section";
  if (slug === "arri") return "Goat Market Section";
  return slug;
}

export function isLivestockMarketSection(
  value: string
): value is LivestockMarketSection {
  if ((LIVESTOCK_MARKET_SECTIONS as readonly string[]).includes(value)) return true;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 48;
}

export function livestockSpeciesLabel(
  ...values: Array<string | null | undefined>
): "Camel" | "Cattle" | "Goat" | null {
  for (const value of values) {
    const hay = (value || "").toUpperCase();
    if (!hay) continue;
    const camel = hay.includes("CAMEL") || hay.includes("GEEL");
    const cattle = hay.includes("CATTLE") || hay.includes("LODA");
    const goat =
      hay.includes("GOAT") ||
      hay.includes("SHEEP") ||
      hay.includes("ARRI") ||
      hay.includes("ARRIGA");
    const hits = [camel, cattle, goat].filter(Boolean).length;
    if (hits !== 1) continue;
    if (camel) return "Camel";
    if (cattle) return "Cattle";
    return "Goat";
  }
  return null;
}

export function livestockSectionTitle(
  species: "Camel" | "Cattle" | "Goat" | null | undefined
): "Camels" | "Cattle" | "Goats" | null {
  if (species === "Camel") return "Camels";
  if (species === "Cattle") return "Cattle";
  if (species === "Goat") return "Goats";
  return null;
}

function shortLivestockTypeName(part: string): string {
  if (part === ALL_LIVESTOCK_TYPES) return "ALL";
  const title = livestockSectionTitle(livestockSpeciesLabel(part));
  if (title) return title;
  const slug = part.trim();
  if (slug === "geel") return "Camels";
  if (slug === "loda") return "Cattle";
  if (slug === "arri") return "Goats";
  return slug.replace(/\s+market section$/i, "").trim() || slug;
}

export function formatBrokerManagedAccounts(opts: {
  rawTypes?: string | null;
  assigned?: { slug: string; name: string; nameSomali?: string | null }[] | null;
  catalogCount?: number;
}): string | null {
  const assigned = opts.assigned?.filter(Boolean) ?? [];
  if (assigned.length) {
    if (opts.catalogCount && opts.catalogCount > 1 && assigned.length >= opts.catalogCount) {
      return "ALL";
    }
    const names = assigned.map((c) => {
      if (c.slug === "geel") return "Camels";
      if (c.slug === "loda") return "Cattle";
      if (c.slug === "arri") return "Goats";
      return (c.nameSomali || c.name || c.slug).trim();
    });
    return names.join(" · ");
  }

  const parts = parseLivestockTypeChoices(opts.rawTypes);
  if (!parts.length) return null;
  // Never treat utility / livestock *company* registration types as broker sections.
  if (parts.length === 1 && isCompanyRegistrationType(parts[0]!)) return null;
  if (parts.includes(ALL_LIVESTOCK_TYPES)) return "ALL";
  if (opts.catalogCount && opts.catalogCount > 1 && parts.length >= opts.catalogCount) {
    return "ALL";
  }
  return parts.map(shortLivestockTypeName).join(" · ");
}

export function brokerDisplayName(
  fullName: string,
  _section: string
): string {
  return fullName.trim();
}

export const REGISTER_WIZARD_STEPS = [
  {
    code: "01",
    shortLabel: "ACCOUNT",
    titleKey: "registrationForm" as const,
  },
  {
    code: "02",
    shortLabel: "TYPE",
    titleKey: "typeSelect" as const,
  },
  {
    code: "03",
    shortLabel: "DETAILS",
    titleKey: "details" as const,
  },
] as const;
