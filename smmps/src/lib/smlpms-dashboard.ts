import { prisma } from "@/lib/prisma";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";
import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import { refreshSubscriptionStatuses } from "@/lib/subscriptions";

export type SmlpmsDashboardStats = {
  totalCompanies: number;
  totalBrokers: number;
  totalUsers: number;
  pendingApprovals: number;
  approvedPrices: number;
  rejectedPrices: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  marketPriceCount: number;
  waterPriceCount: number;
  electricityPriceCount: number;
  livestockPriceCount: number;
  monthlySubmissions: { month: string; count: number }[];
  recentActivities: {
    id: number;
    action: string;
    entity: string;
    description: string | null;
    createdAt: Date;
    userName: string | null;
    userEmail: string | null;
  }[];
  recentNotifications: {
    id: number;
    title: string;
    message: string;
    sector: string;
    href: string | null;
    createdAt: Date;
    read: boolean;
  }[];
};

function splitNotificationMessage(raw: string): {
  message: string;
  href: string | null;
} {
  const text = raw.trim();
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1] || "";
  if (last.startsWith("/") || /^https?:\/\//i.test(last)) {
    return {
      message: lines.slice(0, -1).join(" ").trim() || text,
      href: last,
    };
  }
  const pathMatch = text.match(/(\/super-admin\S*)/);
  if (pathMatch?.[1]) {
    return {
      message: text.replace(pathMatch[1], "").trim(),
      href: pathMatch[1],
    };
  }
  return { message: text, href: null };
}

export async function getSmlpmsDashboardStats(): Promise<SmlpmsDashboardStats> {
  await refreshSubscriptionStatuses().catch(() => null);

  const [
    totalCompanies,
    totalBrokers,
    totalUsers,
    pendingRegistrations,
    pendingMarket,
    pendingLivestock,
    pendingWater,
    pendingElec,
    approvedMarket,
    approvedLivestock,
    approvedWater,
    approvedElec,
    rejectedMarket,
    rejectedLivestock,
    rejectedWater,
    rejectedElec,
    activeSubscriptions,
    expiredSubscriptions,
    marketPriceCount,
    recentNotificationsRaw,
  ] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.livestockBroker.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { deletedAt: null, role: { not: "SUPER_ADMIN" } },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        status: "PENDING",
        role: { not: "SUPER_ADMIN" },
      },
    }),
    prisma.marketPrice.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.livestockPrice.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.waterPrice.count({ where: { status: "PENDING" } }),
    prisma.electricityPrice.count({ where: { status: "PENDING" } }),
    prisma.marketPrice.count({ where: { status: "APPROVED", deletedAt: null } }),
    prisma.livestockPrice.count({ where: { status: "APPROVED", deletedAt: null } }),
    prisma.waterPrice.count({ where: { status: "APPROVED" } }),
    prisma.electricityPrice.count({ where: { status: "APPROVED" } }),
    prisma.marketPrice.count({ where: { status: "REJECTED", deletedAt: null } }),
    prisma.livestockPrice.count({ where: { status: "REJECTED", deletedAt: null } }),
    prisma.waterPrice.count({ where: { status: "REJECTED" } }),
    prisma.electricityPrice.count({ where: { status: "REJECTED" } }),
    prisma.subscription.count({
      where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    }),
    prisma.subscription.count({
      where: { status: { in: ["EXPIRED", "CANCELLED"] } },
    }),
    prisma.marketPrice.count({ where: { deletedAt: null } }),
    prisma.notification.findMany({
      where: { user: { role: "SUPER_ADMIN", deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [marketCreated, livestockCreated, waterCreated, elecCreated] =
    await Promise.all([
      prisma.marketPrice.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.livestockPrice.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.waterPrice.findMany({
        where: { dateRecorded: { gte: sixMonthsAgo } },
        select: { dateRecorded: true },
      }),
      prisma.electricityPrice.findMany({
        where: { dateRecorded: { gte: sixMonthsAgo } },
        select: { dateRecorded: true },
      }),
    ]);

  const monthMap = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }
  const bump = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + 1);
  };
  marketCreated.forEach((r) => bump(r.createdAt));
  livestockCreated.forEach((r) => bump(r.createdAt));
  waterCreated.forEach((r) => bump(r.dateRecorded));
  elecCreated.forEach((r) => bump(r.dateRecorded));

  return {
    totalCompanies,
    totalBrokers,
    totalUsers,
    pendingApprovals:
      pendingRegistrations +
      pendingMarket +
      pendingLivestock +
      pendingWater +
      pendingElec,
    approvedPrices:
      approvedMarket + approvedLivestock + approvedWater + approvedElec,
    rejectedPrices:
      rejectedMarket + rejectedLivestock + rejectedWater + rejectedElec,
    activeSubscriptions,
    expiredSubscriptions,
    marketPriceCount,
    waterPriceCount: MOGADISHU_WATER_PROVIDERS.length,
    electricityPriceCount: MOGADISHU_ELECTRICITY_PROVIDERS.length,
    livestockPriceCount: totalBrokers,
    monthlySubmissions: [...monthMap.entries()].map(([month, count]) => ({
      month,
      count,
    })),
    recentActivities: [],
    recentNotifications: recentNotificationsRaw.map((n) => {
      const parsed = splitNotificationMessage(n.message);
      return {
        id: n.id,
        title: n.title,
        message: parsed.message,
        sector: n.sector || "system",
        href: parsed.href,
        createdAt: n.createdAt,
        read: n.read,
      };
    }),
  };
}
