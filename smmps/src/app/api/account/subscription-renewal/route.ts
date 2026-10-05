import { prisma } from "@/lib/prisma";
import { getCurrentUser, isCompanyAdmin, isLivestockBroker, type AuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-guard";
import { refreshSubscriptionStatuses } from "@/lib/subscriptions";
import { notifySuperAdmin } from "@/lib/system-notifications-store";
import { AUTH_PORTAL_HEADER } from "@/lib/auth-portal";
import {
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_PHONE_NUMBER,
  paymentMethodLabel,
  paymentMethodToken,
  parsePaymentMethodToken,
  parseRequestedPlanId,
  subscriptionPlanMatches,
  withRequestedPlanId,
  type PaymentMethodId,
} from "@/lib/pricing-plans";

/** True when the account must pay / renew again. */
function needsRenewalPayment(sub: {
  status: string;
  expiryDate: Date;
  adsRemaining: number | null;
}): boolean {
  if (sub.status === "EXPIRED") return true;
  if (sub.expiryDate.getTime() < Date.now()) return true;
  if (sub.adsRemaining != null && sub.adsRemaining <= 0) return true;
  return false;
}

async function syncExpiredStatus<
  T extends { id: number; status: string; expiryDate: Date },
>(subscription: T): Promise<T> {
  if (
    subscription.status !== "CANCELLED" &&
    subscription.status !== "EXPIRED" &&
    subscription.expiryDate.getTime() < Date.now()
  ) {
    await prisma.subscription
      .update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      })
      .catch(() => null);
    subscription.status = "EXPIRED";
  }
  return subscription;
}

async function userFromRequest(request: Request) {
  return getCurrentUser(request.headers.get(AUTH_PORTAL_HEADER));
}

async function accountScope(user: AuthUser) {
  if (user.brokerId && isLivestockBroker(user)) {
    return { companyId: null as number | null, brokerId: user.brokerId };
  }
  if (!isCompanyAdmin(user) && !isLivestockBroker(user)) return null;
  let companyId = user.companyId;
  if (!companyId && user.companySlug) {
    const company = await prisma.company.findUnique({
      where: { slug: user.companySlug },
      select: { id: true },
    });
    companyId = company?.id ?? null;
  }
  if (!companyId) return null;
  return { companyId, brokerId: null as number | null };
}

function sectorFromCompanyType(type: string | null | undefined): string {
  const t = String(type || "").toUpperCase();
  if (t === "WATER_SUPPLY" || t === "WATER") return "water";
  if (t === "ELECTRICITY") return "electricity";
  return "livestock";
}

function serializeProof(proof: {
  id: number;
  status: string;
  receiptFile: string;
  createdAt: Date;
}) {
  return {
    id: proof.id,
    status: proof.status,
    receiptFile: proof.receiptFile,
    paymentMethod: parsePaymentMethodToken(proof.receiptFile),
    requestedPlanId: parseRequestedPlanId(proof.receiptFile),
    createdAt: proof.createdAt.toISOString(),
  };
}

async function plansForScope(opts: {
  brokerId: number | null;
  companyId: number | null;
}) {
  const kind = opts.brokerId ? ("broker" as const) : ("company" as const);
  let sector = "livestock";
  if (opts.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: opts.companyId },
      select: { type: true },
    });
    sector = sectorFromCompanyType(company?.type);
  }
  const all = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: [{ durationDays: "asc" }, { price: "asc" }],
  });
  return all
    .filter((p) =>
      subscriptionPlanMatches(p.accountType, sector, kind, p.durationDays)
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      durationDays: p.durationDays,
      accountType: p.accountType,
      maxMarkets: p.maxMarkets,
      maxLivestockTypes: p.maxLivestockTypes,
    }));
}

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return jsonError("Unauthorized", 401);
  const scope = await accountScope(user);
  if (!scope) return jsonError("Forbidden", 403);

  await refreshSubscriptionStatuses().catch(() => null);

  let subscription = await prisma.subscription.findFirst({
    where: scope.brokerId ? { brokerId: scope.brokerId } : { companyId: scope.companyId! },
    include: { plan: true },
    orderBy: { expiryDate: "desc" },
  });

  const plans = await plansForScope(scope);

  if (!subscription) {
    return jsonOk({
      subscription: null,
      proof: null,
      plans,
      phone: PAYMENT_PHONE_NUMBER,
      accountName: PAYMENT_ACCOUNT_NAME,
    });
  }

  subscription = await syncExpiredStatus(subscription);

  const proof = await prisma.subscriptionPaymentProof.findFirst({
    where: { subscriptionId: subscription.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const { companyPlanTierFromPlan } = await import("@/lib/pricing-plans");
  const priceNum = Number(subscription.plan.price);
  const statusOk =
    subscription.status === "ACTIVE" || subscription.status === "EXPIRING_SOON";
  const tier = statusOk
    ? companyPlanTierFromPlan({
        price: priceNum,
        durationDays: subscription.plan.durationDays,
      })
    : null;

  let proofPayload: ReturnType<typeof serializeProof> & {
    requestedPlan: {
      id: number;
      name: string;
      price: string;
      durationDays: number;
    } | null;
  } | null = null;
  if (proof) {
    const base = serializeProof(proof);
    const rid = base.requestedPlanId;
    const fromList = rid ? plans.find((p) => p.id === rid) : null;
    let requestedPlan = fromList
      ? {
          id: fromList.id,
          name: fromList.name,
          price: fromList.price,
          durationDays: fromList.durationDays,
          maxMarkets: fromList.maxMarkets,
          maxLivestockTypes: fromList.maxLivestockTypes,
        }
      : null;
    if (rid && !requestedPlan) {
      const row = await prisma.subscriptionPlan.findUnique({ where: { id: rid } });
      if (row) {
        requestedPlan = {
          id: row.id,
          name: row.name,
          price: row.price.toString(),
          durationDays: row.durationDays,
          maxMarkets: row.maxMarkets,
          maxLivestockTypes: row.maxLivestockTypes,
        };
      }
    }
    proofPayload = { ...base, requestedPlan };
  }

  return jsonOk({
    phone: PAYMENT_PHONE_NUMBER,
    accountName: PAYMENT_ACCOUNT_NAME,
    plans,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      expiryDate: subscription.expiryDate.toISOString(),
      startDate: subscription.startDate.toISOString(),
      paidMonths: subscription.paidMonths,
      paidAmount: subscription.paidAmount?.toString() ?? null,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price.toString(),
        durationDays: subscription.plan.durationDays,
        tier,
      },
      adsRemaining: subscription.adsRemaining,
      needsPayment: needsRenewalPayment(subscription),
    },
    proof: proofPayload,
  });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return jsonError("Unauthorized", 401);
  const scope = await accountScope(user);
  if (!scope) return jsonError("Forbidden", 403);

  await refreshSubscriptionStatuses().catch(() => null);

  let subscription = await prisma.subscription.findFirst({
    where: scope.brokerId ? { brokerId: scope.brokerId } : { companyId: scope.companyId! },
    include: {
      plan: true,
      company: { select: { name: true, type: true } },
      broker: { select: { name: true } },
    },
    orderBy: { expiryDate: "desc" },
  });
  if (!subscription) return jsonError("No subscription to renew", 404);

  subscription = await syncExpiredStatus(subscription);

  if (!needsRenewalPayment(subscription)) {
    return jsonError(
      "Payment is only required after the plan ends or the advertisements are used up",
      409
    );
  }

  const pending = await prisma.subscriptionPaymentProof.findFirst({
    where: { subscriptionId: subscription.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) {
    return jsonError("A payment notice is already waiting for Super Admin", 409);
  }

  const body = (await request.json().catch(() => null)) as {
    planId?: number | string;
    paymentMethod?: string;
    cardHolder?: string;
    cardLast4?: string;
    cardExpiry?: string;
    evcTransactionId?: string;
    evcReferenceId?: string;
    evcAccountNo?: string;
    evcAmount?: number | string;
    evcReceiptToken?: string;
    payMonths?: number | string;
  } | null;

  const available = await plansForScope(scope);
  const requestedPlanId = Number(body?.planId || subscription.planId);
  const chosen =
    available.find((p) => p.id === requestedPlanId) ||
    available.find((p) => p.id === subscription.planId) ||
    null;
  if (!chosen) {
    return jsonError("Choose a valid subscription plan", 400);
  }
  const { planInstallmentAmount, planMonthSpan, withPaidMonths } = await import(
    "@/lib/pricing-plans"
  );
  const payMonths = Math.min(
    planMonthSpan(chosen.durationDays),
    Math.max(1, Number(body?.payMonths || 1) || 1)
  );
  const fullAmount = Number(chosen.price);
  const isFree = Number.isFinite(fullAmount) && fullAmount <= 0;
  const planAmount = isFree ? 0 : planInstallmentAmount(fullAmount, chosen.durationDays, payMonths);

  const methodRaw = String(body?.paymentMethod || "").trim().toLowerCase();
  const paymentMethod: PaymentMethodId | null =
    methodRaw === "evc" || methodRaw === "mastercard" || methodRaw === "visa"
      ? methodRaw
      : null;
  if (!isFree && !paymentMethod) {
    return jsonError("Choose EVC, MasterCard, or Visa", 400);
  }

  let receiptFile = isFree
    ? "method:free"
    : paymentMethodToken(paymentMethod!);
  if (!isFree && (paymentMethod === "mastercard" || paymentMethod === "visa")) {
    const last4 = String(body?.cardLast4 || "").replace(/\D/g, "").slice(-4);
    const expiry = String(body?.cardExpiry || "").trim().slice(0, 7);
    const holder = String(body?.cardHolder || "").trim().slice(0, 80);
    if (last4.length !== 4 || !expiry || !holder) {
      return jsonError(
        paymentMethod === "visa"
          ? "Enter valid Visa details"
          : "Enter valid MasterCard details",
        400
      );
    }
    receiptFile = `method:${paymentMethod}|****${last4}|${expiry}|${holder}`;
  }
  if (!isFree && paymentMethod === "evc") {
    const { verifyEvcReceiptToken } = await import("@/lib/evc-payment");
    const tx = String(body?.evcTransactionId || "").trim();
    const accountNo = String(body?.evcAccountNo || "").trim();
    const token = String(body?.evcReceiptToken || "").trim();
    const paidAmount = Number(body?.evcAmount);
    if (
      !tx ||
      !accountNo ||
      !token ||
      !Number.isFinite(paidAmount) ||
      Math.abs(paidAmount - planAmount) > 0.009 ||
      !verifyEvcReceiptToken({
        transactionId: tx,
        accountNo,
        amount: paidAmount,
        token,
      })
    ) {
      return jsonError(
        "Complete the real EVC payment first (approve the PIN on your phone).",
        400
      );
    }
    receiptFile = `method:evc|${tx}|${accountNo}|${paidAmount.toFixed(2)}`;
  }

  receiptFile = withPaidMonths(withRequestedPlanId(receiptFile, chosen.id), payMonths);

  const proof = await prisma.subscriptionPaymentProof.create({
    data: {
      subscriptionId: subscription.id,
      receiptFile,
      submittedById: user.id,
      status: "PENDING",
    },
  });

  const accountName =
    subscription.company?.name || subscription.broker?.name || user.fullName;
  const methodLabel = isFree
    ? "Free plan"
    : paymentMethodLabel(paymentMethod, "en");
  await notifySuperAdmin({
    title: "Subscription payment notice",
    message: `${accountName} confirmed ${methodLabel} for ${chosen.name} ($${chosen.price}).`,
    sector: "system",
    href: "/super-admin/subscriptions?tab=payments",
  }).catch(() => null);

  return jsonOk({
    proof: serializeProof(proof),
  });
}
