import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, isScopedCompanyAdmin } from "@/lib/auth";
import { MARKET_LOCATION } from "@/lib/constants";
import type { AnimalType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animalType = searchParams.get("animalType") as AnimalType | null;
    const limit = parseInt(searchParams.get("limit") || "200");

    const prices = await prisma.livestockPrice.findMany({
      where: {
        deletedAt: null,
        status: "APPROVED",
        ...(animalType && { animalType }),
        OR: [
          { brokerId: null },
          { broker: { is: { deletedAt: null, status: "ACTIVE" } } },
        ],
        AND: [
          {
            OR: [
              { marketId: null },
              { market: { is: { deletedAt: null, status: "ACTIVE" } } },
            ],
          },
        ],
      },
      orderBy: { dateRecorded: "desc" },
      take: limit,
      include: {
        updatedBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch livestock prices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!checkPermission(user, "ADD_MARKET_PRICE") || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (isScopedCompanyAdmin(user)) {
      return NextResponse.json(
        { error: "You can only view and edit prices for your own company." },
        { status: 403 }
      );
    }

    const { animalType, price } = await request.json();

    if (!animalType || price == null) {
      return NextResponse.json(
        { error: "Animal type and price are required" },
        { status: 400 }
      );
    }

    const record = await prisma.livestockPrice.create({
      data: {
        animalType,
        marketLocation: MARKET_LOCATION,
        price,
        updatedById: user.id,
        status: "PENDING",
      },
      include: { updatedBy: { select: { fullName: true } } },
    });

    try {
      const { notifySuperAdmin } = await import(
        "@/lib/system-notifications-store"
      );
      await notifySuperAdmin({
        title: "Livestock price updated",
        message: `${record.updatedBy.fullName} set ${animalType} to $${Number(price).toFixed(2)} (${MARKET_LOCATION}).`,
        sector: "livestock",
        href: "/super-admin/livestock-prices",
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ price: record }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create livestock price" },
      { status: 500 }
    );
  }
}
