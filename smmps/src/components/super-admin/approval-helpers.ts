import type { CompanyRecord, CompanySector } from "@/lib/super-admin-service";
import {
  reviewDocumentSlots,
  type CompanyRegistrationSector,
} from "@/lib/registration-requirements";
import { sectorToCompanyType } from "@/lib/company-registration";
import { BANADIR_DISTRICTS } from "@/lib/banadir-districts";
import { isLivestockBrokerRegistration } from "@/lib/register-flow";
import {
  PROVIDER_SEED_DOCUMENTS,
  resolveProviderSeedSlug,
  seedDocPublicUrl,
} from "@/lib/provider-seed-documents";
import { registrationDocumentUrl } from "@/lib/registration-document-url";
import { Beef, Droplets, Zap } from "lucide-react";

export type DocStatus = "Verified" | "Pending" | "Missing" | "Rejected";
export type ReviewOverlayStatus = "CHANGES_REQUESTED" | "SUSPENDED_REVIEW";
export type DisplayStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "CHANGES_REQUESTED"
  | "SUSPENDED_REVIEW";

export type CompanyDoc = {
  id: string;
  slotId: string;
  label: string;
  name: string;
  uploadedOn: string;
  status: DocStatus;
  ext: string;
  mime: string;
  sizeLabel: string;
  /** Public path for preview / download */
  previewUrl?: string;
  /** Per-document rejection reason from Super Admin */
  rejectReason?: string | null;
  /** Applicant replaced this file and it is waiting for a new accept/reject */
  reuploaded?: boolean;
};

export const SECTOR_META: Record<
  CompanySector,
  { chip: string; icon: typeof Droplets; label: string; type: string }
> = {
  Water: {
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    icon: Droplets,
    label: "Water Company",
    type: sectorToCompanyType("water"),
  },
  Electricity: {
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    icon: Zap,
    label: "Electricity Company",
    type: sectorToCompanyType("electricity"),
  },
  Livestock: {
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    icon: Beef,
    label: "Livestock Company",
    type: sectorToCompanyType("livestock"),
  },
};

function toRegistrationSector(sector: CompanySector): CompanyRegistrationSector {
  switch (sector) {
    case "Water":
      return "water";
    case "Electricity":
      return "electricity";
    default:
      return "livestock";
  }
}

function extFromFileName(fileName: string, fallback = "pdf") {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] || fallback;
}

function mimeOf(ext: string) {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function uploadUrl(fileName: string) {
  return registrationDocumentUrl(fileName);
}

/** True only for files the applicant actually uploaded (not stock / meta / seed art). */
export function isApplicantUploadedAsset(
  src: string | null | undefined
): boolean {
  if (!src?.trim()) return false;
  const s = src.trim();
  if (s.includes("/images/livestock/")) return false;
  return (
    s.startsWith("/api/secure-files/registrations/") ||
    s.startsWith("/uploads/") ||
    s.startsWith("uploads/") ||
    // Absolute paths that still point at our upload tree
    /\/uploads\//i.test(s) ||
    /\/api\/secure-files\/registrations\//i.test(s)
  );
}

/** Company logo the applicant uploaded — never stock livestock collage / provider art. */
export function applicantCompanyLogo(
  company: CompanyRecord
): string | null {
  const docs = company.registrationDocuments ?? {};
  const fromDocs =
    docs.company_logo?.trim() ||
    docs.companyLogo?.trim() ||
    "";
  if (fromDocs && fromDocs !== "Not uploaded") {
    if (
      fromDocs.startsWith("/") ||
      fromDocs.startsWith("http://") ||
      fromDocs.startsWith("https://")
    ) {
      return isApplicantUploadedAsset(fromDocs) ? fromDocs : null;
    }
    return uploadUrl(fromDocs);
  }
  if (isApplicantUploadedAsset(company.image)) {
    return company.image!.trim();
  }
  return null;
}

/** Required registration documents — real applicant uploads only for pending review.
 * Seed / company logo fallbacks are for approved demo providers, not new applicants. */
export function docsFor(company: CompanyRecord): CompanyDoc[] {
  const slots = reviewDocumentSlots(toRegistrationSector(company.sector));
  const uploaded = company.registrationDocuments ?? {};
  const planPrice = Number(uploaded.plan_price ?? NaN);
  const isFreePlan =
    Number.isFinite(planPrice) &&
    planPrice <= 0 &&
    Boolean(uploaded.plan_id || uploaded.plan_name);
  const allowSeedFallback = company.status === "APPROVED";
  const seedSlug = allowSeedFallback
    ? resolveProviderSeedSlug(company.id, company.acronym, company.name)
    : null;
  const seedFiles = seedSlug ? PROVIDER_SEED_DOCUMENTS[seedSlug] : undefined;
  const seedBySlot = new Map(
    (seedFiles ?? []).map((f) => [f.slotId, f] as const)
  );

  return slots
    .filter((slot) => slot.id !== "payment_receipt")
    .map((slot) => {
    const storedName = uploaded[slot.id]?.trim();
    if (storedName && storedName !== "Not uploaded") {
      const ext = extFromFileName(storedName);
      return {
        id: `${company.id}-${slot.id}`,
        slotId: slot.id,
        label: slot.label,
        name: storedName,
        uploadedOn: company.registeredOn,
        status: (company.status === "APPROVED"
          ? "Verified"
          : "Pending") as DocStatus,
        ext,
        mime: mimeOf(ext),
        sizeLabel: "Uploaded",
        previewUrl: uploadUrl(storedName),
      };
    }

    const seed = seedBySlot.get(slot.id);
    if (seed && seedSlug) {
      const ext = extFromFileName(seed.fileName);
      return {
        id: `${company.id}-${slot.id}`,
        slotId: slot.id,
        label: slot.label,
        name: seed.displayName,
        uploadedOn: company.registeredOn,
        status: "Verified" as DocStatus,
        ext,
        mime: mimeOf(ext),
        sizeLabel: "On file",
        previewUrl: seedDocPublicUrl(seedSlug, seed.fileName),
      };
    }

    // Do NOT use company.image / logo as a fake "personal photo" upload.
    const fallbackExt = slot.id === "personal_photo" ? "jpg" : "pdf";
    return {
      id: `${company.id}-${slot.id}`,
      slotId: slot.id,
      label: slot.label,
      name: `${slot.label}.${fallbackExt}`,
      uploadedOn: company.registeredOn,
      status: "Missing" as DocStatus,
      ext: fallbackExt,
      mime: mimeOf(fallbackExt),
      sizeLabel: "Not uploaded",
      previewUrl: undefined,
    };
  });
}

/** True when this applicant is a livestock market broker (not a utility / livestock company). */
export function isLivestockBrokerApplicant(company: CompanyRecord): boolean {
  return isLivestockBrokerRegistration({
    contactRole: company.contactRole,
    companyType: company.companyType,
    companySector: company.sector,
  });
}

/** Banadir district from address/location when possible. */
export function districtFor(company: CompanyRecord): string {
  const stored = company.companyDistrict?.trim() || "";

  // Brokers never select a Banadir district — ignore legacy hardcoded "Hodan".
  // Company admins (water / electricity / livestock company) keep the district they chose.
  if (isLivestockBrokerApplicant(company)) {
    const hay = `${company.location ?? ""} ${company.region ?? ""} ${company.companyAddress ?? ""}`
      .toLowerCase()
      .replace(/-/g, " ");
    const fromMarket = BANADIR_DISTRICTS.find((d) => {
      const key = d.toLowerCase().replace(/-/g, " ");
      return hay.includes(key);
    });
    return fromMarket || "—";
  }

  if (
    stored &&
    stored.toLowerCase() !== "banadir" &&
    stored.toLowerCase() !== "banadir region"
  ) {
    return stored;
  }

  if (company.id === "livestock-market") {
    return "All Banadir districts";
  }

  const hay = `${company.location} ${company.region} ${company.companyAddress ?? ""} ${stored}`
    .toLowerCase()
    .replace(/-/g, " ");

  const fromText = BANADIR_DISTRICTS.find((d) => {
    const key = d.toLowerCase().replace(/-/g, " ");
    return hay.includes(key);
  });
  if (fromText) return fromText;

  if (hay.includes("beledweyne")) return "Beledweyne";
  if (hay.includes("bosaso")) return "Bosaso";
  if (hay.includes("afgooye") || hay.includes("afgoye")) return "Daynile";

  const region = company.region?.trim();
  if (region && region.toLowerCase() !== "banadir") return region;
  return "—";
}

/** Registration profile — prefers real register-form / DB fields. */
export function profileFor(company: CompanyRecord) {
  const meta = SECTOR_META[company.sector];
  const contactPerson = company.fullName?.trim() || company.email.split("@")[0] || "—";

  const registeredType = company.companyType?.trim();
  // Prefer what the applicant actually registered (incl. livestock broker types).
  // Only fall back to sector default when the field is empty.
  const companyType = registeredType || meta.type;

  return {
    contactPerson,
    companyType,
    businessCategory: meta.label,
    licenseNumber: company.companyCode,
    taxId: "—",
    registrationNumber: company.companyCode,
    description: `${company.name} registered for MMPS ${company.sector.toLowerCase()} market price reporting.`,
    ownerName: contactPerson,
    ownerRole: company.contactRole?.trim() || "Company Admin / Signatory",
    address: company.companyAddress?.trim() || company.location,
    district: districtFor(company),
    /** Public / home-page company email — not the system login email */
    companyEmail: company.companyEmail?.trim() || "—",
    country: company.companyCountry?.trim() || "Somalia",
  };
}

export function isSameDay(iso: string, ref = new Date()) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x;
}

export function statusLabel(status: DisplayStatus) {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
    case "SUSPENDED_REVIEW":
      return "Suspended";
    case "CHANGES_REQUESTED":
      return "Request Changes";
    default:
      return "Pending";
  }
}

export function statusChip(status: DisplayStatus) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-rose-300 bg-rose-50 text-rose-700";
    case "SUSPENDED":
    case "SUSPENDED_REVIEW":
      return "border-violet-400 bg-violet-100 text-violet-800";
    case "CHANGES_REQUESTED":
      return "border-amber-300 bg-amber-50 text-amber-800";
    default:
      return "border-orange-300 bg-orange-50 text-orange-700";
  }
}

/** Shared box frame for status text badges. */
export const statusBadgeBox =
  "inline-flex h-8 min-w-[5.75rem] max-w-full flex-nowrap items-center justify-center whitespace-nowrap rounded-full border px-3.5 text-center text-[12px] font-bold leading-none shadow-sm";

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
