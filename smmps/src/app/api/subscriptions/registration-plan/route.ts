import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public: default plan assigned after company/broker registration is approved. */
export async function GET() {
  try {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { active: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationDays: true,
        accountType: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: Number(plan.price),
        durationDays: plan.durationDays,
        accountType: plan.accountType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load registration plan" },
      { status: 500 }
    );
  }
}
