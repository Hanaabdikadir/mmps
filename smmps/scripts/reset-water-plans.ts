/**
 * Water plans (same feature tiers as electricity, different prices):
 * Free 30d · 6 mo $9 ($1.50/mo) · 1 yr $15 ($1.25/mo)
 *
 * Run: npx tsx scripts/reset-water-plans.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_NAMES = [
  "Water Free",
  "Water · 6 Months",
  "Water · 1 Year",
] as const;

const NEW_PLANS = [
  {
    name: "Water Free",
    description: "Free: Price Calculator and current water rate.",
    price: 0,
    durationDays: 30,
    accountType: "WATER",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Water · 6 Months",
    description:
      "$1.50/month × 6 = $9. Price Calculator, Current Rate, Price History, Rate Changes.",
    price: 9,
    durationDays: 180,
    accountType: "WATER",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Water · 1 Year",
    description:
      "$1.25/month × 12 = $15. All features, Full Price History, Detailed Reports.",
    price: 15,
    durationDays: 365,
    accountType: "WATER",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
] as const;

async function main() {
  for (const data of NEW_PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: data.name },
    });
    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          price: data.price,
          durationDays: data.durationDays,
          accountType: data.accountType,
          maxMarkets: data.maxMarkets,
          maxLivestockTypes: data.maxLivestockTypes,
          active: true,
        },
      });
      console.log(`Updated: ${data.name} (#${existing.id})`);
    } else {
      const created = await prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          durationDays: data.durationDays,
          accountType: data.accountType,
          maxMarkets: data.maxMarkets,
          maxLivestockTypes: data.maxLivestockTypes,
          active: true,
        },
      });
      console.log(`Created: ${created.name} (#${created.id})`);
    }
  }

  const oldWater = await prisma.subscriptionPlan.findMany({
    where: {
      name: { notIn: [...KEEP_NAMES] },
      OR: [
        { accountType: "WATER" },
        { name: { contains: "Water", mode: "insensitive" } },
        { name: { contains: "Biyaha", mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { subscriptions: true } } },
  });

  for (const plan of oldWater) {
    if (plan._count.subscriptions > 0) {
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { active: false },
      });
      console.log(`Deactivated old plan (has subscriptions): ${plan.name} (#${plan.id})`);
    } else {
      await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
      console.log(`Deleted old plan: ${plan.name} (#${plan.id})`);
    }
  }

  const water = await prisma.subscriptionPlan.findMany({
    where: {
      active: true,
      accountType: "WATER",
    },
    orderBy: [{ durationDays: "asc" }, { price: "asc" }],
  });

  console.log(
    JSON.stringify(
      {
        activeWaterPlans: water.map((p) => ({
          id: p.id,
          name: p.name,
          price: String(p.price),
          durationDays: p.durationDays,
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
