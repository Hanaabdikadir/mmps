import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const anyLivestock = await p.livestockPrice.count({ where: { deletedAt: null } });
  const withType = await p.livestockPrice.count({
    where: { deletedAt: null, livestockTypeId: { not: null } },
  });
  const halTypes = await p.livestockAnimalType.findMany({
    where: {
      OR: [
        { nameSomali: { equals: "Hal", mode: "insensitive" } },
        { slug: { equals: "hal", mode: "insensitive" } },
        { slug: { contains: "female-camel", mode: "insensitive" } },
        { name: { contains: "She-Camel", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, nameSomali: true, slug: true },
  });
  const markets = await p.market.findMany({
    where: { deletedAt: null, marketType: "LIVESTOCK" },
    select: { id: true, name: true },
    take: 20,
  });
  const sample = await p.livestockPrice.findMany({
    where: { deletedAt: null },
    take: 10,
    orderBy: { dateRecorded: "desc" },
    select: {
      id: true,
      price: true,
      category: true,
      animalType: true,
      marketLocation: true,
      dateRecorded: true,
      marketId: true,
      livestockTypeId: true,
      market: { select: { name: true } },
      livestockType: { select: { name: true, nameSomali: true, slug: true } },
      broker: { select: { name: true, marketId: true } },
    },
  });
  const byHalType =
    halTypes.length > 0
      ? await p.livestockPrice.count({
          where: {
            deletedAt: null,
            livestockTypeId: { in: halTypes.map((t) => t.id) },
          },
        })
      : 0;

  console.log(
    JSON.stringify(
      { anyLivestock, withType, byHalType, halTypes, markets, sample },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
