import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function createNotification(input: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  sector?: string;
  senderId?: number | null;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || "GENERAL",
      sector: input.sector || "system",
      senderId: input.senderId ?? null,
      read: false,
    },
  });
}

export async function notifyMany(
  userIds: number[],
  payload: {
    title: string;
    message: string;
    type?: NotificationType;
    sector?: string;
    senderId?: number | null;
  }
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map((userId) =>
      createNotification({
        userId,
        ...payload,
      })
    )
  );
}

export async function notifyRole(
  roles: Array<"SUPER_ADMIN" | "COMPANY_ADMIN" | "LIVESTOCK_BROKER_USER">,
  payload: {
    title: string;
    message: string;
    type?: NotificationType;
    sector?: string;
    senderId?: number | null;
  }
) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      deletedAt: null,
      status: { not: "REJECTED" },
    },
    select: { id: true },
  });
  await notifyMany(
    users.map((u) => u.id),
    payload
  );
}

export async function getUserNotifications(userId: number, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(userId: number, id: number) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: number) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function deleteNotification(userId: number, id: number) {
  return prisma.notification.deleteMany({
    where: { id, userId },
  });
}

export async function deleteAllNotifications(userId: number) {
  return prisma.notification.deleteMany({
    where: { userId },
  });
}
