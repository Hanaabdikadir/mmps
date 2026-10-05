import {
  adsIncluded,
  companyPlanTierFromPlan,
  isFreePlanPrice,
  planInstallmentAmount,
  planMonthSpan,
  type CompanyPlanTier,
} from "@/lib/pricing-plans";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { notifySuperAdmin } from "@/lib/system-notifications-store";

const EXPIRING_SOON_DAYS = 7;

export function computeSubscriptionStatus(
  expiryDate: Date,
  current: SubscriptionStatus = "ACTIVE"
): SubscriptionStatus {
  if (current === "CANCELLED") return "CANCELLED";
  const now = new Date();
  if (expiryDate.getTime() < now.getTime()) return "EXPIRED";
  const soon = new Date();
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
  if (expiryDate.getTime() <= soon.getTime()) return "EXPIRING_SOON";
  return "ACTIVE";
}

export async function refreshSubscriptionStatuses() {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRING_SOON", "EXPIRED"] } },
  });
  for (const sub of subs) {
    if (sub.status === "EXPIRED") continue;
    const next = computeSubscriptionStatus(sub.expiryDate, sub.status);
    if (next !== sub.status) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: next },
      });
      await notifySubscriptionChange(sub.id, next);
    }
  }
}

async function accountUserIds(companyId: number | null, brokerId: number | null) {
  if (companyId) {
    const users = await prisma.user.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  if (brokerId) {
    const users = await prisma.user.findMany({
      where: { brokerId, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  return [];
}

export async function notifySubscriptionChange(
  subscriptionId: number,
  status: SubscriptionStatus
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, company: { select: { name: true } }, broker: { select: { name: true } } },
  });
  if (!sub) return;

  const userIds = await accountUserIds(sub.companyId, sub.brokerId);
  const map: Record<
    SubscriptionStatus,
    { title: string; type: "SUBSCRIPTION_ACTIVATED" | "SUBSCRIPTION_EXPIRING" | "SUBSCRIPTION_EXPIRED" | "GENERAL"; message: string } | null
  > = {
    ACTIVE: {
      title: "Subscription activated",
      type: "SUBSCRIPTION_ACTIVATED",
      message: `Your ${sub.plan.name} subscription is now active until ${sub.expiryDate.toISOString().slice(0, 10)}.`,
    },
    EXPIRING_SOON: {
      title: "Subscription expiring soon",
      type: "SUBSCRIPTION_EXPIRING",
      message: `Your ${sub.plan.name} subscription expires on ${sub.expiryDate.toISOString().slice(0, 10)}.`,
    },
    EXPIRED: {
      title: "Subscription expired",
      type: "SUBSCRIPTION_EXPIRED",
      message: `Your ${sub.plan.name} subscription has expired.`,
    },
    CANCELLED: {
      title: "Subscription cancelled",
      type: "GENERAL",
      message: `Your ${sub.plan.name} subscription was cancelled.`,
    },
  };

  const payload = map[status];
  if (!payload) return;
  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        sector: "subscription",
      })
    )
  );

  if (status === "EXPIRED" || status === "EXPIRING_SOON") {
    const account = sub.company?.name || sub.broker?.name || "Account";
    const when = sub.expiryDate.toISOString().slice(0, 10);
    await notifySuperAdmin({
      title: status === "EXPIRED" ? "Subscription expired" : "Subscription expiring soon",
      message:
        status === "EXPIRED"
          ? `${account} — ${sub.plan.name} expired on ${when}.`
          : `${account} — ${sub.plan.name} expires on ${when}.`,
      sector: "system",
      href: "/super-admin/subscriptions",
    });
  }
}

export async function getActiveSubscriptionForAccount(opts: {
  companyId?: number | null;
  brokerId?: number | null;
}) {
  await refreshSubscriptionStatuses().catch(() => null);
  const where =
    opts.companyId != null
      ? { companyId: opts.companyId }
      : opts.brokerId != null
        ? { brokerId: opts.brokerId }
        : null;
  if (!where) return null;

  return prisma.subscription.findFirst({
    where: {
      ...where,
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
    include: { plan: true },
    orderBy: { expiryDate: "desc" },
  });
}

export async function requireActiveSubscription(opts: {
  companyId?: number | null;
  brokerId?: number | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const companyId = opts.companyId ?? null;
  const brokerId = opts.brokerId ?? null;
  if (!companyId && !brokerId) {
    return { ok: false, reason: "Subscription required or expired" };
  }
  const sub = await prisma.subscription.findFirst({
    where: companyId ? { companyId } : { brokerId: brokerId! },
    include: { plan: { select: { price: true } } },
    orderBy: { expiryDate: "desc" },
  });
  if (!sub || sub.status === "CANCELLED") {
    return { ok: false, reason: "Subscription required or expired" };
  }
  if (sub.status === "EXPIRED" || sub.expiryDate.getTime() < Date.now()) {
    if (sub.status !== "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
    }
    return { ok: false, reason: "Subscription required or expired" };
  }
  return { ok: true };
}

/** Active plan tier for company/broker feature gates (free / standard / premium). */
export async function getAccountPlanTier(opts: {
  companyId?: number | null;
  brokerId?: number | null;
}): Promise<{
  tier: CompanyPlanTier | null;
  planName: string | null;
  durationDays: number | null;
  price: number | null;
  status: string | null;
}> {
  const sub = await getActiveSubscriptionForAccount(opts);
  if (!sub?.plan) {
    return {
      tier: null,
      planName: null,
      durationDays: null,
      price: null,
      status: null,
    };
  }
  const price = Number(sub.plan.price);
  const planDays = Math.max(1, sub.plan.durationDays);
  return {
    tier: companyPlanTierFromPlan({
      price,
      durationDays: planDays,
    }),
    planName: sub.plan.name,
    durationDays: planDays,
    price: Number.isFinite(price) ? price : null,
    status: sub.status,
  };
}

/** Price and length used to decide how many tariff years the public page may show. */
export async function getPlanWindowForCompanySlug(slug: string): Promise<{
  price: number | null;
  durationDays: number | null;
}> {
  const company = await prisma.company.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!company) return { price: 0, durationDays: 30 };
  const access = await getAccountPlanTier({ companyId: company.id });
  if (access.price == null || access.durationDays == null) {
    return { price: 0, durationDays: 30 };
  }
  return { price: access.price, durationDays: access.durationDays };
}

/** Resolve utility company plan tier from public provider slug. */
export async function getPlanTierForCompanySlug(
  slug: string
): Promise<CompanyPlanTier> {
  const company = await prisma.company.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!company) return "free";
  const access = await getAccountPlanTier({ companyId: company.id });
  return access.tier ?? "free";
}

/** One posted price uses one advertisement. Unlimited plans are not counted. */
export async function consumeAdvertisement(opts: {
  companyId?: number | null;
  brokerId?: number | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sub = await getActiveSubscriptionForAccount(opts);
  if (!sub) return { ok: false, reason: "Subscription required or expired" };

  const allowance = adsIncluded(sub.plan.durationDays);
  if (allowance == null) return { ok: true };

  const current = sub.adsRemaining == null ? allowance : sub.adsRemaining;
  if (current <= 0) {
    return {
      ok: false,
      reason: "Your advertisements are used up. Buy this same plan again to post more.",
    };
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { adsRemaining: current - 1 },
  });
  return { ok: true };
}

async function defaultActivePlan(accountType?: string | null) {
  const type = accountType?.trim().toUpperCase() || null;
  if (type) {
    const typed = await prisma.subscriptionPlan.findFirst({
      where: {
        active: true,
        OR: [{ accountType: type }, { accountType: "ALL" }],
      },
      orderBy: [{ price: "asc" }, { durationDays: "asc" }, { id: "asc" }],
    });
    if (typed) return typed;
  }
  return prisma.subscriptionPlan.findFirst({
    where: { active: true },
    orderBy: [{ price: "asc" }, { id: "asc" }],
  });
}

type PlanLimits = {
  id: number;
  name?: string;
  price: { toNumber?: () => number } | number | string;
  durationDays: number;
  maxMarkets: number | null;
  maxLivestockTypes: number | null;
};

function planPriceNumber(price: PlanLimits["price"]): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") return Number(price) || 0;
  if (price && typeof price.toNumber === "function") return price.toNumber();
  return Number(price) || 0;
}

/** Cheapest active plan that covers the broker's market / livestock-type usage. */
export function pickLivestockPlanForUsage(
  plans: PlanLimits[],
  marketsUsed: number,
  typesUsed: number
): PlanLimits | null {
  const fitting = plans.filter((plan) => {
    const marketsOk =
      plan.maxMarkets == null || plan.maxMarkets >= Math.max(1, marketsUsed);
    const typesOk =
      plan.maxLivestockTypes == null ||
      plan.maxLivestockTypes >= Math.max(1, typesUsed);
    return marketsOk && typesOk;
  });
  if (fitting.length === 0) return null;
  return [...fitting].sort((a, b) => {
    const priceDiff = planPriceNumber(a.price) - planPriceNumber(b.price);
    if (priceDiff !== 0) return priceDiff;
    return a.durationDays - b.durationDays;
  })[0];
}

export function registrationPayMonths(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { pay_months?: unknown };
    const months = Number(parsed.pay_months);
    if (!Number.isFinite(months) || months < 1) return null;
    return Math.min(12, Math.max(1, Math.round(months)));
  } catch {
    return null;
  }
}

export function registrationPaidAmount(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { paid_amount?: unknown };
    const amount = Number(parsed.paid_amount);
    return Number.isFinite(amount) && amount >= 0
      ? Math.round(amount * 100) / 100
      : null;
  } catch {
    return null;
  }
}

export function registrationPlanId(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { plan_id?: unknown };
    const id = Number(parsed.plan_id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Extra markets chosen at registration (primary market is also on user.marketId). */
export function registrationMarketIds(raw?: string | null): number[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as { market_ids?: unknown };
    const rawIds = parsed.market_ids;
    const list = Array.isArray(rawIds)
      ? rawIds
      : typeof rawIds === "string"
        ? rawIds.split(/[|,]/)
        : [];
    return [
      ...new Set(
        list.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
  } catch {
    return [];
  }
}

/** Assign the Super Admin plan the applicant chose, or a sector-matching active plan. */
export async function ensureAccountSubscription(opts: {
  companyId?: number | null;
  brokerId?: number | null;
  planId?: number | null;
  accountType?: string | null;
  /** Paid months chosen at signup. Access ends when these days pass. */
  accessDays?: number | null;
  paidMonths?: number | null;
  paidAmount?: number | null;
}) {
  const companyId = opts.companyId ?? null;
  const brokerId = opts.brokerId ?? null;
  if (!companyId && !brokerId) return null;

  const existing = await prisma.subscription.findFirst({
    where: {
      ...(companyId ? { companyId } : { brokerId: brokerId! }),
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
  });
  const paidDays =
    opts.accessDays && opts.accessDays > 0 ? Math.round(opts.accessDays) : 0;
  if (existing) {
    const featurePlan = opts.planId
      ? await prisma.subscriptionPlan.findUnique({
          where: { id: opts.planId },
          select: { durationDays: true, price: true },
        })
      : await prisma.subscription.findUnique({
          where: { id: existing.id },
          select: { plan: { select: { durationDays: true, price: true } } },
        }).then((row) => row?.plan ?? null);
    const paidMonths =
      opts.paidMonths != null
        ? Math.min(
            planMonthSpan(featurePlan?.durationDays ?? 365),
            Math.max(1, Math.round(opts.paidMonths))
          )
        : paidDays > 0
          ? Math.min(12, Math.max(1, Math.round(paidDays / 30)))
          : null;
    const paidAmount =
      opts.paidAmount != null
        ? Math.round(opts.paidAmount * 100) / 100
        : paidMonths != null && featurePlan && !isFreePlanPrice(featurePlan.price)
          ? planInstallmentAmount(
              Number(featurePlan.price),
              featurePlan.durationDays,
              paidMonths
            )
          : null;
    if (!paidDays && paidMonths == null && paidAmount == null) return existing;
    const start = paidDays > 0 ? new Date() : undefined;
    const end =
      paidDays > 0 ? new Date(Date.now() + paidDays * 86400000) : undefined;
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        ...(opts.planId && opts.planId > 0 ? { planId: opts.planId } : {}),
        ...(start ? { startDate: start } : {}),
        ...(end ? { expiryDate: end, status: "ACTIVE" as const } : {}),
        ...(paidMonths != null || opts.paidMonths === null
          ? { paidMonths }
          : {}),
        ...(paidAmount != null ? { paidAmount } : {}),
        adsRemaining: adsIncluded(featurePlan?.durationDays ?? paidDays),
      },
    });
  }

  const requestedId = opts.planId && opts.planId > 0 ? opts.planId : null;
  const plan = requestedId
    ? (await prisma.subscriptionPlan.findFirst({
        where: { id: requestedId, active: true },
      })) ?? (await defaultActivePlan(opts.accountType))
    : await defaultActivePlan(opts.accountType);
  if (!plan) return null;

  const durationDays = plan.durationDays;
  const freeMonth = Number(plan.price) <= 0;
  const accessDays = freeMonth
    ? 30
    : opts.accessDays && opts.accessDays > 0
      ? opts.accessDays
      : durationDays;
  const paidMonths = freeMonth
    ? null
    : opts.paidMonths != null
      ? Math.min(planMonthSpan(durationDays), Math.max(1, Math.round(opts.paidMonths)))
      : opts.accessDays && opts.accessDays > 0
        ? Math.min(12, Math.max(1, Math.round(opts.accessDays / 30)))
        : null;
  const paidAmount =
    opts.paidAmount != null
      ? Math.round(opts.paidAmount * 100) / 100
      : paidMonths != null
        ? planInstallmentAmount(Number(plan.price), durationDays, paidMonths)
        : freeMonth
          ? 0
          : null;

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + Math.max(1, accessDays));
  return prisma.subscription.create({
    data: {
      companyId,
      brokerId,
      planId: plan.id,
      startDate: start,
      expiryDate: end,
      status: "ACTIVE",
      paidMonths,
      paidAmount,
      adsRemaining: adsIncluded(freeMonth ? 30 : durationDays),
    },
  });
}

/**
 * Backfill ACTIVE subscriptions:
 * - livestock brokers → matching livestock plan (by markets/types)
 * - electricity companies → Electricity Free (or cheapest electricity plan)
 * - water companies → Water Free (or cheapest water plan)
 */
export async function syncSubscriptionsForAllAccounts() {
  const [livestockPlans, electricityPlans, waterPlans, companies, brokers] =
    await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: {
          active: true,
          accountType: { in: ["LIVESTOCK", "BROKER"] },
        },
        orderBy: [{ price: "asc" }, { durationDays: "asc" }],
      }),
      prisma.subscriptionPlan.findMany({
        where: { active: true, accountType: "ELECTRICITY" },
        orderBy: [{ price: "asc" }, { durationDays: "asc" }],
      }),
      prisma.subscriptionPlan.findMany({
        where: { active: true, accountType: "WATER" },
        orderBy: [{ price: "asc" }, { durationDays: "asc" }],
      }),
      prisma.company.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, type: true },
      }),
      prisma.livestockBroker.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: {
          id: true,
          marketId: true,
          _count: {
            select: {
              assignedMarkets: true,
              authorizedCategories: true,
              authorizedTypes: true,
            },
          },
        },
      }),
    ]);

  if (
    livestockPlans.length === 0 &&
    electricityPlans.length === 0 &&
    waterPlans.length === 0
  ) {
    return {
      companiesCreated: 0,
      brokersCreated: 0,
      skipped: true as const,
      details: [] as string[],
    };
  }

  let companiesCreated = 0;
  let brokersCreated = 0;
  const details: string[] = [];

  for (const c of companies) {
    const accountType =
      c.type === "ELECTRICITY"
        ? "ELECTRICITY"
        : c.type === "WATER_SUPPLY"
          ? "WATER"
          : null;
    if (!accountType) continue;

    const sectorPlans =
      accountType === "ELECTRICITY" ? electricityPlans : waterPlans;
    const plan = sectorPlans[0];
    if (!plan) continue;

    const before = await prisma.subscription.findFirst({
      where: { companyId: c.id, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
      select: { id: true },
    });
    const row = await ensureAccountSubscription({
      companyId: c.id,
      planId: plan.id,
      accountType,
    });
    if (!before && row) {
      companiesCreated += 1;
      details.push(`company#${c.id} → ${plan.name}`);
    }
  }

  for (const b of brokers) {
    const marketsUsed = Math.max(
      b._count.assignedMarkets,
      b.marketId ? 1 : 0
    );
    // Plan "livestock types" = categories (camel/goat/cattle…), not every animal subtype.
    const typesUsed = Math.max(b._count.authorizedCategories, 1);
    const plan =
      pickLivestockPlanForUsage(livestockPlans, marketsUsed, typesUsed) ??
      livestockPlans[0];
    if (!plan) continue;

    const before = await prisma.subscription.findFirst({
      where: { brokerId: b.id, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
      select: { id: true, planId: true },
    });
    if (before) {
      if (before.planId !== plan.id) {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + Math.max(1, plan.durationDays));
        await prisma.subscription.update({
          where: { id: before.id },
          data: {
            planId: plan.id,
            startDate: start,
            expiryDate: end,
            status: "ACTIVE",
            adsRemaining: adsIncluded(plan.durationDays),
          },
        });
        details.push(
          `broker#${b.id} (${marketsUsed}m/${typesUsed}t) updated → ${plan.name ?? `#${plan.id}`}`
        );
      }
      continue;
    }
    const row = await ensureAccountSubscription({
      brokerId: b.id,
      planId: plan.id,
      accountType: "LIVESTOCK",
    });
    if (row) {
      brokersCreated += 1;
      details.push(
        `broker#${b.id} (${marketsUsed}m/${typesUsed}t) → ${plan.name ?? `#${plan.id}`}`
      );
    }
  }

  return {
    companiesCreated,
    brokersCreated,
    skipped: false as const,
    details,
  };
}
