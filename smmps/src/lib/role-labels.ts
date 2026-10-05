import type { Role } from "@prisma/client";

/**
 * Display labels for roles.
 * Livestock: LIVESTOCK_BROKER_USER → "Livestock Admin".
 * Company: COMPANY_ADMIN is the live company role.
 */
export function formatRoleLabel(role: string | null | undefined): string {
  const r = String(role || "").trim();
  if (!r) return "—";
  switch (r) {
    case "LIVESTOCK_BROKER_USER":
      return "Livestock Admin";
    case "COMPANY_ADMIN":
      return "Company Admin";
    case "SUPER_ADMIN":
      return "Super Admin";
    case "REGISTERED":
      return "Registered";
    case "PUBLIC":
      return "Public";
    default:
      return r.replace(/_/g, " ");
  }
}

/** Short badge label for dense tables. */
export function formatRoleBadge(role: string | null | undefined): string {
  const r = String(role || "").trim();
  if (r === "COMPANY_ADMIN") {
    return "C-admin";
  }
  if (r === "LIVESTOCK_BROKER_USER") {
    return "L-admin";
  }
  if (r === "SUPER_ADMIN") return "S-admin";
  return formatRoleLabel(r);
}

export function isLivestockRole(role: Role | string | null | undefined): boolean {
  return role === "LIVESTOCK_BROKER_USER";
}

export function isCompanyRole(role: Role | string | null | undefined): boolean {
  return role === "COMPANY_ADMIN";
}

/** Only role used when creating/approving company accounts. */
export const COMPANY_ACCOUNT_ROLE = "COMPANY_ADMIN" as const satisfies Role;

/** Only role used when creating/approving livestock accounts. */
export const LIVESTOCK_ACCOUNT_ROLE = "LIVESTOCK_BROKER_USER" as const satisfies Role;
