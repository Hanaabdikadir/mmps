import { prisma } from "@/lib/prisma";
import { hardDeleteUser, isProtectedPlatformUser } from "@/lib/delete-user";

/**
 * Permanently delete a market and related sections, prices, companies/brokers,
 * and their non-platform users.
 */
export async function hardDeleteMarket(marketId: number): Promise<{
  name: string;
  deletedUsers: number;
  deletedCompanies: number;
  deletedBrokers: number;
}> {
  const market = await prisma.market.findFirst({
    where: { id: marketId },
    select: {
      id: true,
      name: true,
      companies: { select: { id: true, slug: true } },
      brokers: { select: { id: true } },
    },
  });
  if (!market) {
    throw new Error("Market not found");
  }

  const companyIds = market.companies.map((c) => c.id);
  const companySlugs = market.companies
    .map((c) => c.slug)
    .filter((s): s is string => Boolean(s));
  const brokerIds = market.brokers.map((b) => b.id);

  const linkedUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
        ...(brokerIds.length ? [{ brokerId: { in: brokerIds } }] : []),
        ...(companySlugs.length
          ? [{ companySlug: { in: companySlugs } }]
          : []),
      ],
    },
    select: { id: true, email: true, role: true },
  });

  const seen = new Set<number>();
  let deletedUsers = 0;
  for (const user of linkedUsers) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    if (isProtectedPlatformUser({ email: user.email, role: user.role })) {
      continue;
    }
    await hardDeleteUser(user.id);
    deletedUsers += 1;
  }

  await prisma.$transaction(async (tx) => {
    const marketPrices = await tx.marketPrice.findMany({
      where: {
        OR: [
          { marketId },
          ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const marketPriceIds = marketPrices.map((p) => p.id);
    if (marketPriceIds.length) {
      await tx.priceApproval.deleteMany({
        where: { marketPriceId: { in: marketPriceIds } },
      });
      await tx.marketPrice.deleteMany({
        where: { id: { in: marketPriceIds } },
      });
    }

    const livestockPrices = await tx.livestockPrice.findMany({
      where: {
        OR: [
          { marketId },
          ...(brokerIds.length ? [{ brokerId: { in: brokerIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const livestockPriceIds = livestockPrices.map((p) => p.id);
    if (livestockPriceIds.length) {
      await tx.priceApproval.deleteMany({
        where: { livestockPriceId: { in: livestockPriceIds } },
      });
      await tx.livestockPrice.deleteMany({
        where: { id: { in: livestockPriceIds } },
      });
    }

    if (companyIds.length) {
      for (const companyId of companyIds) {
        await tx.company.update({
          where: { id: companyId },
          data: { sections: { set: [] } },
        });
      }
      await tx.subscription.deleteMany({
        where: { companyId: { in: companyIds } },
      });
      await tx.companyDocument.deleteMany({
        where: { companyId: { in: companyIds } },
      });
      await tx.company.deleteMany({ where: { id: { in: companyIds } } });
    }

    if (brokerIds.length) {
      await tx.subscription.deleteMany({
        where: { brokerId: { in: brokerIds } },
      });
      await tx.livestockBroker.deleteMany({ where: { id: { in: brokerIds } } });
    }

    await tx.marketSection.deleteMany({ where: { marketId } });
    await tx.market.delete({ where: { id: marketId } });
  });

  return {
    name: market.name,
    deletedUsers,
    deletedCompanies: companyIds.length,
    deletedBrokers: brokerIds.length,
  };
}
