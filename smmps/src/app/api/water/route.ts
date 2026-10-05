import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  checkPermission,
  isScopedCompanyAdmin,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import { MARKET_LOCATION, UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { assertCanWriteProvider } from "@/lib/company-scope-guard";
import { ensureDbCompanyAdmin } from "@/lib/ensure-company-admin";
import {
  providerMetaForSlug,
  resolveProviderSlug,
} from "@/lib/company-scope-server";
import type { WaterType } from "@prisma/client";
import { revalidateUtilityPublic } from "@/lib/revalidate-public";
import { consumeAdvertisement } from "@/lib/subscriptions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const waterType = searchParams.get("waterType") as WaterType | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    const prices = await prisma.waterPrice.findMany({
      where: {
        waterType: waterType || UTILITY_SERVICE_TYPE,
        status: "APPROVED",
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
      { error: "Failed to fetch water prices" },
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

    const { providerName, pricePerUnit } = await request.json();

    if (!providerName || pricePerUnit == null) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const waterType = UTILITY_SERVICE_TYPE;

    const scopeError = await assertCanWriteProvider(user, providerName, "water");
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const updatedById = await ensureDbCompanyAdmin(user);

    // Canonical company name so every provider report matches consistently
    const ownSlug = resolveCompanyAdminSlug(user);
    const resolvedSlug =
      ownSlug || (await resolveProviderSlug(String(providerName), "water"));
    const meta = resolvedSlug ? await providerMetaForSlug(resolvedSlug) : null;
    const canonicalName =
      meta && "name" in meta && meta.name
        ? String(meta.name)
        : String(providerName);

    // Company admins write live rates for their own company (all water providers)
    const status = isScopedCompanyAdmin(user) ? "APPROVED" : "PENDING";

    if (user.companyId) {
      const ads = await consumeAdvertisement({ companyId: user.companyId });
      if (!ads.ok) return NextResponse.json({ error: ads.reason }, { status: 402 });
    }

    const record = await prisma.waterPrice.create({
      data: {
        providerName: canonicalName,
        waterType,
        location: MARKET_LOCATION,
        pricePerUnit,
        updatedById,
        status,
      },
      include: { updatedBy: { select: { fullName: true } } },
    });

    try {
      const { notifySuperAdmin } = await import(
        "@/lib/system-notifications-store"
      );
      await notifySuperAdmin({
        title: "Water price updated",
        message: `${record.updatedBy.fullName} set ${canonicalName} (${waterType}) to $${Number(pricePerUnit).toFixed(2)}.`,
        sector: "water",
        href: "/super-admin/prices",
      });
    } catch {
      // ignore
    }

    revalidateUtilityPublic();
    return NextResponse.json({ price: record }, { status: 201 });
  } catch (e) {
    console.error("[api/water POST]", e);
    return NextResponse.json(
      { error: "Failed to create water price" },
      { status: 500 }
    );
  }
}
