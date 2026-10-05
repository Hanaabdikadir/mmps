import path from "path";

/** Safe basename for registration upload files. */
export function sanitizeRegistrationFileName(raw: string): string | null {
  const base = path.basename(String(raw || "").trim());
  if (!base || base === "." || base === "..") return null;
  if (!/^[\w.\-]+$/.test(base)) return null;
  return base;
}

/**
 * Browser URL for registration/PII files.
 * Served by `/api/secure-files/registrations/...` (login required).
 */
export function registrationDocumentUrl(fileName: string): string {
  const safe = sanitizeRegistrationFileName(fileName);
  if (!safe) return "";
  return `/api/secure-files/registrations/${encodeURIComponent(safe)}`;
}

export function mimeForRegistrationFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}
