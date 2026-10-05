import { subDays } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import type { AuthUser } from "@/lib/auth";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";

export interface DashboardStats {
  livestockCount: number;
  waterCount: number;
  electricityCount: number;
  dailyUpdates: number;
  monthlyAvgLivestock: number | null;
  monthlyAvgWater: number | null;
  monthlyAvgElectricity: number | null;
  userCount?: number;
  adminCount?: number;
  reportCount?: number;
}

export interface TrendPoint {
  dateRecorded: Date;
  value: number;
}

export interface ActivityItem {
  id: string;
  sector: "livestock" | "water" | "electricity";
  label: string;
  detail: string;
  price: string;
  date: Date;
  by?: string;
}

export interface UserDashboardData {
  stats: DashboardStats;
  trends: {
    livestock: TrendPoint[];
    water: TrendPoint[];
    electricity: TrendPoint[];
  };
  notifications: {
    id: number;
    title: string;
    message: string;
    sector: string;
    read: boolean;
    createdAt: Date;
  }[];
  favorites: { id: number; sector: string; category: string }[];
}

export interface AdminDashboardData {
  stats: DashboardStats;
  trends: UserDashboardData["trends"];
  recentActivity: ActivityItem[];
}

const EMPTY_STATS: DashboardStats = {
  livestockCount: 0,
  waterCount: 0,
  electricityCount: 0,
  dailyUpdates: 0,
  monthlyAvgLivestock: null,
  monthlyAvgWater: null,
  monthlyAvgElectricity: null,
  userCount: 0,
  adminCount: 0,
  reportCount: 0,
};

const EMPTY_TRENDS: UserDashboardData["trends"] = {
  livestock: [],
  water: [],
  electricity: [],
};

async function fetchMarketStatsFromDb(): Promise<{
  stats: DashboardStats;
  trends: UserDashboardData["trends"];
}> {
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);
  const dayAgo = subDays(now, 1);

  const [
    livestockCount,
    waterCount,
    electricityCount,
    dailyLivestock,
    dailyWater,
    dailyElectricity,
    recentLivestock,
    recentWater,
    recentElectricity,
    livestockAvg,
    waterAvg,
    electricityAvg,
    userCount,
    adminCount,
    reportCount,
  ] = await Promise.all([
    prisma.livestockPrice.count(),
    prisma.waterPrice.count({ where: { waterType: UTILITY_SERVICE_TYPE } }),
    prisma.electricityPrice.count({
      where: { serviceType: UTILITY_SERVICE_TYPE },
    }),
    prisma.livestockPrice.count({ where: { dateRecorded: { gte: dayAgo } } }),
    prisma.waterPrice.count({
      where: { dateRecorded: { gte: dayAgo }, waterType: UTILITY_SERVICE_TYPE },
    }),
    prisma.electricityPrice.count({
      where: {
        dateRecorded: { gte: dayAgo },
        serviceType: UTILITY_SERVICE_TYPE,
      },
    }),
    prisma.livestockPrice.findMany({
      where: { dateRecorded: { gte: weekAgo } },
      orderBy: { dateRecorded: "asc" },
      select: { price: true, dateRecorded: true },
    }),
    prisma.waterPrice.findMany({
      where: { dateRecorded: { gte: weekAgo }, waterType: UTILITY_SERVICE_TYPE },
      orderBy: { dateRecorded: "asc" },
      select: { pricePerUnit: true, dateRecorded: true },
    }),
    prisma.electricityPrice.findMany({
      where: {
        dateRecorded: { gte: weekAgo },
        serviceType: UTILITY_SERVICE_TYPE,
      },
      orderBy: { dateRecorded: "asc" },
      select: { pricePerKwh: true, dateRecorded: true },
    }),
    prisma.livestockPrice.aggregate({
      _avg: { price: true },
      where: { dateRecorded: { gte: monthAgo } },
    }),
    prisma.waterPrice.aggregate({
      _avg: { pricePerUnit: true },
      where: { dateRecorded: { gte: monthAgo }, waterType: UTILITY_SERVICE_TYPE },
    }),
    prisma.electricityPrice.aggregate({
      _avg: { pricePerKwh: true },
      where: {
        dateRecorded: { gte: monthAgo },
        serviceType: UTILITY_SERVICE_TYPE,
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: { role: { in: ["COMPANY_ADMIN", "SUPER_ADMIN"] } } satisfies Prisma.UserWhereInput,
    }),
    prisma.report.count(),
  ]);

  return {
    stats: {
      livestockCount,
      waterCount,
      electricityCount,
      dailyUpdates: dailyLivestock + dailyWater + dailyElectricity,
      monthlyAvgLivestock: livestockAvg._avg.price
        ? Number(livestockAvg._avg.price)
        : null,
      monthlyAvgWater: waterAvg._avg.pricePerUnit
        ? Number(waterAvg._avg.pricePerUnit)
        : null,
      monthlyAvgElectricity: electricityAvg._avg.pricePerKwh
        ? Number(electricityAvg._avg.pricePerKwh)
        : null,
      userCount,
      adminCount,
      reportCount,
    },
    trends: {
      livestock: recentLivestock.map((d) => ({
        dateRecorded: d.dateRecorded,
        value: Number(d.price),
      })),
      water: recentWater.map((d) => ({
        dateRecorded: d.dateRecorded,
        value: Number(d.pricePerUnit),
      })),
      electricity: recentElectricity.map((d) => ({
        dateRecorded: d.dateRecorded,
        value: Number(d.pricePerKwh),
      })),
    },
  };
}

async function fetchMarketStats(): Promise<{
  stats: DashboardStats;
  trends: UserDashboardData["trends"];
}> {
  try {
    return await withDbTimeout(fetchMarketStatsFromDb());
  } catch {
    return { stats: EMPTY_STATS, trends: EMPTY_TRENDS };
  }
}

export async function getUserDashboardData(
  user: AuthUser
): Promise<UserDashboardData> {
  try {
    const [market, notifications, favorites] = await withDbTimeout(
      Promise.all([
        fetchMarketStats(),
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.favorite.findMany({
          where: { userId: user.id },
          orderBy: { id: "desc" },
          take: 6,
        }),
      ])
    );

    return {
      stats: market.stats,
      trends: market.trends,
      notifications,
      favorites,
    };
  } catch {
    return {
      stats: EMPTY_STATS,
      trends: EMPTY_TRENDS,
      notifications: [],
      favorites: [],
    };
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const market = await fetchMarketStats();

    const [livestock, water, electricity] = await withDbTimeout(
      Promise.all([
        prisma.livestockPrice.findMany({
          take: 6,
          orderBy: { dateRecorded: "desc" },
          include: { updatedBy: { select: { fullName: true } } },
        }),
        prisma.waterPrice.findMany({
          where: { waterType: UTILITY_SERVICE_TYPE },
          take: 6,
          orderBy: { dateRecorded: "desc" },
          include: { updatedBy: { select: { fullName: true } } },
        }),
        prisma.electricityPrice.findMany({
          where: { serviceType: UTILITY_SERVICE_TYPE },
          take: 6,
          orderBy: { dateRecorded: "desc" },
          include: { updatedBy: { select: { fullName: true } } },
        }),
      ])
    );

    const recentActivity: ActivityItem[] = [
      ...livestock.map((r) => ({
        id: `l-${r.id}`,
        sector: "livestock" as const,
        label: r.animalType,
        detail: "Mogadishu",
        price: `$${Number(r.price).toFixed(2)}`,
        date: r.dateRecorded,
        by: r.updatedBy.fullName,
      })),
      ...water.map((r) => ({
        id: `w-${r.id}`,
        sector: "water" as const,
        label: r.waterType,
        detail: r.providerName,
        price: `$${Number(r.pricePerUnit).toFixed(2)}`,
        date: r.dateRecorded,
        by: r.updatedBy.fullName,
      })),
      ...electricity.map((r) => ({
        id: `e-${r.id}`,
        sector: "electricity" as const,
        label: r.serviceType,
        detail: r.providerName,
        price: `$${Number(r.pricePerKwh).toFixed(2)}/kWh`,
        date: r.dateRecorded,
        by: r.updatedBy.fullName,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return {
      stats: market.stats,
      trends: market.trends,
      recentActivity,
    };
  } catch {
    return {
      stats: EMPTY_STATS,
      trends: EMPTY_TRENDS,
      recentActivity: [],
    };
  }
}
