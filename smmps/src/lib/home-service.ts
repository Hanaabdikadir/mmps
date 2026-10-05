import { prisma } from "@/lib/prisma";
import type { DashboardStats } from "@/lib/dashboard-service";

const EMPTY_STATS: DashboardStats = {
  livestockCount: 0,
  waterCount: 0,
  electricityCount: 0,
  dailyUpdates: 0,
  monthlyAvgLivestock: null,
  monthlyAvgWater: null,
  monthlyAvgElectricity: null,
};

export interface HomePageData {
  stats: DashboardStats;
  trends: {
    livestock: { dateRecorded: Date; value: number }[];
    water: { dateRecorded: Date; value: number }[];
    electricity: { dateRecorded: Date; value: number }[];
  };
  fromDatabase: boolean;
}

export async function getHomePageData(): Promise<HomePageData> {
  try {
    const { withDbTimeout } = await import("@/lib/db-timeout");
    await withDbTimeout(prisma.$queryRaw`SELECT 1`);
    const { getAdminDashboardData } = await import("@/lib/dashboard-service");
    const data = await getAdminDashboardData();
    return {
      stats: data.stats,
      trends: data.trends,
      fromDatabase: true,
    };
  } catch {
    return {
      stats: EMPTY_STATS,
      trends: { livestock: [], water: [], electricity: [] },
      fromDatabase: false,
    };
  }
}
