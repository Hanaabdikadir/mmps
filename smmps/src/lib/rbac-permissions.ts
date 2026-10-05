import { Role } from "@prisma/client";

/**
 * Permissions that map to real MMPS features (APIs / portals / super-admin nav).
 * Dead or duplicate codes are intentionally omitted.
 */
export type Permission =
  | "VIEW_DASHBOARD"
  | "MANAGE_PROFILE"
  | "UPLOAD_PROFILE_IMAGE"
  | "MANAGE_COMPANY"
  | "MANAGE_USERS"
  | "CREATE_USER"
  | "EDIT_USER"
  | "DELETE_USER"
  | "MANAGE_ROLES"
  | "MANAGE_COMPANIES"
  | "APPROVE_COMPANY"
  | "MANAGE_LIVESTOCK_BROKERS"
  | "APPROVE_BROKER"
  | "MANAGE_LIVESTOCK_CATALOG"
  | "MANAGE_MARKETS"
  | "MANAGE_MARKET_SECTIONS"
  | "ADD_MARKET_PRICE"
  | "EDIT_MARKET_PRICE"
  | "APPROVE_MARKET_PRICE"
  | "REJECT_MARKET_PRICE"
  | "ADD_LIVESTOCK_PRICE"
  | "EDIT_LIVESTOCK_PRICE"
  | "APPROVE_LIVESTOCK_PRICE"
  | "VIEW_REPORTS"
  | "PRINT_REPORTS"
  | "FILTER_REPORTS"
  | "MANAGE_SUBSCRIPTIONS"
  | "SEND_NOTIFICATIONS"
  | "MANAGE_SYSTEM_SETTINGS";

export type PermissionCatalogEntry = {
  code: Permission;
  name: string;
  module: string;
};

/** Single catalog for Roles UI, seed, and /api/roles sync. */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { code: "VIEW_DASHBOARD", name: "View Dashboard", module: "dashboard" },
  { code: "MANAGE_PROFILE", name: "Manage Profile", module: "profile" },
  { code: "UPLOAD_PROFILE_IMAGE", name: "Upload Profile Image", module: "profile" },
  { code: "MANAGE_COMPANY", name: "Manage Company", module: "company" },
  { code: "MANAGE_USERS", name: "Manage Users", module: "users" },
  { code: "CREATE_USER", name: "Create User", module: "users" },
  { code: "EDIT_USER", name: "Edit User", module: "users" },
  { code: "DELETE_USER", name: "Delete User", module: "users" },
  { code: "MANAGE_ROLES", name: "Manage Roles & Permissions", module: "roles" },
  { code: "MANAGE_COMPANIES", name: "Manage Companies", module: "companies" },
  { code: "APPROVE_COMPANY", name: "Approve Company", module: "companies" },
  {
    code: "MANAGE_LIVESTOCK_BROKERS",
    name: "Manage Livestock Brokers",
    module: "brokers",
  },
  { code: "APPROVE_BROKER", name: "Approve Broker", module: "brokers" },
  {
    code: "MANAGE_LIVESTOCK_CATALOG",
    name: "Manage Livestock Categories & Types",
    module: "livestock",
  },
  { code: "MANAGE_MARKETS", name: "Manage Markets", module: "markets" },
  {
    code: "MANAGE_MARKET_SECTIONS",
    name: "Manage Market Sections",
    module: "markets",
  },
  { code: "ADD_MARKET_PRICE", name: "Add Market Price", module: "prices" },
  { code: "EDIT_MARKET_PRICE", name: "Edit Market Price", module: "prices" },
  {
    code: "APPROVE_MARKET_PRICE",
    name: "Approve Market Price",
    module: "prices",
  },
  {
    code: "REJECT_MARKET_PRICE",
    name: "Reject Market Price",
    module: "prices",
  },
  {
    code: "ADD_LIVESTOCK_PRICE",
    name: "Add Livestock Price",
    module: "livestock",
  },
  {
    code: "EDIT_LIVESTOCK_PRICE",
    name: "Edit Livestock Price",
    module: "livestock",
  },
  {
    code: "APPROVE_LIVESTOCK_PRICE",
    name: "Approve Livestock Price",
    module: "livestock",
  },
  { code: "VIEW_REPORTS", name: "View Reports", module: "reports" },
  { code: "PRINT_REPORTS", name: "Print Reports", module: "reports" },
  { code: "FILTER_REPORTS", name: "Filter Reports", module: "reports" },
  {
    code: "MANAGE_SUBSCRIPTIONS",
    name: "Manage Subscriptions",
    module: "subscriptions",
  },
  {
    code: "SEND_NOTIFICATIONS",
    name: "Send Notifications",
    module: "notifications",
  },
  {
    code: "MANAGE_SYSTEM_SETTINGS",
    name: "Manage System Settings",
    module: "settings",
  },
];

export const ALL_PERMISSION_CODES: Permission[] = PERMISSION_CATALOG.map(
  (p) => p.code
);

/** Super Admin runs the platform — does not submit live market/livestock prices. */
const SUPER_ADMIN_EXCLUDED: Permission[] = [
  "ADD_MARKET_PRICE",
  "EDIT_MARKET_PRICE",
  "ADD_LIVESTOCK_PRICE",
  "EDIT_LIVESTOCK_PRICE",
];

export function isSuperAdminPriceSubmitPermission(
  permission: Permission
): boolean {
  return SUPER_ADMIN_EXCLUDED.includes(permission);
}

/** Roles editable in Super Admin → Roles & Permissions (retired roles omitted). */
export const MANAGEABLE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "LIVESTOCK_BROKER_USER",
  "REGISTERED",
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSION_CODES.filter(
  (code) => !SUPER_ADMIN_EXCLUDED.includes(code)
);

const COMPANY_ADMIN_PERMISSIONS: Permission[] = [
  "VIEW_DASHBOARD",
  "MANAGE_PROFILE",
  "MANAGE_COMPANY",
  "ADD_MARKET_PRICE",
  "EDIT_MARKET_PRICE",
  "VIEW_REPORTS",
  "PRINT_REPORTS",
  "FILTER_REPORTS",
];

const LIVESTOCK_BROKER_USER_PERMISSIONS: Permission[] = [
  "VIEW_DASHBOARD",
  "MANAGE_PROFILE",
  "ADD_LIVESTOCK_PRICE",
  "EDIT_LIVESTOCK_PRICE",
  "VIEW_REPORTS",
];

const REGISTERED_PERMISSIONS: Permission[] = ["MANAGE_PROFILE"];

/** Live roles only — legacy ADMIN / COMPANY_USER / LIVESTOCK_BROKER_ADMIN omitted. */
export const ROLE_PERMISSIONS: Partial<Record<Role, Permission[]>> & {
  SUPER_ADMIN: Permission[];
  COMPANY_ADMIN: Permission[];
  LIVESTOCK_BROKER_USER: Permission[];
  REGISTERED: Permission[];
  PUBLIC: Permission[];
} = {
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
  COMPANY_ADMIN: COMPANY_ADMIN_PERMISSIONS,
  LIVESTOCK_BROKER_USER: LIVESTOCK_BROKER_USER_PERMISSIONS,
  REGISTERED: REGISTERED_PERMISSIONS,
  PUBLIC: [],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  if (role === "SUPER_ADMIN" && isSuperAdminPriceSubmitPermission(permission)) {
    return false;
  }
  if (role === "SUPER_ADMIN") return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function listPermissions(role: Role | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}
