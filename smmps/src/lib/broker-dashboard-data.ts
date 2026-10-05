import {
  getCurrentUser,
  type AuthUser,
  checkPermission,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBrokerDisplayName } from "@/lib/broker-display-name";
import { syncUnlinkedLivestockBrokers } from "@/lib/promote-broker";
import {
  brokerPriceScope,
  brokerUsersWhere,
  isLivestockManagerBroker,
} from "@/lib/livestock-manager-broker";
import { redirect } from "next/navigation";

export async function loadBrokerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.brokerId) {
    await syncUnlinkedLivestockBrokers().catch(() => 0);
  } else if (isLivestockManagerBroker(user)) {
    await syncUnlinkedLivestockBrokers().catch(() => 0);
  }

  const props = await getBrokerDashboardProps(user);
  return { user, props };
}

export async function getBrokerDashboardProps(user: AuthUser) {
  const scope = brokerPriceScope(user);
  const usersWhere = await brokerUsersWhere(user);
  const isManager = isLivestockManagerBroker(user);
  const canApproveLivestockPrices = checkPermission(
    user,
    "APPROVE_LIVESTOCK_PRICE"
  );
  const canApproveBrokers = checkPermission(user, "APPROVE_BROKER");

  const [total, pending, approved, rejected, recent, sub, broker, users] =
    await Promise.all([
      prisma.livestockPrice.count({ where: scope }),
      prisma.livestockPrice.count({
        where: { ...scope, status: "PENDING" },
      }),
      prisma.livestockPrice.count({
        where: { ...scope, status: "APPROVED" },
      }),
      prisma.livestockPrice.count({
        where: { ...scope, status: "REJECTED" },
      }),
      prisma.livestockPrice.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      user.brokerId
        ? prisma.subscription.findFirst({
            where: {
              brokerId: user.brokerId,
              status: { in: ["ACTIVE", "EXPIRING_SOON"] },
            },
            include: { plan: true },
            orderBy: { expiryDate: "desc" },
          })
        : null,
      user.brokerId
        ? prisma.livestockBroker.findUnique({
            where: { id: user.brokerId },
            select: { name: true, livestockFocus: true },
          })
        : null,
      prisma.user.findMany({
        where: usersWhere,
        orderBy: [{ companyType: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          accountStatus: true,
          companyType: true,
          companyName: true,
          companyDistrict: true,
          createdAt: true,
        },
      }),
    ]);

  const seen = new Set<string>();
  const uniqueUsers = users.filter((u) => {
    const key = u.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sectionOrder = (email: string) => {
    const e = email.toLowerCase();
    if (e.startsWith("camel@")) return 0;
    if (e.startsWith("cattle@")) return 1;
    if (e.startsWith("goat@")) return 2;
    return 3;
  };
  uniqueUsers.sort(
    (a, b) =>
      sectionOrder(a.email) - sectionOrder(b.email) ||
      a.fullName.localeCompare(b.fullName)
  );

  const sectionLabel = isManager
    ? "Livestock Manager"
    : formatBrokerDisplayName(broker?.name || user.fullName, broker?.livestockFocus) ||
      "Livestock Broker";

  return {
    sectionLabel,
    sectionFocus: isManager
      ? "Camel · Cattle · Goat"
      : broker?.livestockFocus || null,
    isManager,
    canManageUsers: false,
    canApproveLivestockPrices,
    canApproveBrokers,
    stats: {
      total,
      pending,
      approved,
      rejected,
      users: uniqueUsers.length,
    },
    initialUsers: uniqueUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    recentPrices: recent.map((p) => ({
      id: p.id,
      animalType: p.animalType,
      price: p.price.toString(),
      currency: p.currency,
      marketLocation: p.marketLocation,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      rejectionReason: p.rejectionReason,
    })),
    subscriptionLabel: sub
      ? `${sub.plan.name} · until ${sub.expiryDate.toISOString().slice(0, 10)}`
      : null,
  };
}
