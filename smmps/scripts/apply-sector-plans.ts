/**
 * Apply current sector plans to existing brokers / electricity / water accounts.
 * Run: npx tsx scripts/apply-sector-plans.ts
 */
import { PrismaClient } from "@prisma/client";
import { syncSubscriptionsForAllAccounts } from "../src/lib/subscriptions";

const prisma = new PrismaClient();

async function main() {
  const result = await syncSubscriptionsForAllAccounts();
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    include: {
      plan: { select: { name: true, accountType: true, price: true } },
      broker: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, type: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        backfill: result,
        subscriptions: subs.map((s) => ({
          id: s.id,
          plan: s.plan.name,
          accountType: s.plan.accountType,
          price: String(s.plan.price),
          broker: s.broker ? `#${s.broker.id} ${s.broker.name}` : null,
          company: s.company
            ? `#${s.company.id} ${s.company.name} (${s.company.type})`
            : null,
          expiry: s.expiryDate.toISOString().slice(0, 10),
        })),
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
