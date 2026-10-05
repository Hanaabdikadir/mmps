import { prisma } from "@/lib/prisma";

export type NotificationSector =
  | "water"
  | "electricity"
  | "livestock"
  | "system"
  | "users";

export type SystemNotification = {
  id: string;
  title: string;
  message: string;
  sector: NotificationSector;
  type?: string;
  senderId?: number | null;
  read: boolean;
  createdAt: string;
  href?: string;
};

const MAX_ITEMS = 300;

function toSystemNotification(row: {
  id: number;
  title: string;
  message: string;
  sector: string;
  type?: string;
  senderId?: number | null;
  read: boolean;
  createdAt: Date;
}): SystemNotification {
  return {
    id: String(row.id),
    title: row.title,
    message: row.message,
    sector: row.sector as NotificationSector,
    type: row.type,
    senderId: row.senderId ?? null,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function notifySuperAdmin(input: {
  title: string;
  message: string;
  sector?: NotificationSector;
  href?: string;
}): Promise<SystemNotification | null> {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: "APPROVED", deletedAt: null },
    select: { id: true },
  });
  if (admins.length === 0) return null;
  const message = input.href
    ? `${input.message.trim()}\n${input.href}`
    : input.message.trim();
  const rows = await prisma.$transaction(
    admins.map(({ id: userId }) =>
      prisma.notification.create({
        data: {
          userId,
          title: input.title.trim(),
          message,
          sector: input.sector ?? "system",
          type: "GENERAL",
        },
      })
    )
  );
  return toSystemNotification(rows[0]);
}

export async function listSystemNotifications(limit = 50): Promise<SystemNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { user: { role: "SUPER_ADMIN", deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, MAX_ITEMS),
  });
  return rows.map(toSystemNotification);
}

export async function countUnreadNotifications(): Promise<number> {
  return prisma.notification.count({
    where: { read: false, user: { role: "SUPER_ADMIN", deletedAt: null } },
  });
}

export async function markNotificationRead(
  id: string,
  read = true
): Promise<SystemNotification | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;
  const existing = await prisma.notification.findFirst({
    where: { id: numericId, user: { role: "SUPER_ADMIN", deletedAt: null } },
  });
  if (!existing) return null;
  return toSystemNotification(
    await prisma.notification.update({ where: { id: numericId }, data: { read } })
  );
}

export async function markAllNotificationsRead(): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { read: false, user: { role: "SUPER_ADMIN", deletedAt: null } },
    data: { read: true },
  });
  return result.count;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return false;
  const result = await prisma.notification.deleteMany({
    where: { id: numericId, user: { role: "SUPER_ADMIN", deletedAt: null } },
  });
  return result.count > 0;
}

export async function clearAllNotifications(): Promise<void> {
  await prisma.notification.deleteMany({
    where: { user: { role: "SUPER_ADMIN", deletedAt: null } },
  });
}
