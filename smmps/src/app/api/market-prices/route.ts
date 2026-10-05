import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission, isCompanyAdmin, isSuperAdmin } from "@/lib/auth";
import { createNotification, notifyRole } from "@/lib/notifications";
import { consumeAdvertisement, requireActiveSubscription } from "@/lib/subscriptions";
import type { PriceStatus } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PriceStatus | null;
  const mine = searchParams.get("mine") === "1";
  const official = searchParams.get("official") === "1";
  const companyId = searchParams.get("companyId");
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { deletedAt: null };
  if (official) where.status = "APPROVED";
  else if (status) where.status = status;

  if (mine || (isCompanyAdmin(auth.user) && !isSuperAdmin(auth.user))) {
    if (auth.user.companyId) where.companyId = auth.user.companyId;
    else where.updatedById = auth.user.id;
  } else if (companyId) {
    where.companyId = Number(companyId);
  } else if (
    !isSuperAdmin(auth.user) &&
    !checkPermission(auth.user, "APPROVE_MARKET_PRICE")
  ) {
    where.status = "APPROVED";
  }

  if (q) {
    where.OR = [
      { productService: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { unit: { contains: q, mode: "insensitive" } },
    ];
  }

  const prices = await prisma.marketPrice.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, slug: true, type: true } },
      section: { select: { id: true, name: true } },
      market: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
      rejectedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return jsonOk({ prices });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!checkPermission(auth.user, "ADD_MARKET_PRICE")) {
    return jsonError("Forbidden", 403);
  }

  if (isCompanyAdmin(auth.user) && auth.user.companyId) {
    const sub = await requireActiveSubscription({ companyId: auth.user.companyId });
    if (!sub.ok) return jsonError(sub.reason, 402);
    const ads = await consumeAdvertisement({ companyId: auth.user.companyId });
    if (!ads.ok) return jsonError(ads.reason, 402);
  }

  const body = await request.json().catch(() => null);
  const productService = String(body?.productService || body?.product || "").trim();
  const price = Number(body?.price);
  if (!productService) return jsonError("Product/Service is required");
  if (!Number.isFinite(price) || price < 0) return jsonError("Valid price is required");

  const record = await prisma.marketPrice.create({
    data: {
      companyId: auth.user.companyId ?? (body.companyId != null ? Number(body.companyId) : null),
      marketId: body.marketId != null ? Number(body.marketId) : null,
      sectionId: body.sectionId != null ? Number(body.sectionId) : null,
      productService,
      price,
      currency: String(body.currency || "USD"),
      unit: body.unit ? String(body.unit) : null,
      kilowatt: body.kilowatt != null && body.kilowatt !== "" ? Number(body.kilowatt) : null,
      meterCubic:
        body.meterCubic != null && body.meterCubic !== "" ? Number(body.meterCubic) : null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
      description: body.description ? String(body.description) : null,
      updatedById: auth.user.id,
      status: body.status === "DRAFT" ? "DRAFT" : "PENDING",
    },
  });

  if (record.status === "PENDING") {
    await notifyRole(["SUPER_ADMIN"], {
      title: "New market price submitted",
      message: `${auth.user.fullName} submitted ${productService} at ${price} for approval.`,
      type: "PRICE_SUBMITTED",
      sector: "market",
      senderId: auth.user.id,
    });
  }

  return jsonOk({ price: record }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  const existing = await prisma.marketPrice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return jsonError("Not found", 404);

  const action = body?.action as string | undefined;

  if (action === "approve" || action === "reject") {
    if (!checkPermission(auth.user, "APPROVE_MARKET_PRICE")) {
      return jsonError("Forbidden", 403);
    }
    if (action === "reject" && !String(body?.reason || "").trim()) {
      return jsonError("Rejection reason is required");
    }

    const updated =
      action === "approve"
        ? await prisma.marketPrice.update({
            where: { id },
            data: {
              status: "APPROVED",
              approvedById: auth.user.id,
              approvedAt: new Date(),
              rejectionReason: null,
              rejectedById: null,
              rejectedAt: null,
            },
          })
        : await prisma.marketPrice.update({
            where: { id },
            data: {
              status: "REJECTED",
              rejectionReason: String(body.reason).trim(),
              rejectedById: auth.user.id,
              rejectedAt: new Date(),
            },
          });

    await prisma.priceApproval.create({
      data: {
        action: action === "approve" ? "APPROVE" : "REJECT",
        comment: action === "reject" ? String(body.reason).trim() : body.comment || null,
        reviewedById: auth.user.id,
        marketPriceId: id,
      },
    });

    await createNotification({
      userId: existing.updatedById,
      title: action === "approve" ? "Market price approved" : "Market price rejected",
      message:
        action === "approve"
          ? `Your price for ${existing.productService} was approved and published.`
          : `Your price for ${existing.productService} was rejected: ${String(body.reason).trim()}`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "market",
      senderId: auth.user.id,
    });

    const { revalidatePublicCompare } = await import("@/lib/revalidate-public");
    revalidatePublicCompare();
    return jsonOk({ price: updated });
  }

  if (!checkPermission(auth.user, "EDIT_MARKET_PRICE")) {
    return jsonError("Forbidden", 403);
  }

  const owns =
    existing.updatedById === auth.user.id ||
    (auth.user.companyId && existing.companyId === auth.user.companyId);
  if (!isSuperAdmin(auth.user) && !owns) return jsonError("Forbidden", 403);
  if (!isSuperAdmin(auth.user) && existing.status === "APPROVED") {
    return jsonError("Approved prices cannot be edited");
  }

  const updated = await prisma.marketPrice.update({
    where: { id },
    data: {
      ...(body.productService != null
        ? { productService: String(body.productService).trim() }
        : {}),
      ...(body.price != null ? { price: Number(body.price) } : {}),
      ...(body.currency != null ? { currency: String(body.currency) } : {}),
      ...(body.unit != null ? { unit: String(body.unit) } : {}),
      ...(body.kilowatt !== undefined
        ? { kilowatt: body.kilowatt === "" || body.kilowatt == null ? null : Number(body.kilowatt) }
        : {}),
      ...(body.meterCubic !== undefined
        ? {
            meterCubic:
              body.meterCubic === "" || body.meterCubic == null
                ? null
                : Number(body.meterCubic),
          }
        : {}),
      ...(body.effectiveDate != null ? { effectiveDate: new Date(body.effectiveDate) } : {}),
      ...(body.description != null ? { description: String(body.description) } : {}),
      ...(body.sectionId !== undefined
        ? { sectionId: body.sectionId == null ? null : Number(body.sectionId) }
        : {}),
      status: body.submit === false ? "DRAFT" : "PENDING",
      rejectionReason: null,
    },
  });

  return jsonOk({ price: updated });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const existing = await prisma.marketPrice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return jsonError("Not found", 404);

  const owns =
    existing.updatedById === auth.user.id ||
    (auth.user.companyId && existing.companyId === auth.user.companyId);
  if (!isSuperAdmin(auth.user) && !owns) return jsonError("Forbidden", 403);

  await prisma.priceApproval.deleteMany({ where: { marketPriceId: id } });
  await prisma.marketPrice.delete({ where: { id } });
  return jsonOk({ ok: true });
}
