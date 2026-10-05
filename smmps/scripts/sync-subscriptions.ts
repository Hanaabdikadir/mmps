/**
 * Backfill ACTIVE subscriptions for live companies and brokers
 * using the current sector plans (livestock / electricity / water).
 *
 * Run: npx tsx scripts/sync-subscriptions.ts
 */
import { PrismaClient } from "@prisma/client";
import { syncSubscriptionsForAllAccounts } from "../src/lib/subscriptions";

const prisma = new PrismaClient();

async function main() {
  const result = await syncSubscriptionsForAllAccounts();
  const [plans, subs] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    }),
    prisma.subscription.count({
      where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    }),
  ]);
  console.log(
    JSON.stringify(
      {
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          price: String(p.price),
          durationDays: p.durationDays,
          accountType: p.accountType,
          maxMarkets: p.maxMarkets,
          maxLivestockTypes: p.maxLivestockTypes,
        })),
        backfill: result,
        activeSubscriptions: subs,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
