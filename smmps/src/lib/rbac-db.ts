import { type Permission as PermissionCode, isSuperAdminPriceSubmitPermission } from "@/lib/rbac-permissions";
import { type Role } from "@prisma/client";
import { hasPermission as staticHasPermission, ROLE_PERMISSIONS } from "@/lib/rbac-permissions";
import { prisma } from "@/lib/prisma";

/**
 * Prefer DB role_permissions when seeded; fall back to static ROLE_PERMISSIONS map.
 */
export async function roleHasPermission(
  role: Role | null | undefined,
  permission: PermissionCode
): Promise<boolean> {
  if (!role) return false;
  if (role === "SUPER_ADMIN" && isSuperAdminPriceSubmitPermission(permission)) {
    return false;
  }
  if (role === "SUPER_ADMIN") return true;
  // Livestock accounts are livestock-only — never water/electricity market prices.
  if (
    role === "LIVESTOCK_BROKER_USER" &&
    (permission === "ADD_MARKET_PRICE" || permission === "EDIT_MARKET_PRICE")
  ) {
    return false;
  }
  try {
    const row = await prisma.rolePermission.findFirst({
      where: {
        role,
        permission: { code: permission },
      },
      select: { id: true },
    });
    if (row) return true;
    // If permissions table is empty / not seeded for this role, use static map
    const count = await prisma.permission.count();
    if (count === 0) return staticHasPermission(role, permission);
    // Role may simply not have this permission
    const roleCount = await prisma.rolePermission.count({ where: { role } });
    if (roleCount === 0) return staticHasPermission(role, permission);
    return false;
  } catch {
    return staticHasPermission(role, permission);
  }
}

export function getStaticPermissions(role: Role): PermissionCode[] {
  return ROLE_PERMISSIONS[role] || [];
}
