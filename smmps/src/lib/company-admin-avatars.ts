import { registrationDocumentUrl } from "@/lib/registration-document-url";

/**
 * Personal photos for company admins across dashboards / drawers.
 * Seeded seven providers + name/email match + slug fallback + new-user upload.
 */

export const COMPANY_ADMIN_AVATARS: Record<string, string> = {
  // Water — match company admin full names
  "admin@bawadco.so": "/images/admins/yusuf-hussein-jimale.png",
  "admin@hawdco.so": "/images/admins/abdirizak-mohamed-hassan.png",
  "admin@wabax.so": "/images/admins/mohamed-ahmed-nur.png",
  // Electricity
  "admin@beco.so": "/images/admins/mohamed-abdi-ibrahim.png",
  "admin@mps.so": "/images/admins/ismail-abdi-omar.png",
  "admin@blueskyenergy.so": "/images/admins/abdirahman-hassan-yusuf.png",
  // Livestock — market admin (person) + section brokers (animal photos)
  "admin@livestock.so": "/images/admins/ahmed-nur-ali.png",
  "goat@livestock.so": "/images/livestock/goat.jpg",
  "cattle@livestock.so": "/images/livestock/loda-cattle.jpg",
  "camel@livestock.so": "/images/livestock/camel.jpg",
};

const AVATAR_BY_NAME: Record<string, string> = {
  "abdirizak mohamed hassan": "/images/admins/abdirizak-mohamed-hassan.png",
  "ahmed nur ali": "/images/admins/ahmed-nur-ali.png",
  "abdirahman hassan yusuf": "/images/admins/abdirahman-hassan-yusuf.png",
  "ismail abdi omar": "/images/admins/ismail-abdi-omar.png",
  "mohamed abdi ibrahim": "/images/admins/mohamed-abdi-ibrahim.png",
  "yusuf hussein jimale": "/images/admins/yusuf-hussein-jimale.png",
  "mohamed ahmed nur": "/images/admins/mohamed-ahmed-nur.png",
  goat: "/images/livestock/goat.jpg",
  cattle: "/images/livestock/loda-cattle.jpg",
  camel: "/images/livestock/camel.jpg",
};

/** Company slug → personal photo fallback (seed / All documents). */
const AVATAR_BY_SLUG: Record<string, string> = {
  bawadco: "/images/admins/yusuf-hussein-jimale.png",
  hawdco: "/images/admins/abdirizak-mohamed-hassan.png",
  "banadir-water": "/images/admins/abdirizak-mohamed-hassan.png",
  wabax: "/images/admins/mohamed-ahmed-nur.png",
  beco: "/images/admins/mohamed-abdi-ibrahim.png",
  mps: "/images/admins/ismail-abdi-omar.png",
  "mogadishu-power-supply": "/images/admins/ismail-abdi-omar.png",
  blueskyenergy: "/images/admins/abdirahman-hassan-yusuf.png",
  "blue-sky-energy": "/images/admins/abdirahman-hassan-yusuf.png",
  livestock: "/images/admins/ahmed-nur-ali.png",
  "livestock-market": "/images/admins/ahmed-nur-ali.png",
};

/** Extra CSS object-position for portraits that need face framing. */
const AVATAR_OBJECT_POSITION: Record<string, string> = {
  "/images/admins/mohamed-ahmed-nur.png": "center 18%",
  "/images/livestock/goat.jpg": "center 35%",
  "/images/livestock/loda-cattle.jpg": "28% 62%",
  "/images/livestock/camel.jpg": "center 32%",
};

function registrationPhotoUrl(fileName: string | null | undefined): string | null {
  if (!fileName?.trim()) return null;
  const name = fileName.trim();
  if (name.startsWith("/")) return name;
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  return registrationDocumentUrl(name);
}

function personalPhotoFromDocs(
  docs?: Record<string, string> | null
): string | null {
  if (!docs) return null;
  const file =
    docs.personal_photo?.trim() ||
    docs.personalPhoto?.trim() ||
    docs["personal-photo"]?.trim();
  return registrationPhotoUrl(file);
}

function livestockSectionAvatarFromAccount(
  companyName?: string | null,
  companyType?: string | null
): string | null {
  const hay = `${companyName ?? ""} ${companyType ?? ""}`.toLowerCase();
  if (/\b(camel|geel)\b/.test(hay)) return "/images/livestock/camel.jpg";
  if (/\b(cattle|loda)\b/.test(hay)) return "/images/livestock/loda-cattle.jpg";
  if (/\b(goat|sheep|arri|arriga)\b/.test(hay)) return "/images/livestock/goat.jpg";
  return null;
}

export function companyAdminAvatarFor(user: {
  email?: string | null;
  fullName?: string | null;
  companySlug?: string | null;
  companyName?: string | null;
  companyType?: string | null;
  /** Uploaded personal_photo filename or public URL (new users). */
  personalPhotoFile?: string | null;
  /** Registration docs map — uses `personal_photo` when present. */
  registrationDocuments?: Record<string, string> | null;
  /**
   * When false (Approvals review), skip decorative livestock stock photos /
   * section avatars — show initials unless a real personal_photo was uploaded.
   */
  allowSectionStock?: boolean;
}): string | null {
  const uploaded =
    registrationPhotoUrl(user.personalPhotoFile) ||
    personalPhotoFromDocs(user.registrationDocuments);
  if (uploaded) return uploaded;

  const email = user.email?.trim().toLowerCase();
  if (email && COMPANY_ADMIN_AVATARS[email]) return COMPANY_ADMIN_AVATARS[email];

  const name = user.fullName?.trim().toLowerCase();
  if (name && AVATAR_BY_NAME[name]) return AVATAR_BY_NAME[name];

  if (user.allowSectionStock !== false) {
    const fromAccount = livestockSectionAvatarFromAccount(
      user.companyName,
      user.companyType
    );
    if (fromAccount) return fromAccount;

    const slug = user.companySlug?.trim().toLowerCase();
    if (slug && AVATAR_BY_SLUG[slug]) return AVATAR_BY_SLUG[slug];
  }

  return null;
}

export function companyAdminAvatarObjectPosition(src: string): string {
  return AVATAR_OBJECT_POSITION[src] ?? "center 20%";
}

/** Initials for users without a photo yet. */
export function initialsFromName(fullName?: string | null, email?: string | null) {
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "CA";
}
