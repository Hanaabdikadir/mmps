import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [livestock, water, electricity] = await Promise.all([
    prisma.livestockPrice.deleteMany(),
    prisma.waterPrice.deleteMany(),
    prisma.electricityPrice.deleteMany(),
  ]);
  console.log("Deleted demo/seed prices:", {
    livestock: livestock.count,
    water: water.count,
    electricity: electricity.count,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
