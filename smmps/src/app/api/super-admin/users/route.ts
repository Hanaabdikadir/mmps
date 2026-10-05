import { NextResponse } from "next/server";
import { isMmpsPlatformEmail } from "@/lib/home-content";
import { isLegacyLivestockManagerEmail } from "@/lib/livestock-manager-broker";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { companySlugForEmail } from "@/lib/company-scope-server";
import {
  deleteManagedCompany,
  setManagedCompanyStatus,
} from "@/lib/super-admin-service";
import { removeRegisteredCompany } from "@/lib/registered-companies-store";
import { hardDeleteUser } from "@/lib/delete-user";
import type { Role, UserStatus } from "@/lib/rbac";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  companySlug: true,
  registrationDocuments: true,
} as const;

function personalPhotoFromRegistrationDocs(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  try {
    const docs = JSON.parse(raw) as Record<string, unknown>;
    const file = docs.personal_photo;
    return typeof file === "string" && file.trim() ? file.trim() : null;
  } catch {
    return null;
  }
}

function isPlatformAccountEmail(email: string): boolean {
  return isMmpsPlatformEmail(email) || isLegacyLivestockManagerEmail(email);
}

function mapAdminUsers(
  dbUsers: Array<{
    id: number;
    fullName: string;
    email: string;
    role: Role;
    status: UserStatus;
    createdAt: Date | string;
    companySlug?: string | null;
    registrationDocuments?: string | null;
  }>,
  role: Role | null
) {
  return dbUsers
    .filter((u) => {
      if (isPlatformAccountEmail(u.email)) return false;
      if (role === "COMPANY_ADMIN") {
        if (!u.companySlug && /system\s*admin/i.test(u.fullName)) return false;
      }
      return true;
    })
    .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      companySlug: u.companySlug ?? null,
      personalPhotoFile: personalPhotoFromRegistrationDocs(
        u.registrationDocuments
      ),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
}

/** Drop public water/electricity home cards when a company admin is deleted. */
async function unpublishCompanyAdmin(opts: {
  email?: string | null;
  companySlug?: string | null;
}) {
  const email = opts.email?.trim().toLowerCase() || undefined;
  const slug =
    opts.companySlug?.trim() ||
    (email ? await companySlugForEmail(email) : null) ||
    undefined;
  if (slug || email) {
    await removeRegisteredCompany({ slug, email });
  }
  if (slug) {
    await deleteManagedCompany(slug, email);
    await setManagedCompanyStatus(slug, "SUSPENDED");
  } else if (email) {
    await deleteManagedCompany(email, email);
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") as Role | null) ?? null;
  const status = (searchParams.get("status") as UserStatus | null) ?? null;

  if (role && role !== "COMPANY_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ users: [] });
  }

  try {
    const where: Prisma.UserWhereInput = {
      role: role ? role : { in: ["COMPANY_ADMIN", "SUPER_ADMIN"] },
      ...(status ? { status } : {}),
      deletedAt: null,
    };
    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      users: mapAdminUsers(users, role),
    });
  } catch (error) {
    console.error("[super-admin/users GET]", error);
    return NextResponse.json(
      { error: "User service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const userId =
    typeof (body as { userId?: unknown }).userId === "number" ||
    typeof (body as { userId?: unknown }).userId === "string"
      ? Number((body as { userId?: unknown }).userId)
      : NaN;
  const nextRole =
    typeof (body as { role?: unknown }).role === "string"
      ? ((body as { role: string }).role as Role)
      : undefined;
  const nextStatus =
    typeof (body as { status?: unknown }).status === "string"
      ? ((body as { status: string }).status as UserStatus)
      : undefined;
  const emailHint =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if ((!Number.isFinite(userId) && !emailHint) || !nextStatus) {
    return NextResponse.json(
      {
        error:
          "userId (or email) and status are required (access management only)",
      },
      { status: 400 }
    );
  }

  if (nextRole) {
    return NextResponse.json(
      { error: "User profile and roles cannot be edited here � access only" },
      { status: 400 }
    );
  }

  if (nextStatus !== "APPROVED" && nextStatus !== "REJECTED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (emailHint && emailHint === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot modify your own access" },
      { status: 400 }
    );
  }

  const companyStatus =
    nextStatus === "APPROVED" ? ("APPROVED" as const) : ("SUSPENDED" as const);

  async function applyCompanySync(
    email: string,
    role: Role,
    slug: string | null
  ) {
    if (role !== "COMPANY_ADMIN") return;
    if (slug) {
      await prisma.user.updateMany({
        where: { role: "COMPANY_ADMIN", companySlug: slug, deletedAt: null },
        data: { status: nextStatus },
      });
      await setManagedCompanyStatus(slug, companyStatus);
    }
  }

  try {
    const target =
      (emailHint
        ? await prisma.user.findFirst({
            where: { email: emailHint, deletedAt: null },
            select: {
              id: true,
              role: true,
              email: true,
              companySlug: true,
            },
          })
        : null) ??
      (Number.isFinite(userId)
        ? await prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
              id: true,
              role: true,
              email: true,
              companySlug: true,
            },
          })
        : null);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot modify your own access" },
        { status: 400 }
      );
    }
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super admin access cannot be changed here" },
        { status: 400 }
      );
    }

    const slug =
      target.companySlug || (await companySlugForEmail(target.email)) || null;

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status: nextStatus },
      select: userSelect,
    });

    await applyCompanySync(target.email, target.role, slug);

    try {
      const { notifySuperAdmin } = await import(
        "@/lib/system-notifications-store"
      );
      await notifySuperAdmin({
        title:
          nextStatus === "APPROVED"
            ? "Company admin activated"
            : "Company admin deactivated",
        message: `${target.email} access set to ${
          nextStatus === "APPROVED" ? "Active" : "Not Active"
        }.`,
        sector: "users",
        href: "/super-admin/users",
      });
    } catch {
      // ignore notification failures
    }

    return NextResponse.json({
      user: { ...updated, status: nextStatus, companySlug: slug },
      companySlug: slug,
      companyStatus,
    });
  } catch (error) {
    console.error("[super-admin/users PATCH]", error);
    return NextResponse.json(
      { error: "User service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const rawId = (body as { userId?: unknown }).userId;
  const userId =
    typeof rawId === "number" || typeof rawId === "string" ? Number(rawId) : NaN;
  const emailHint =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!Number.isFinite(userId) && !emailHint) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (
    (emailHint && emailHint === user.email.toLowerCase()) ||
    (Number.isFinite(userId) && userId === user.id)
  ) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    const target =
      (emailHint
        ? await prisma.user.findFirst({
            where: { email: emailHint, deletedAt: null },
            select: { id: true, role: true, email: true, companySlug: true },
          })
        : null) ??
      (Number.isFinite(userId)
        ? await prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: { id: true, role: true, email: true, companySlug: true },
          })
        : null);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super admin accounts cannot be deleted" },
        { status: 400 }
      );
    }

    await hardDeleteUser(target.id);
    await unpublishCompanyAdmin({
      email: target.email,
      companySlug: target.companySlug,
    });
    return NextResponse.json({ success: true, userId: target.id });
  } catch (error) {
    console.error("[super-admin/users DELETE]", error);
    return NextResponse.json(
      { error: "User service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
