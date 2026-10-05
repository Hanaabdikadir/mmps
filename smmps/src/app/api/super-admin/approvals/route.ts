import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission } from "@/lib/auth";
import { getPendingMarketPrices } from "@/lib/super-admin-service";

export async function GET() {
  try {
    const user = await getCurrentUser("super");
    if (!checkPermission(user, "APPROVE_MARKET_PRICE") || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pendingPrices = await getPendingMarketPrices();
    return NextResponse.json({ pendingPrices });
  } catch (error) {
    console.error("[api/super-admin/approvals GET]", error);
    return NextResponse.json(
      { error: "Approval service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser("super");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      type,
      action,
      reason,
      rejectionReason,
      target = "price",
    } = body as {
      id?: string | number;
      type?: string;
      action?: string;
      reason?: string;
      rejectionReason?: string;
      target?: "price" | "company";
    };

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    const normalizedAction = String(action).toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(normalizedAction)) {
      return NextResponse.json(
        { error: "action must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    // Market price approvals (Company Admin / Livestock Broker submissions)
    if (target === "price" || type) {
      if (
        !checkPermission(user, "APPROVE_MARKET_PRICE") &&
        !(
          normalizedAction === "REJECTED" &&
          checkPermission(user, "REJECT_MARKET_PRICE")
        )
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      if (!type) {
        return NextResponse.json(
          { error: "type (water|electricity|livestock) is required for price approvals" },
          { status: 400 }
        );
      }

      const rejectText = (rejectionReason ?? reason ?? "").trim();
      if (normalizedAction === "REJECTED" && !rejectText) {
        return NextResponse.json(
          { error: "rejectionReason is required when rejecting a price" },
          { status: 400 }
        );
      }

      const updateData: {
        status: "APPROVED" | "REJECTED";
        approvedById?: number | null;
        approvedAt?: Date | null;
        rejectedById?: number | null;
        rejectedAt?: Date | null;
        rejectionReason?: string | null;
      } = {
        status: normalizedAction as "APPROVED" | "REJECTED",
      };

      if (normalizedAction === "APPROVED") {
        updateData.approvedById = user.id;
        updateData.approvedAt = new Date();
        updateData.rejectedById = null;
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      } else {
        updateData.rejectedById = user.id;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectText;
      }

      const recordId = Number(id);
      if (!Number.isFinite(recordId)) {
        return NextResponse.json({ error: "Invalid price id" }, { status: 400 });
      }

      let record;
      const sectorType = String(type).toLowerCase();
      if (sectorType === "water") {
        record = await prisma.waterPrice.update({
          where: { id: recordId },
          data: updateData,
        });
      } else if (sectorType === "electricity") {
        record = await prisma.electricityPrice.update({
          where: { id: recordId },
          data: updateData,
        });
      } else if (sectorType === "livestock") {
        record = await prisma.livestockPrice.update({
          where: { id: recordId },
          data: updateData,
        });
      } else {
        return NextResponse.json(
          { error: "Invalid type — use water, electricity, or livestock" },
          { status: 400 }
        );
      }

      try {
        const { notifySuperAdmin } = await import(
          "@/lib/system-notifications-store"
        );
        await notifySuperAdmin({
          title:
            normalizedAction === "APPROVED"
              ? "Market price approved"
              : "Market price rejected",
          message:
            normalizedAction === "APPROVED"
              ? `A ${sectorType} price (#${record.id}) was approved.`
              : `A ${sectorType} price (#${record.id}) was rejected: ${rejectText}`,
          sector: sectorType,
          href: "/super-admin/approvals",
        });
      } catch {
        // ignore notification failures
      }

      const { revalidateAllPublicMarkets } = await import(
        "@/lib/revalidate-public"
      );
      revalidateAllPublicMarkets();

      return NextResponse.json({ success: true, record }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Unsupported approval target" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[api/super-admin/approvals POST]", error);
    return NextResponse.json(
      { error: "Approval service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
