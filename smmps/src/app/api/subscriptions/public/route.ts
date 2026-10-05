import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public list of subscription plans the Super Admin marked active. */
export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ durationDays: "asc" }, { price: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationDays: true,
        accountType: true,
        maxMarkets: true,
        maxLivestockTypes: true,
      },
    });

    return NextResponse.json(
      {
        plans: plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: Number(plan.price),
          durationDays: plan.durationDays,
          accountType: plan.accountType,
          maxMarkets: plan.maxMarkets,
          maxLivestockTypes: plan.maxLivestockTypes,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
