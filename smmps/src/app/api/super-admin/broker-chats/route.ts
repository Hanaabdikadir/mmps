import { NextResponse } from "next/server";
import { getCurrentUser, isApproved, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { marketNamesFromBroker } from "@/lib/livestock-broker-chat";

export async function GET() {
  const user = await getCurrentUser("super");
  if (!user || !isApproved(user) || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rows = await prisma.registrationMessage.findMany({
    where: {
      threadUser: {
        deletedAt: null,
        OR: [
          {
            role: {
              in: ["LIVESTOCK_BROKER_USER", "COMPANY_ADMIN"],
            },
          },
          { brokerId: { not: null } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 800,
    include: {
      threadUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          brokerId: true,
          companyName: true,
          companySector: true,
          broker: {
            select: {
              name: true,
              market: { select: { name: true } },
              assignedMarkets: {
                include: {
                  market: { select: { name: true, deletedAt: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const wroteToAdmin = new Set(
    rows.filter((row) => row.senderId === row.threadUserId).map((row) => row.threadUserId)
  );

  const seen = new Set<number>();
  const threads: Array<{
    userId: number;
    name: string;
    email: string;
    marketLabel: string;
    lastMessage: string;
    lastAt: string;
    unread: number;
  }> = [];

  for (const row of rows) {
    if (!wroteToAdmin.has(row.threadUserId)) continue;
    if (seen.has(row.threadUserId)) continue;
    seen.add(row.threadUserId);
    const isBroker =
      Boolean(row.threadUser.brokerId) ||
      row.threadUser.role === "LIVESTOCK_BROKER_USER";
    const markets = marketNamesFromBroker(row.threadUser.broker);
    threads.push({
      userId: row.threadUser.id,
      name: row.threadUser.fullName,
      email: row.threadUser.email,
      marketLabel: isBroker
        ? markets.join(" · ") ||
          row.threadUser.companyName?.trim() ||
          row.threadUser.broker?.name?.trim() ||
          "Suuq lama cayimin"
        : row.threadUser.companyName?.trim() ||
          row.threadUser.companySector?.trim() ||
          "Company",
      lastMessage: row.body,
      lastAt: row.createdAt.toISOString(),
      unread: 0,
    });
  }

  const unreadRows = await prisma.registrationMessage.groupBy({
    by: ["threadUserId"],
    where: {
      threadUserId: { in: threads.map((t) => t.userId) },
      readAt: null,
      sender: { role: { not: "SUPER_ADMIN" } },
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(
    unreadRows.map((r) => [r.threadUserId, r._count._all])
  );

  return NextResponse.json({
    threads: threads.map((t) => ({
      ...t,
      unread: unreadMap.get(t.userId) || 0,
    })),
  });
}
