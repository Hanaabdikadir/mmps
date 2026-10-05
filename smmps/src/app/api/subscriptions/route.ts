import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { adsIncluded, parsePlanLimit } from "@/lib/pricing-plans";
import {
  computeSubscriptionStatus,
  notifySubscriptionChange,
  refreshSubscriptionStatuses,
} from "@/lib/subscriptions";

export async function GET(request: Request) {
  const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
  if (auth.error) return auth.error;

  await refreshSubscriptionStatuses().catch(() => null);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const view = searchParams.get("view"); // plans | subscriptions

  if (view === "plans") {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { createdAt: "desc" } });
    return jsonOk({ plans });
  }

  const [subscriptions, companies, brokers, renewalRows] = await Promise.all([
    prisma.subscription.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        plan: true,
        company: { select: { id: true, name: true, slug: true, type: true } },
        broker: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, type: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.livestockBroker.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        livestockFocus: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.subscriptionPaymentProof.findMany({
      where: { status: "PENDING" },
      include: {
        subscription: {
          include: {
            plan: true,
            company: { select: { id: true, name: true } },
            broker: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const { parseRequestedPlanId } = await import("@/lib/pricing-plans");
  const requestedIds = [
    ...new Set(
      renewalRows
        .map((r) => parseRequestedPlanId(r.receiptFile))
        .filter((id): id is number => id != null)
    ),
  ];
  const requestedPlans =
    requestedIds.length > 0
      ? await prisma.subscriptionPlan.findMany({
          where: { id: { in: requestedIds } },
        })
      : [];
  const planById = new Map(requestedPlans.map((p) => [p.id, p]));
  const renewals = renewalRows.map((r) => {
    const rid = parseRequestedPlanId(r.receiptFile);
    const requested = rid ? planById.get(rid) : null;
    return {
      ...r,
      requestedPlanId: rid,
      requestedPlan: requested
        ? {
            id: requested.id,
            name: requested.name,
            price: requested.price.toString(),
            durationDays: requested.durationDays,
          }
        : null,
    };
  });

  return jsonOk({ subscriptions, companies, brokers, renewals });
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const action = body?.action || "assign";

  if (action === "create_plan") {
    if (!body?.name || body?.price == null || body?.price === "" || !body?.durationDays) {
      return jsonError("name, price, and durationDays are required");
    }
    const accountType = String(body.accountType || "ALL");
    const durationDays = Number(body.durationDays);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: String(body.name).trim(),
        description: body.description ? String(body.description) : null,
        price: Number(body.price),
        durationDays,
        accountType,
        maxMarkets: parsePlanLimit(body.maxMarkets),
        maxLivestockTypes: parsePlanLimit(body.maxLivestockTypes),
        active: body.active !== false,
      },
    });
    return jsonOk({ plan }, 201);
  }

  // assign subscription
  const planId = Number(body?.planId);
  const companyId = body?.companyId != null ? Number(body.companyId) : null;
  const brokerId = body?.brokerId != null ? Number(body.brokerId) : null;
  if (!planId || (!companyId && !brokerId)) {
    return jsonError("planId and companyId or brokerId are required");
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return jsonError("Plan not found or inactive", 404);
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const expiryDate = body.expiryDate
    ? new Date(body.expiryDate)
    : new Date(startDate.getTime() + plan.durationDays * 86400000);

  const status = computeSubscriptionStatus(expiryDate, "ACTIVE");
  const subscription = await prisma.subscription.create({
    data: {
      planId,
      companyId,
      brokerId,
      startDate,
      expiryDate,
      status,
    },
    include: { plan: true },
  });

  await notifySubscriptionChange(subscription.id, status);
  return jsonOk({ subscription }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const action = body?.action || "update";

  if (action === "toggle_plan") {
    const id = Number(body?.id);
    if (!id) return jsonError("id required");
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) return jsonError("Plan not found", 404);
    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { active: !plan.active },
    });
    return jsonOk({ plan: updated });
  }

  if (action === "update_plan") {
    const id = Number(body?.id);
    if (!id) return jsonError("id required");
    const current = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!current) return jsonError("Plan not found", 404);
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(body.name != null ? { name: String(body.name).trim() } : {}),
        ...(body.description != null ? { description: String(body.description) } : {}),
        ...(body.price != null ? { price: Number(body.price) } : {}),
        ...(body.durationDays != null ? { durationDays: Number(body.durationDays) } : {}),
        ...(body.accountType != null ? { accountType: String(body.accountType) } : {}),
        ...(body.maxMarkets !== undefined
          ? { maxMarkets: parsePlanLimit(body.maxMarkets) }
          : {}),
        ...(body.maxLivestockTypes !== undefined
          ? { maxLivestockTypes: parsePlanLimit(body.maxLivestockTypes) }
          : {}),
        ...(body.active != null ? { active: Boolean(body.active) } : {}),
      },
    });
    return jsonOk({ plan });
  }

  if (action === "delete_plan") {
    const id = Number(body?.id);
    if (!id) return jsonError("id required");
    const assigned = await prisma.subscription.count({ where: { planId: id } });
    if (assigned > 0) {
      return jsonError("This plan has subscriptions. Deactivate it instead of deleting.", 409);
    }
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) return jsonError("Plan not found", 404);
    await prisma.subscriptionPlan.delete({ where: { id } });
    return jsonOk({ ok: true });
  }

  if (action === "approve_renewal") {
    const proofId = Number(body?.id);
    if (!proofId) return jsonError("id required");
    const proof = await prisma.subscriptionPaymentProof.findUnique({
      where: { id: proofId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!proof) return jsonError("Payment notice not found", 404);
    if (proof.status !== "PENDING") return jsonError("This payment was already reviewed", 409);

    const {
      isFreePlanPrice,
      parsePaidMonths,
      parseRequestedPlanId,
      planBaseMonthSpan,
      planInstallmentAmount,
    } = await import("@/lib/pricing-plans");
    const requestedPlanId = parseRequestedPlanId(proof.receiptFile);
    let applyPlan = proof.subscription.plan;
    if (requestedPlanId && requestedPlanId !== proof.subscription.planId) {
      const nextPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: requestedPlanId },
      });
      if (!nextPlan) return jsonError("Requested plan not found", 404);
      if (!nextPlan.active) return jsonError("Requested plan is no longer active", 409);
      applyPlan = nextPlan;
    }
    const isFree = isFreePlanPrice(applyPlan.price);
    const requestedMonths = parsePaidMonths(proof.receiptFile);
    const paidMonths = isFree
      ? null
      : requestedMonths ?? planBaseMonthSpan(applyPlan.durationDays);
    const accessDays = isFree
      ? (requestedMonths ?? 1) * 30
      : (paidMonths ?? planBaseMonthSpan(applyPlan.durationDays)) * 30;
    const paidAmount = paidMonths == null
      ? 0
      : planInstallmentAmount(
          Number(applyPlan.price),
          applyPlan.durationDays,
          paidMonths
        );
    const start = new Date();
    const expiryDate = new Date(start);
    expiryDate.setDate(expiryDate.getDate() + accessDays);
    const status = computeSubscriptionStatus(expiryDate, "ACTIVE");
    const grant = adsIncluded(applyPlan.durationDays);
    const previous = proof.subscription.adsRemaining;
    const adsRemaining = grant == null ? null : previous == null ? grant : previous + grant;

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: proof.subscriptionId },
        data: {
          startDate: start,
          expiryDate,
          status,
          planId: applyPlan.id,
          paidMonths,
          paidAmount,
          adsRemaining,
        },
      }),
      prisma.subscriptionPaymentProof.update({
        where: { id: proof.id },
        data: { status: "APPROVED", reviewedAt: start },
      }),
    ]);
    await notifySubscriptionChange(proof.subscriptionId, status);
    return jsonOk({ ok: true });
  }

  const id = Number(body?.id);
  if (!id) return jsonError("subscription id required");
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) return jsonError("Subscription not found", 404);

  if (action === "extend") {
    const days = Number(body?.days || 30);
    const expiryDate = new Date(existing.expiryDate);
    expiryDate.setDate(expiryDate.getDate() + days);
    const status = computeSubscriptionStatus(expiryDate, "ACTIVE");
    const subscription = await prisma.subscription.update({
      where: { id },
      data: { expiryDate, status },
    });
    await notifySubscriptionChange(id, status);
    return jsonOk({ subscription });
  }

  if (action === "cancel") {
    const subscription = await prisma.subscription.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await notifySubscriptionChange(id, "CANCELLED");
    return jsonOk({ subscription });
  }

  if (action === "reactivate") {
    const now = new Date();
    let expiryDate = new Date(existing.expiryDate);
    if (expiryDate <= now) {
      expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + Number(body?.days || 30));
    }
    const status = computeSubscriptionStatus(expiryDate, "ACTIVE");
    const subscription = await prisma.subscription.update({
      where: { id },
      data: { expiryDate, status },
    });
    await notifySubscriptionChange(id, status);
    return jsonOk({ subscription });
  }

  const expiryDate = body.expiryDate ? new Date(body.expiryDate) : existing.expiryDate;
  const status = body.status
    ? (body.status as never)
    : computeSubscriptionStatus(expiryDate, existing.status);
  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      ...(body.startDate != null ? { startDate: new Date(body.startDate) } : {}),
      expiryDate,
      status,
    },
  });
  return jsonOk({ subscription });
}
