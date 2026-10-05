/**
 * Move broker registration dates into Sep 2026 so
 * "Registration date range" From 2026-09-01 finds them.
 * Run: npx tsx scripts/set-broker-registered-sep-2026.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Spread registration across early September 2026. */
const DATES = [
  new Date(Date.UTC(2026, 8, 1, 10, 0, 0)), // Hana
  new Date(Date.UTC(2026, 8, 2, 10, 0, 0)), // Mohamed
  new Date(Date.UTC(2026, 8, 3, 10, 0, 0)), // zahra
  new Date(Date.UTC(2026, 8, 5, 10, 0, 0)), // elhan
  new Date(Date.UTC(2026, 8, 8, 10, 0, 0)), // ismahaan
  new Date(Date.UTC(2026, 8, 10, 10, 0, 0)), // ahmed
];

async function main() {
  const brokers = await prisma.livestockBroker.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    include: {
      users: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { id: "asc" },
  });

  const out: unknown[] = [];
  for (let i = 0; i < brokers.length; i++) {
    const b = brokers[i]!;
    const when = DATES[i] ?? DATES[DATES.length - 1]!;

    await prisma.livestockBroker.update({
      where: { id: b.id },
      data: { createdAt: when },
    });

    for (const u of b.users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { createdAt: when },
      });
    }

    out.push({
      id: b.id,
      name: b.name,
      registeredAt: when.toISOString().slice(0, 10),
    });
  }

  console.log(JSON.stringify({ updated: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
