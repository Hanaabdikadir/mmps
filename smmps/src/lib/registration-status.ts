/**
 * Client-safe registration status helpers.
 * Do not import server-only modules here — used by client components.
 */

import { MMPS_SUPPORT_EMAIL } from "@/lib/home-content";

export type RegistrationStatusValue =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NOT_FOUND";

export type RegistrationStatusResult = {
  status: RegistrationStatusValue;
  email: string;
};

const SESSION_KEY = "mmps-registration-status";

export type StoredRegistrationStatus = {
  email: string;
  status: Exclude<RegistrationStatusValue, "NOT_FOUND">;
  submittedAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function registrationStatusSessionKey(): string {
  return SESSION_KEY;
}

export function readStoredRegistrationStatus(): StoredRegistrationStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRegistrationStatus>;
    if (
      typeof parsed.email !== "string" ||
      !parsed.email.trim() ||
      (parsed.status !== "PENDING" &&
        parsed.status !== "APPROVED" &&
        parsed.status !== "REJECTED")
    ) {
      return null;
    }
    return {
      email: parsed.email.trim().toLowerCase(),
      status: parsed.status,
      submittedAt:
        typeof parsed.submittedAt === "string"
          ? parsed.submittedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeStoredRegistrationStatus(
  email: string,
  status: StoredRegistrationStatus["status"] = "PENDING"
): void {
  if (typeof window === "undefined") return;
  const payload: StoredRegistrationStatus = {
    email: normalizeEmail(email),
    status,
    submittedAt: new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Explicit "Check your request status" entry — always opens the email lookup form.
 * Does not apply sessionStorage email/status.
 */
export function buildAccountCheckHref(): string {
  return "/account?check=1";
}

function isCheckModeParam(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "check";
}

/** True when URL asks for the lookup/check form first (`?check=1` or `?mode=check`). */
export function isAccountCheckMode(
  searchParams: URLSearchParams | { get(name: string): string | null }
): boolean {
  return (
    isCheckModeParam(searchParams.get("check")) ||
    searchParams.get("mode")?.trim().toLowerCase() === "check"
  );
}

/** Build /account URL that opens the status panel when email (+ optional status) is known. */
export function buildAccountStatusHref(
  email?: string | null,
  status?: StoredRegistrationStatus["status"] | null
): string {
  const stored =
    !email?.trim() && !status ? readStoredRegistrationStatus() : null;
  const resolvedEmail = normalizeEmail(email || stored?.email || "");
  const resolvedStatus = status || stored?.status || null;
  if (!resolvedEmail) return "/account";
  const q = new URLSearchParams();
  q.set("email", resolvedEmail);
  if (resolvedStatus) q.set("status", resolvedStatus);
  return `/account?${q.toString()}`;
}

export const SUPPORT_FEEDBACK_MAILTO =
  `mailto:${MMPS_SUPPORT_EMAIL}?subject=Registration%20feedback%20request&body=Hello%20MMPS%2C%0A%0AI%20would%20like%20feedback%20on%20my%20registration%20request.%0A%0ARegistered%20email%3A%20`;

export function feedbackMailto(email: string): string {
  return `${SUPPORT_FEEDBACK_MAILTO}${encodeURIComponent(email.trim())}`;
}
