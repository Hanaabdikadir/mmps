import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import {
  ALL_PERMISSION_CODES,
  MANAGEABLE_ROLES,
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  isSuperAdminPriceSubmitPermission,
  type Permission,
} from "@/lib/rbac-permissions";
import type { Role } from "@prisma/client";

async function syncRoleGrants(role: Role, codes: Permission[]) {
  const perms = await prisma.permission.findMany({
    where: { code: { in: codes } },
    select: { id: true },
  });
  await prisma.rolePermission.deleteMany({ where: { role } });
  if (perms.length) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ role, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function syncPermissionsCatalog() {
  const activeCodes = new Set(ALL_PERMISSION_CODES);

  for (const { code, name, module } of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, module },
      create: { code, name, module },
    });
  }

  const obsolete = await prisma.permission.findMany({
    where: { code: { notIn: [...activeCodes] } },
    select: { id: true, code: true },
  });
  if (obsolete.length) {
    const ids = obsolete.map((p) => p.id);
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: ids } },
    });
    await prisma.permission.deleteMany({ where: { id: { in: ids } } });
  }

  // Apply live role grants for fixed roles. Super Admin is editable and not overwritten.
  for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
    if (role === "SUPER_ADMIN" || role === "PUBLIC") continue;
    await syncRoleGrants(role, ROLE_PERMISSIONS[role]);
  }

  const superAdminGrants = await prisma.rolePermission.count({
    where: { role: "SUPER_ADMIN" },
  });
  if (superAdminGrants === 0) {
    await syncRoleGrants("SUPER_ADMIN", ROLE_PERMISSIONS.SUPER_ADMIN);
  } else {
    // Super Admin never submits live prices.
    const blocked = await prisma.permission.findMany({
      where: {
        code: {
          in: [
            "ADD_MARKET_PRICE",
            "EDIT_MARKET_PRICE",
            "ADD_LIVESTOCK_PRICE",
            "EDIT_LIVESTOCK_PRICE",
          ],
        },
      },
      select: { id: true },
    });
    if (blocked.length) {
      await prisma.rolePermission.deleteMany({
        where: {
          role: "SUPER_ADMIN",
          permissionId: { in: blocked.map((p) => p.id) },
        },
      });
    }
  }
}

export async function GET() {
  const auth = await requirePermission("MANAGE_ROLES");
  if (auth.error) return auth.error;

  await syncPermissionsCatalog();

  const permissions = await prisma.permission.findMany({
    where: { code: { in: [...ALL_PERMISSION_CODES] } },
    orderBy: [{ module: "asc" }, { code: "asc" }],
  });
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: { in: MANAGEABLE_ROLES } },
    include: { permission: true },
  });

  const roles = MANAGEABLE_ROLES.map((role) => {
    const dbPerms = rolePermissions
      .filter((rp) => rp.role === role)
      .map((rp) => rp.permission.code)
      .filter((code): code is Permission =>
        ALL_PERMISSION_CODES.includes(code as Permission)
      );
    return {
      role,
      permissions: dbPerms.length ? dbPerms : ROLE_PERMISSIONS[role],
      source: dbPerms.length ? "database" : "static",
      count: dbPerms.length ? dbPerms.length : ROLE_PERMISSIONS[role].length,
    };
  });

  return jsonOk({ roles, permissions });
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_ROLES");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const role = body?.role as Role;
  const codes = body?.permissions as Permission[];
  if (!role || !Array.isArray(codes)) {
    return jsonError("role and permissions[] are required");
  }
  if (!MANAGEABLE_ROLES.includes(role)) {
    return jsonError("Invalid role");
  }

  await syncPermissionsCatalog();

  const allowed = new Set(ALL_PERMISSION_CODES);
  let finalCodes = [...new Set(codes.map(String))].filter((c) =>
    allowed.has(c as Permission)
  );

  if (role === "SUPER_ADMIN") {
    finalCodes = finalCodes.filter(
      (c) => !isSuperAdminPriceSubmitPermission(c as Permission)
    );
    for (const required of [
      "MANAGE_ROLES",
      "VIEW_DASHBOARD",
      "MANAGE_SYSTEM_SETTINGS",
    ] as Permission[]) {
      if (!finalCodes.includes(required)) finalCodes.push(required);
    }
  } else if (role in ROLE_PERMISSIONS) {
    const defaults = ROLE_PERMISSIONS[role as Role];
    if (finalCodes.length === 0 && defaults.length) {
      finalCodes = [...defaults];
    }
  }

  const perms = await prisma.permission.findMany({
    where: { code: { in: finalCodes } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { role } });
    if (perms.length) {
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ role, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  });

  return jsonOk({
    ok: true,
    count: perms.length,
    role,
    source: "database",
  });
}
