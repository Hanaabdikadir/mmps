import { type Role, type UserStatus } from "@prisma/client";
export type { Role, UserStatus };

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export function isSuperAdminRole(role: Role | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}
