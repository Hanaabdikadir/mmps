import { NextResponse } from "next/server";
import { getCurrentUser, isCompanyAdmin, type AuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "admin_livestock_ref_prices:";

function storageKey(season: string, category: string) {
  return `${KEY_PREFIX}${season}_${category}`;
}

function isLivestockMarketAdmin(user: AuthUser): boolean {
  return isCompanyAdmin(user) && user.companySlug === "livestock-market";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const season = url.searchParams.get("season");
    const category = url.searchParams.get("category");

    if (!season || !category) {
      return NextResponse.json(
        { error: "Missing season or category parameter" },
        { status: 400 }
      );
    }

    const row = await prisma.systemSetting.findUnique({
      where: { key: storageKey(season, category) },
    });
    if (!row?.value) {
      return NextResponse.json({ data: null });
    }

    try {
      const data = JSON.parse(row.value) as Record<string, unknown>;
      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ data: null });
    }
  } catch (error) {
    console.error("[livestock-prices GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch livestock prices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Only Livestock Market Admins can update livestock prices" },
        { status: 403 }
      );
    }

    if (!isLivestockMarketAdmin(user)) {
      return NextResponse.json(
        { error: "Only Livestock Market Admins can update livestock prices" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { season, category, prices } = body;

    if (!season || !category || !prices) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload = {
      season: String(season),
      category: String(category),
      prices,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };

    await prisma.systemSetting.upsert({
      where: { key: storageKey(String(season), String(category)) },
      create: {
        key: storageKey(String(season), String(category)),
        value: JSON.stringify(payload),
      },
      update: {
        value: JSON.stringify(payload),
      },
    });

    return NextResponse.json({
      message: "Livestock prices updated successfully",
      data: payload,
    });
  } catch (error) {
    console.error("[livestock-prices POST]", error);
    return NextResponse.json(
      { error: "Failed to update livestock prices" },
      { status: 500 }
    );
  }
}
