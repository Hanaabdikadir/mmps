import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { AuthUser } from "@/lib/auth";
import { checkPermission } from "@/lib/auth";
import {
  dismissDuplicatePendingLivestockPrices,
  supersedeMatchingApprovedLivestockPrices,
  revalidateLivestockPublic,
} from "@/lib/livestock-price-persist";

export type ReviewTarget =
  | { kind: "market"; id: number }
  | { kind: "livestock"; id: number }
  | { kind: "water"; id: number }
  | { kind: "electricity"; id: number };

function canApprove(user: AuthUser, target: ReviewTarget["kind"]) {
  if (target === "livestock") return checkPermission(user, "APPROVE_LIVESTOCK_PRICE");
  return checkPermission(user, "APPROVE_MARKET_PRICE");
}

export async function reviewPrice(
  user: AuthUser,
  target: ReviewTarget,
  action: "approve" | "reject",
  reason?: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (!canApprove(user, target.kind)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  if (action === "reject" && !String(reason || "").trim()) {
    return { ok: false, error: "Rejection reason is required", status: 400 };
  }

  const now = new Date();
  const approvalAction = action === "approve" ? "APPROVE" : "REJECT";

  if (target.kind === "market") {
    const row = await prisma.marketPrice.findFirst({ where: { id: target.id, deletedAt: null } });
    if (!row) return { ok: false, error: "Not found", status: 404 };
    await prisma.marketPrice.update({
      where: { id: target.id },
      data:
        action === "approve"
          ? { status: "APPROVED", approvedById: user.id, approvedAt: now, rejectionReason: null, rejectedById: null, rejectedAt: null }
          : { status: "REJECTED", rejectionReason: String(reason).trim(), rejectedById: user.id, rejectedAt: now },
    });
    await prisma.priceApproval.create({
      data: { action: approvalAction, comment: reason || null, reviewedById: user.id, marketPriceId: target.id },
    });
    await createNotification({
      userId: row.updatedById,
      title: action === "approve" ? "Market price approved" : "Market price rejected",
      message:
        action === "approve"
          ? `Your price for ${row.productService} was approved and published.`
          : `Your price for ${row.productService} was rejected: ${reason}`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "market",
      senderId: user.id,
    });
  } else if (target.kind === "livestock") {
    const row = await prisma.livestockPrice.findFirst({ where: { id: target.id, deletedAt: null } });
    if (!row) return { ok: false, error: "Not found", status: 404 };
    await prisma.livestockPrice.update({
      where: { id: target.id },
      data:
        action === "approve"
          ? { status: "APPROVED", approvedById: user.id, approvedAt: now, rejectionReason: null, rejectedById: null, rejectedAt: null }
          : { status: "REJECTED", rejectionReason: String(reason).trim(), rejectedById: user.id, rejectedAt: now },
    });
    if (action === "approve") {
      await dismissDuplicatePendingLivestockPrices({
        keepId: target.id,
        brokerId: row.brokerId,
        category: row.category,
        marketId: row.marketId,
      });
      await supersedeMatchingApprovedLivestockPrices({
        keepId: target.id,
        brokerId: row.brokerId,
        category: row.category,
        livestockTypeId: row.livestockTypeId,
        description: row.description,
        ageClass: row.ageClass,
        originPlace: row.originPlace,
      });
      revalidateLivestockPublic();
    }
    await prisma.priceApproval.create({
      data: { action: approvalAction, comment: reason || null, reviewedById: user.id, livestockPriceId: target.id },
    });
    await createNotification({
      userId: row.updatedById,
      title: action === "approve" ? "Livestock price approved" : "Livestock price rejected",
      message:
        action === "approve"
          ? `Your ${row.animalType} price was approved and published.`
          : `Your ${row.animalType} price was rejected: ${reason}`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "livestock",
      senderId: user.id,
    });
  } else if (target.kind === "water") {
    const row = await prisma.waterPrice.findFirst({ where: { id: target.id } });
    if (!row) return { ok: false, error: "Not found", status: 404 };
    await prisma.waterPrice.update({
      where: { id: target.id },
      data:
        action === "approve"
          ? { status: "APPROVED", approvedById: user.id, approvedAt: now, rejectionReason: null, rejectedById: null, rejectedAt: null }
          : { status: "REJECTED", rejectionReason: String(reason).trim(), rejectedById: user.id, rejectedAt: now },
    });
    await prisma.priceApproval.create({
      data: { action: approvalAction, comment: reason || null, reviewedById: user.id, waterPriceId: target.id },
    });
    await createNotification({
      userId: row.updatedById,
      title: action === "approve" ? "Water price approved" : "Water price rejected",
      message:
        action === "approve"
          ? "Your water price was approved and published."
          : `Your water price was rejected: ${reason}`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "water",
      senderId: user.id,
    });
  } else {
    const row = await prisma.electricityPrice.findFirst({ where: { id: target.id } });
    if (!row) return { ok: false, error: "Not found", status: 404 };
    await prisma.electricityPrice.update({
      where: { id: target.id },
      data:
        action === "approve"
          ? { status: "APPROVED", approvedById: user.id, approvedAt: now, rejectionReason: null, rejectedById: null, rejectedAt: null }
          : { status: "REJECTED", rejectionReason: String(reason).trim(), rejectedById: user.id, rejectedAt: now },
    });
    await prisma.priceApproval.create({
      data: { action: approvalAction, comment: reason || null, reviewedById: user.id, electricityPriceId: target.id },
    });
    await createNotification({
      userId: row.updatedById,
      title: action === "approve" ? "Electricity price approved" : "Electricity price rejected",
      message:
        action === "approve"
          ? "Your electricity price was approved and published."
          : `Your electricity price was rejected: ${reason}`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "electricity",
      senderId: user.id,
    });
  }

  return { ok: true };
}
