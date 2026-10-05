import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  requirePermission,
  jsonOk,
  jsonError,
} from "@/lib/api-guard";
import { checkPermission, isCompanyAdmin, isSuperAdmin } from "@/lib/auth";
import { notifyRole, createNotification } from "@/lib/notifications";
import type { CompanyType, AccountStatus } from "@prisma/client";
import { requireActiveSubscription } from "@/lib/subscriptions";
import { phoneWriteError } from "@/lib/register-validation";
import { ensureCompanyMarketsLinked } from "@/lib/company-default-market";
import { hardDeleteCompany } from "@/lib/delete-user";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  await ensureCompanyMarketsLinked();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const mine = searchParams.get("mine") === "1";

  if (mine || isCompanyAdmin(auth.user)) {
    if (!auth.user.companyId && !auth.user.companySlug) {
      return jsonOk({ companies: [] });
    }
    const company = await prisma.company.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(auth.user.companyId ? [{ id: auth.user.companyId }] : []),
          ...(auth.user.companySlug ? [{ slug: auth.user.companySlug }] : []),
        ],
      },
      include: {
        market: true,
        documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        subscriptions: {
          where: { status: { in: ["ACTIVE", "EXPIRING_SOON", "EXPIRED"] } },
          include: { plan: true },
          orderBy: { expiryDate: "desc" },
          take: 1,
        },
      },
    });
    return jsonOk({ companies: company ? [company] : [] });
  }

  if (
    !checkPermission(auth.user, "MANAGE_COMPANIES") &&
    !checkPermission(auth.user, "MANAGE_SUBSCRIPTIONS")
  ) {
    return jsonError("Forbidden", 403);
  }

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      market: { select: { id: true, name: true } },
      _count: { select: { users: true, marketPrices: true, documents: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ companies });
}

export async function POST() {
  return jsonError(
    "Companies register themselves. Super Admin cannot create companies.",
    403
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  const existing = await prisma.company.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return jsonError("Company not found", 404);

  const isOwner =
    isCompanyAdmin(auth.user) &&
    (auth.user.companyId === id || auth.user.companySlug === existing.slug);
  const canManage = isSuperAdmin(auth.user) || checkPermission(auth.user, "MANAGE_COMPANIES");
  const canEditOwn = isOwner && checkPermission(auth.user, "MANAGE_COMPANY");

  if (!canManage && !canEditOwn) return jsonError("Forbidden", 403);

  if (body.phone != null) {
    const phoneErr = phoneWriteError(String(body.phone), false);
    if (phoneErr) return jsonError(phoneErr);
  }

  if (isOwner && !canManage) {
    const sub = await requireActiveSubscription({ companyId: id });
    if (!sub.ok) return jsonError(sub.reason, 402);
  }

  let nextCompanyStatus: AccountStatus | undefined;
  if (body.status != null && canManage) {
    const raw = String(body.status).toUpperCase();
    // Companies use Active / Inactive only (legacy Suspended → Inactive)
    if (raw === "ACTIVE") nextCompanyStatus = "ACTIVE";
    else if (raw === "INACTIVE" || raw === "SUSPENDED") nextCompanyStatus = "INACTIVE";
    else return jsonError("status must be ACTIVE or INACTIVE");
  }

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.type != null && canManage ? { type: body.type as CompanyType } : {}),
      ...(body.email != null ? { email: String(body.email).trim().toLowerCase() } : {}),
      ...(body.phone != null ? { phone: String(body.phone).trim() } : {}),
      ...(body.location != null ? { location: String(body.location).trim() } : {}),
      ...(body.district != null ? { district: String(body.district).trim() } : {}),
      ...(body.address != null ? { address: String(body.address) } : {}),
      ...(body.registrationNumber != null
        ? { registrationNumber: String(body.registrationNumber) }
        : {}),
      ...(body.description != null ? { description: String(body.description) } : {}),
      ...(body.marketId !== undefined && canManage
        ? { marketId: body.marketId == null ? null : Number(body.marketId) }
        : {}),
      ...(nextCompanyStatus != null ? { status: nextCompanyStatus } : {}),
      ...(body.logoFileName != null ? { logoFileName: String(body.logoFileName) } : {}),
    },
  });

  if (canManage && nextCompanyStatus) {
    await prisma.user.updateMany({
      where: {
        deletedAt: null,
        OR: [{ companyId: company.id }, { companySlug: company.slug }],
      },
      data: { accountStatus: nextCompanyStatus },
    });
  }

  if (canManage) {
    const { upsertCompanyProfileOverride } = await import("@/lib/company-profile-store");
    await upsertCompanyProfileOverride(company.slug, {
      companyName: company.name,
      phone: company.phone ?? "",
      email: company.email ?? "",
      location: company.location ?? "",
      address: company.location ?? "",
      description: company.description ?? "",
    });
    const { revalidateUtilityPublic } = await import("@/lib/revalidate-public");
    revalidateUtilityPublic(company.slug);
  }

  return jsonOk({ company });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_COMPANIES");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const company = await prisma.company.findFirst({
    where: { id },
    select: { id: true },
  });
  if (!company) return jsonError("Company not found", 404);

  await hardDeleteCompany(company.id);

  return jsonOk({ ok: true });
}
