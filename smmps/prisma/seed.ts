import { PrismaClient, type Role } from "@prisma/client";
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS as STATIC_ROLE_PERMISSIONS,
} from "../src/lib/rbac-permissions";

const prisma = new PrismaClient();

const ROLE_PERMISSIONS: Record<Role, string[]> = STATIC_ROLE_PERMISSIONS;

async function main() {
  console.log("Seeding permissions and livestock catalog essentials...");

  for (const { code, name, module } of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, module },
      create: { code, name, module },
    });
  }

  const activeCodes = PERMISSION_CATALOG.map((p) => p.code);
  const obsolete = await prisma.permission.findMany({
    where: { code: { notIn: activeCodes } },
    select: { id: true },
  });
  if (obsolete.length) {
    const ids = obsolete.map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { permissionId: { in: ids } } });
    await prisma.permission.deleteMany({ where: { id: { in: ids } } });
  }

  const permissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });
  const permissionIds = new Map(permissions.map((permission) => [permission.code, permission.id]));

  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS) as [Role, string[]][]) {
    await prisma.rolePermission.deleteMany({ where: { role } });
    for (const code of codes) {
      const permissionId = permissionIds.get(code);
      if (!permissionId) throw new Error(`Missing permission after upsert: ${code}`);
      await prisma.rolePermission.create({
        data: { role, permissionId },
      });
    }
  }

  for (const [key, value] of [
    ["app_name", "Somalia Market & Livestock Price Management System"],
    ["app_short_name", "SMLPMS"],
  ] as const) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // Leave Super Admin subscription plans alone. Create a starter plan only when none exist.
  const anyPlan = await prisma.subscriptionPlan.findFirst({ select: { id: true } });
  if (!anyPlan) {
    await prisma.subscriptionPlan.create({
      data: {
        name: "Basic Annual",
        description: "Standard access for companies and brokers",
        price: 120,
        durationDays: 365,
        accountType: "ALL",
        active: true,
      },
    });
  }

  console.log("Seed completed without creating business or login data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
