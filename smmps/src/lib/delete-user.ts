import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMmpsPlatformEmail } from "@/lib/home-content";
import { isLegacyLivestockManagerEmail } from "@/lib/livestock-manager-broker";

/**
 * Remove DB rows that block a hard user delete, then delete the user.
 * Price history authored by the user is removed; approval stamps are cleared.
 */
export async function hardDeleteUser(userId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.priceApproval.deleteMany({ where: { reviewedById: userId } });

    await tx.marketPrice.updateMany({
      where: { approvedById: userId },
      data: { approvedById: null },
    });
    await tx.marketPrice.updateMany({
      where: { rejectedById: userId },
      data: { rejectedById: null },
    });
    await tx.livestockPrice.updateMany({
      where: { approvedById: userId },
      data: { approvedById: null },
    });
    await tx.livestockPrice.updateMany({
      where: { rejectedById: userId },
      data: { rejectedById: null },
    });
    await tx.waterPrice.updateMany({
      where: { approvedById: userId },
      data: { approvedById: null },
    });
    await tx.waterPrice.updateMany({
      where: { rejectedById: userId },
      data: { rejectedById: null },
    });
    await tx.electricityPrice.updateMany({
      where: { approvedById: userId },
      data: { approvedById: null },
    });
    await tx.electricityPrice.updateMany({
      where: { rejectedById: userId },
      data: { rejectedById: null },
    });

    await tx.marketPrice.deleteMany({ where: { updatedById: userId } });
    await tx.livestockPrice.deleteMany({ where: { updatedById: userId } });
    await tx.waterPrice.deleteMany({ where: { updatedById: userId } });
    await tx.electricityPrice.deleteMany({ where: { updatedById: userId } });

    await tx.report.deleteMany({ where: { generatedById: userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.notification.updateMany({
      where: { senderId: userId },
      data: { senderId: null },
    });
    await tx.registrationMessage.deleteMany({
      where: {
        OR: [{ threadUserId: userId }, { senderId: userId }],
      },
    });
    await tx.companyDocument.updateMany({
      where: { uploadedById: userId },
      data: { uploadedById: null },
    });
    await tx.adminSession.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.verificationCode.deleteMany({ where: { userId } });

    await tx.registrationRejectionHistory.deleteMany({
      where: { OR: [{ userId }, { changedById: userId }] },
    });
    await tx.registrationTimelineEvent.deleteMany({
      where: { OR: [{ userId }, { actorId: userId }] },
    });
    await tx.user.updateMany({
      where: { rejectedById: userId },
      data: { rejectedById: null },
    });

    await tx.user.delete({ where: { id: userId } });
  });
}

/** Permanently delete livestock price rows and their approval history. */
export async function hardDeleteLivestockPrices(
  where: Prisma.LivestockPriceWhereInput
): Promise<number> {
  const rows = await prisma.livestockPrice.findMany({
    where,
    select: { id: true },
  });
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  await prisma.priceApproval.deleteMany({
    where: { livestockPriceId: { in: ids } },
  });
  await prisma.livestockPrice.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

async function deleteUtilityPricesByProvider(providerName: string) {
  const name = providerName.trim();
  if (!name) return;
  const water = await prisma.waterPrice.findMany({
    where: { providerName: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (water.length) {
    const ids = water.map((p) => p.id);
    await prisma.priceApproval.deleteMany({
      where: { waterPriceId: { in: ids } },
    });
    await prisma.waterPrice.deleteMany({ where: { id: { in: ids } } });
  }
  const electricity = await prisma.electricityPrice.findMany({
    where: { providerName: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (electricity.length) {
    const ids = electricity.map((p) => p.id);
    await prisma.priceApproval.deleteMany({
      where: { electricityPriceId: { in: ids } },
    });
    await prisma.electricityPrice.deleteMany({ where: { id: { in: ids } } });
  }
}

/** Permanently delete a company and everything attached to it. */
export async function hardDeleteCompany(companyId: number): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, email: true },
  });
  if (!company) return;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { companyId },
        { companySlug: company.slug },
        ...(company.email ? [{ email: company.email }] : []),
      ],
    },
    select: { id: true, email: true, role: true },
  });
  for (const user of users) {
    if (isProtectedPlatformUser({ email: user.email, role: user.role })) continue;
    await hardDeleteUser(user.id);
  }

  await deleteUtilityPricesByProvider(company.name);

  await prisma.$transaction(async (tx) => {
    const marketPrices = await tx.marketPrice.findMany({
      where: { companyId },
      select: { id: true },
    });
    if (marketPrices.length) {
      const ids = marketPrices.map((p) => p.id);
      await tx.priceApproval.deleteMany({
        where: { marketPriceId: { in: ids } },
      });
      await tx.marketPrice.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.company.update({
      where: { id: companyId },
      data: { sections: { set: [] } },
    });
    await tx.subscription.deleteMany({ where: { companyId } });
    await tx.companyDocument.deleteMany({ where: { companyId } });
    await tx.company.delete({ where: { id: companyId } });
  });
}

/** Permanently delete a livestock broker and attached users/prices. */
export async function hardDeleteBroker(brokerId: number): Promise<void> {
  const users = await prisma.user.findMany({
    where: { brokerId },
    select: { id: true, email: true, role: true },
  });
  for (const user of users) {
    if (isProtectedPlatformUser({ email: user.email, role: user.role })) continue;
    await hardDeleteUser(user.id);
  }

  await hardDeleteLivestockPrices({ brokerId });

  await prisma.$transaction(async (tx) => {
    await tx.livestockBrokerMarket.deleteMany({ where: { brokerId } });
    await tx.livestockBrokerCategory.deleteMany({ where: { brokerId } });
    await tx.livestockBrokerAnimalType.deleteMany({ where: { brokerId } });
    await tx.subscription.deleteMany({ where: { brokerId } });
    await tx.user.updateMany({
      where: { brokerId },
      data: { brokerId: null },
    });
    await tx.livestockPrice.updateMany({
      where: { brokerId },
      data: { brokerId: null },
    });
    await tx.livestockBroker.delete({ where: { id: brokerId } });
  });
}

/** Hard-delete the user and remove their broker/company from the system. */
export async function purgeUserFromSystem(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      brokerId: true,
      companyId: true,
      companySlug: true,
    },
  });
  if (!user) return;

  const brokerId = user.brokerId;
  const companyId = user.companyId;
  const companySlug = user.companySlug;
  const email = user.email.trim().toLowerCase();

  await hardDeleteUser(userId);

  if (brokerId) {
    const remaining = await prisma.user.count({
      where: { brokerId, deletedAt: null },
    });
    if (remaining === 0) {
      await hardDeleteBroker(brokerId);
    }
  }

  if (email) {
    const leftover = await prisma.livestockBroker.findFirst({
      where: { email },
      select: { id: true },
    });
    if (leftover) {
      const remaining = await prisma.user.count({
        where: { brokerId: leftover.id, deletedAt: null },
      });
      if (remaining === 0) {
        await hardDeleteBroker(leftover.id);
      }
    }
  }

  if (companyId) {
    const remaining = await prisma.user.count({
      where: { companyId, deletedAt: null },
    });
    if (remaining === 0) {
      await hardDeleteCompany(companyId);
    }
  }

  if (companySlug) {
    const leftover = await prisma.company.findFirst({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (leftover) {
      const remaining = await prisma.user.count({
        where: { companySlug, deletedAt: null },
      });
      if (remaining === 0) {
        await hardDeleteCompany(leftover.id);
      }
    }
  }
}

export function isProtectedPlatformUser(opts: {
  email?: string | null;
  role?: string | null;
}): boolean {
  const email = opts.email?.trim().toLowerCase() || "";
  if (opts.role === "SUPER_ADMIN") return true;
  if (!email) return false;
  if (isLegacyLivestockManagerEmail(email)) return true;
  return isMmpsPlatformEmail(email);
}
