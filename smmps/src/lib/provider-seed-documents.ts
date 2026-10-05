/**
 * Seed registration documents from "All documents" folder,
 * served under /uploads/provider-docs/{companySlug}/.
 * Used by Pending + Companies eye drawers when a provider has no DB uploads yet.
 */

export type ProviderDocSlotFile = {
  /** registration slot id */
  slotId: string;
  /** file name under /uploads/provider-docs/{slug}/ */
  fileName: string;
  /** display name in the drawer */
  displayName: string;
};

const BASE = "/uploads/provider-docs";

/** Canonical provider slugs → document files (5 slots each). */
export const PROVIDER_SEED_DOCUMENTS: Record<string, ProviderDocSlotFile[]> = {
  bawadco: [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificate BWDC.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter BAWADCO.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Benadir wsupply.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Abdirizak Mohamed Hassan.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Abdirizak Mohamed Hassan.png",
    },
  ],
  "banadir-water": [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificate Towfiiq.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter Towfiiq.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Hamar wsupply.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Mohamed Ahmed Nur.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Mohamed Ahmed Nur.png",
    },
  ],
  wabax: [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificate WABAX.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter WABAX.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Wabax wsupply.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Yusuf Hussein Jimale.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Yusuf Hussein Jimale.png",
    },
  ],
  beco: [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificates BECO.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter BECO.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Beco Electricity.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Abdirahman Hassan Yusuf.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Abdirahman Hassan Yusuf.png",
    },
  ],
  "mogadishu-power-supply": [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificates MPS.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter MPS.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Mogadishu Electricity.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Mohamed Abdi Ibrahim.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Mohamed Abdi Ibrahim.png",
    },
  ],
  "blue-sky-energy": [
    {
      slotId: "business_license",
      fileName: "business_license.pdf",
      displayName: "Business registration certificates BSE.pdf",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter BSE.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax Reg Blue sky Electricity.png",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Ismail Abdi Omar.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Ismail Abdi Omar.png",
    },
  ],
  "livestock-market": [
    {
      slotId: "business_license",
      fileName: "sector_license.pdf",
      displayName: "Business registration certificate.pdf",
    },
    {
      slotId: "tax_certificate",
      fileName: "tax_certificate.png",
      displayName: "Tax livestock.png",
    },
    {
      slotId: "official_letter",
      fileName: "official_letter.pdf",
      displayName: "Official authorization letter LIVESTOCK.pdf",
    },
    {
      slotId: "id_passport",
      fileName: "id_passport.png",
      displayName: "Ahmed Nur Ali.png",
    },
    {
      slotId: "personal_photo",
      fileName: "personal_photo.png",
      displayName: "Ahmed Nur Ali.png",
    },
  ],
};

/** Resolve seed docs for a company id / slug / acronym. */
export function resolveProviderSeedSlug(
  companyId: string,
  acronym?: string,
  name?: string
): string | null {
  const id = companyId.trim().toLowerCase();
  if (PROVIDER_SEED_DOCUMENTS[id]) return id;

  // Pending / alias ids: bawadco-pending, beco-pending, hawdco-pending, …
  const bare = id
    .replace(/-pending$/i, "")
    .replace(/-rejected$/i, "")
    .replace(/^registration-/i, "");
  if (PROVIDER_SEED_DOCUMENTS[bare]) return bare;
  if (bare === "hawdco" || bare === "hamar-water") return "banadir-water";
  if (bare === "mps" || bare === "banadir-power") return "mogadishu-power-supply";
  if (bare === "bse" || bare === "blue-sky") return "blue-sky-energy";
  if (bare === "livestock" || bare === "jubba-livestock") return "livestock-market";

  const acronymKey = (acronym ?? "").trim().toUpperCase();
  const nameKey = (name ?? "").trim().toLowerCase();

  if (acronymKey === "BAWADCO" || acronymKey === "BWDC" || nameKey.includes("bawadco"))
    return "bawadco";
  if (
    acronymKey === "HAWDCO" ||
    acronymKey === "HWDC" ||
    nameKey.includes("hawdco") ||
    nameKey.includes("hamar water")
  )
    return "banadir-water";
  if (acronymKey === "WABAX" || acronymKey === "WWSC" || nameKey.includes("wabax"))
    return "wabax";
  if (acronymKey === "BECO" || nameKey.includes("beco")) return "beco";
  if (
    acronymKey === "MPS" ||
    nameKey.includes("mogadishu power") ||
    id.includes("mogadishu-power")
  )
    return "mogadishu-power-supply";
  if (
    acronymKey === "BSE" ||
    acronymKey === "BLUE SKY" ||
    nameKey.includes("blue sky") ||
    id.includes("blue-sky")
  )
    return "blue-sky-energy";
  if (
    id === "livestock-market" ||
    acronymKey === "LIVESTOCK CO" ||
    nameKey.includes("livestock")
  )
    return "livestock-market";

  return null;
}

export function seedDocPublicUrl(slug: string, fileName: string) {
  return `${BASE}/${slug}/${fileName}`;
}
