import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { reviewPrice } from "@/lib/approvals-engine";

export async function GET() {
  try {
    const auth = await requirePermission("APPROVE_MARKET_PRICE");
    if (auth.error) return auth.error;

    const [market, livestock, water, electricity] = await Promise.all([
      prisma.marketPrice.findMany({
        where: { status: "PENDING", deletedAt: null },
        include: {
          company: { select: { name: true, slug: true } },
          updatedBy: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.livestockPrice.findMany({
        where: { status: "PENDING", deletedAt: null },
        include: {
          broker: { select: { name: true } },
          updatedBy: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.waterPrice.findMany({
        where: { status: "PENDING" },
        include: { updatedBy: { select: { fullName: true, email: true } } },
        orderBy: { dateRecorded: "asc" },
        take: 50,
      }),
      prisma.electricityPrice.findMany({
        where: { status: "PENDING" },
        include: { updatedBy: { select: { fullName: true, email: true } } },
        orderBy: { dateRecorded: "asc" },
        take: 50,
      }),
    ]);

    return jsonOk({ market, livestock, water, electricity });
  } catch (error) {
    console.error("[api/approvals GET] Database unavailable:", error);
    return jsonError("Approval service is temporarily unavailable", 503);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission("APPROVE_MARKET_PRICE");
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const kind = body?.kind as "market" | "livestock" | "water" | "electricity";
    const id = Number(body?.id);
    const action = body?.action as "approve" | "reject";
    if (!kind || !id || (action !== "approve" && action !== "reject")) {
      return jsonError("kind, id, and action (approve|reject) are required");
    }

    const result = await reviewPrice(auth.user, { kind, id }, action, body?.reason);
    if (!result.ok) return jsonError(result.error || "Failed", result.status || 400);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[api/approvals POST] Database unavailable:", error);
    return jsonError("Approval service is temporarily unavailable", 503);
  }
}
