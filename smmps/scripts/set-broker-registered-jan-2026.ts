/**
 * Restore broker registration dates to 1 Jan 2026.
 * Run: npx tsx scripts/set-broker-registered-jan-2026.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REG = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));

async function main() {
  const brokers = await prisma.livestockBroker.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    include: {
      users: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { id: "asc" },
  });

  const out: unknown[] = [];
  for (const b of brokers) {
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
      id: b.id,
      name: b.name,
      registeredAt: "2026-01-01",
    });
  }

  console.log(JSON.stringify({ restored: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
