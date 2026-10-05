import { registrationDocumentUrl } from "@/lib/registration-document-url";

export function adminMarketImageUrl(
  logoFileName: string | null | undefined,
  fallback = ""
) {
  const f = logoFileName?.trim();
  if (!f) return fallback;
  if (f.startsWith("http://") || f.startsWith("https://") || f.startsWith("/")) {
    return f;
  }
  if (f.startsWith("uploads/")) return `/${f}`;
  return registrationDocumentUrl(f);
}
