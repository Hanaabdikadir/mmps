/** Shared SMLPMS status badge helpers and constants */

export const PRICE_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "INACTIVE"] as const;
export const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "CANCELLED",
] as const;

export const LIVESTOCK_TYPES = ["CAMEL", "CATTLE", "GOAT"] as const;

export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_DOCUMENT_EXT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case "APPROVED":
    case "ACTIVE":
    case "REGISTERED":
      return "border-emerald-200 bg-white text-emerald-700";
    case "PENDING":
    case "DRAFT":
    case "EXPIRING_SOON":
      return "border-amber-200 bg-white text-amber-800";
    case "REJECTED":
    case "SUSPENDED":
    case "CANCELLED":
    case "EXPIRED":
      return "border-rose-200 bg-white text-rose-700";
    case "INACTIVE":
      return "border-slate-200 bg-white text-slate-600";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

export function statusDotClass(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case "APPROVED":
    case "ACTIVE":
    case "REGISTERED":
      return "bg-emerald-500";
    case "PENDING":
    case "DRAFT":
    case "EXPIRING_SOON":
      return "bg-amber-500";
    case "REJECTED":
    case "SUSPENDED":
    case "CANCELLED":
    case "EXPIRED":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

export function formatStatusLabel(status: string, lang: "en" | "so" = "en"): string {
  const key = status.trim().toUpperCase();
  if (lang === "so") {
    const so: Record<string, string> = {
      ACTIVE: "Shaqeynaya",
      EXPIRING_SOON: "Dhowaan dhammaanaya",
      EXPIRED: "Dhammaaday",
      CANCELLED: "La joojiyay",
      PENDING: "Sugaya",
      APPROVED: "La ansixiyay",
      REJECTED: "La diiday",
      SUSPENDED: "La hakiyay",
      INACTIVE: "Aan shaqayn",
      DRAFT: "Qoraal",
      REGISTERED: "Diiwaangashan",
    };
    if (so[key]) return so[key];
  }
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SHELL_SO: Record<string, string> = {
  Dashboard: "Sahanka",
  Users: "Isticmaalayaasha",
  Companies: "Shirkadaha",
  "Roles & Permissions": "Doorkaha iyo oggolaanshaha",
  "Livestock Sector": "Qaybta xoolaha",
  "Livestock Dashboard": "Sahanka xoolaha",
  Brokers: "Dulaalayaasha",
  "Livestock Markets": "Suuqyada xoolaha",
  Categories: "Qaybaha",
  "Page Hero": "Madaxa bogga",
  "Price Market": "Suuqa qiimaha",
  "Price Reports": "Warbixinnada qiimaha",
  "Approve Prices": "Ansixi qiimaha",
  Markets: "Suuqyada",
  "Pending Approvals": "Ansixinta sugaysa",
  Subscriptions: "Qidmada",
  Notifications: "Ogeysiisyada",
  Reports: "Warbixinnada",
  "System Settings": "Dejinta nidaamka",
  Settings: "Dejinta",
  "Change Password": "Beddel erayga sirta",
  "Welcome back": "Ku soo dhawoow",
  Logout: "Ka bax",
  "Super Admin": "Maamulka sare",
  "Today’s date": "Taariikhda maanta",
};

export function shellLabel(label: string, lang: "en" | "so"): string {
  if (lang !== "so") return label;
  return SHELL_SO[label] ?? label;
}
