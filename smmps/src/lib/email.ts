/**
 * Strict but fair email: local@domain.tld
 * Local part may include letters and numbers (name123@gmail.com).
 * Rejects missing @, missing domain, digits-only junk, spaces, multiple @,
 * domains without a letter TLD of length ≥ 2, and trailing digits/junk after
 * the TLD (e.g. user@gmail.com123, name@company.com4).
 */
const EMAIL_LOCAL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const EMAIL_DOMAIN_LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
/** TLD: letters only, length ≥ 2 — rejects com123, com4, and similar. */
const EMAIL_TLD_RE = /^[A-Za-z]{2,}$/;

export type EmailFormatIssue =
  | "empty"
  | "missing_at"
  | "missing_local"
  | "missing_domain"
  | "trailing_junk"
  | "invalid";

export function emailFormatIssue(raw: string): EmailFormatIssue | null {
  const value = raw.trim();
  if (!value) return "empty";
  if (/^\d+$/.test(value) || /\s/.test(value)) return "invalid";
  const atCount = (value.match(/@/g) ?? []).length;
  if (atCount === 0) return "missing_at";
  if (atCount !== 1) return "invalid";

  const at = value.indexOf("@");
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local) return "missing_local";
  if (!domain) return "missing_domain";
  if (!EMAIL_LOCAL_RE.test(local)) return "invalid";

  // Trailing digits after a normal TLD (user@gmail.com123, name@company.com4)
  if (/\d$/.test(domain)) return "trailing_junk";

  const labels = domain.split(".");
  if (labels.length < 2) return "missing_domain";
  if (labels.some((label) => !label || !EMAIL_DOMAIN_LABEL_RE.test(label))) {
    return "invalid";
  }
  const tld = labels[labels.length - 1];
  if (!EMAIL_TLD_RE.test(tld)) return "trailing_junk";
  return null;
}

/** True when value is a complete email address (caller may trim). */
export function isValidRegisterEmail(raw: string): boolean {
  return emailFormatIssue(raw) === null;
}

export function emailDomain(raw: string): string {
  const value = raw.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  return at >= 0 ? value.slice(at + 1) : "";
}

/** Personal login emails must be Gmail. Numbers in the name are allowed. */
export function isGmailAddress(raw: string): boolean {
  if (!isValidRegisterEmail(raw)) return false;
  const domain = emailDomain(raw);
  return domain === "gmail.com" || domain === "googlemail.com";
}

/** Free / personal domains not allowed as official company email. */
const BLOCKED_COMPANY_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
]);

/** True when email uses a blocked personal domain (e.g. @gmail.com). */
export function isBlockedCompanyEmailDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return BLOCKED_COMPANY_EMAIL_DOMAINS.has(domain);
}
