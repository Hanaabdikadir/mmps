/**
 * Electricity plans (different from livestock):
 * Free 30d · 6 mo $12 ($2/mo) · 1 yr $21 ($1.75/mo)
 *
 * Run: npx tsx scripts/reset-electricity-plans.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_NAMES = [
  "Electricity Free",
  "Electricity · 6 Months",
  "Electricity · 1 Year",
] as const;

const NEW_PLANS = [
  {
    name: "Electricity Free",
    description: "Free: Price Calculator and current electricity rate.",
    price: 0,
    durationDays: 30,
    accountType: "ELECTRICITY",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Electricity · 6 Months",
    description:
      "$2/month × 6 = $12. Price Calculator, Current Rate, Price History, Rate Changes.",
    price: 12,
    durationDays: 180,
    accountType: "ELECTRICITY",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Electricity · 1 Year",
    description:
      "$1.75/month × 12 = $21. All features, Full Price History, Detailed Reports.",
    price: 21,
    durationDays: 365,
    accountType: "ELECTRICITY",
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

  const oldElectricity = await prisma.subscriptionPlan.findMany({
    where: {
      name: { notIn: [...KEEP_NAMES] },
      OR: [
        { accountType: "ELECTRICITY" },
        { name: { contains: "Electricity", mode: "insensitive" } },
        { name: { contains: "Korontada", mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { subscriptions: true } } },
  });

  for (const plan of oldElectricity) {
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

  const electricity = await prisma.subscriptionPlan.findMany({
    where: {
      active: true,
      accountType: "ELECTRICITY",
    },
    orderBy: [{ durationDays: "asc" }, { price: "asc" }],
  });

  console.log(
    JSON.stringify(
      {
        activeElectricityPlans: electricity.map((p) => ({
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
