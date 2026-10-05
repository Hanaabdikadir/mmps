/**
 * Livestock plans only — volume discount by duration.
 * 1 mo $3 · 3 mo $8.25 · 6 mo $15 · 1 yr $27
 *
 * Run: npx tsx scripts/reset-livestock-plans.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_NAMES = [
  "Livestock · 1 Month",
  "Livestock · 3 Months",
  "Livestock · 6 Months",
  "Livestock · 1 Year",
] as const;

const NEW_PLANS = [
  {
    name: "Livestock · 1 Month",
    description: "$3/month. All markets and all livestock types.",
    price: 3,
    durationDays: 30,
    accountType: "LIVESTOCK",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Livestock · 3 Months",
    description: "$2.75/month × 3 = $8.25. All markets and all livestock types.",
    price: 8.25,
    durationDays: 90,
    accountType: "LIVESTOCK",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Livestock · 6 Months",
    description: "$2.50/month × 6 = $15. All markets and all livestock types.",
    price: 15,
    durationDays: 180,
    accountType: "LIVESTOCK",
    maxMarkets: null as number | null,
    maxLivestockTypes: null as number | null,
    active: true,
  },
  {
    name: "Livestock · 1 Year",
    description: "$2.25/month × 12 = $27. All markets and all livestock types.",
    price: 27,
    durationDays: 365,
    accountType: "LIVESTOCK",
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

  const oldLivestock = await prisma.subscriptionPlan.findMany({
    where: {
      name: { notIn: [...KEEP_NAMES] },
      OR: [
        { accountType: { in: ["LIVESTOCK", "BROKER"] } },
        { name: { contains: "Livestock", mode: "insensitive" } },
        { name: { contains: "Xoolaha", mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { subscriptions: true } } },
  });

  for (const plan of oldLivestock) {
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

  const livestock = await prisma.subscriptionPlan.findMany({
    where: {
      active: true,
      OR: [
        { accountType: { in: ["LIVESTOCK", "BROKER"] } },
        { name: { contains: "Livestock", mode: "insensitive" } },
      ],
    },
    orderBy: [{ durationDays: "asc" }, { price: "asc" }],
  });

  console.log(
    JSON.stringify(
      {
        activeLivestockPlans: livestock.map((p) => ({
          id: p.id,
          name: p.name,
          price: String(p.price),
          durationDays: p.durationDays,
          maxMarkets: p.maxMarkets,
          maxLivestockTypes: p.maxLivestockTypes,
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
