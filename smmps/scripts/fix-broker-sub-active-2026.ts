/**
 * Keep broker registration at 1 Jan 2026, but set subscription
 * windows active from 1 Sep 2026 so plans are not expired.
 * Run: npx tsx scripts/fix-broker-sub-active-2026.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REG = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));
const SUB_START = new Date(Date.UTC(2026, 8, 1, 10, 0, 0));

async function main() {
  const brokers = await prisma.livestockBroker.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { id: "desc" },
        take: 1,
      },
      users: { where: { deletedAt: null }, select: { id: true } },
    },
  });

  const out: unknown[] = [];
  for (const b of brokers) {
    const sub = b.subscriptions[0];
    if (!sub?.plan) continue;
    const expiry = new Date(SUB_START);
    expiry.setUTCDate(expiry.getUTCDate() + sub.plan.durationDays);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        startDate: SUB_START,
        expiryDate: expiry,
        status: "ACTIVE",
      },
    });

    await prisma.livestockBroker.update({
      where: { id: b.id },
      data: { createdAt: REG },
    });

    for (const u of b.users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { createdAt: REG },
      });
    }

    out.push({
      name: b.name,
      plan: sub.plan.name,
      registered: "2026-01-01",
      subStart: SUB_START.toISOString().slice(0, 10),
      subExpiry: expiry.toISOString().slice(0, 10),
    });
  }

  console.log(JSON.stringify({ fixed: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
