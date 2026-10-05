import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { isLivestockBroker, isSuperAdmin } from "@/lib/auth";
import {
  deleteNotification,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyMany,
  deleteAllNotifications,
} from "@/lib/notifications";
import { postThreadMessage } from "@/lib/registration-messages";
import type { NotificationType } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  if (all && auth.user.role === "SUPER_ADMIN") {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
    return jsonOk({ notifications });
  }

  const notifications = await getUserNotifications(auth.user.id, 100);
  const unread = notifications.filter((n) => !n.read).length;
  return jsonOk({ notifications, unread });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const message = String(body?.message || "").trim();
  if (!title || !message) return jsonError("title and message are required");

  const brokerToSuperAdmin =
    isLivestockBroker(auth.user) &&
    (body?.audience === "super_admins" || body?.audience === "super_admin");

  if (brokerToSuperAdmin) {
    await postThreadMessage({
      threadUserId: auth.user.id,
      senderId: auth.user.id,
      body: message.length > 1 ? `${title}\n${message}` : message,
    });
    return jsonOk({ sent: 1 }, 201);
  }

  if (!isSuperAdmin(auth.user)) {
    const perm = await requirePermission("SEND_NOTIFICATIONS");
    if (perm.error) return perm.error;
  }

  let userIds: number[] = [];
  if (Array.isArray(body?.userIds) && body.userIds.length) {
    userIds = body.userIds.map(Number).filter(Boolean);
  } else if (body?.audience === "companies") {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["COMPANY_ADMIN"] },
        deletedAt: null,
        status: "APPROVED",
      },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  } else if (body?.audience === "brokers") {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["LIVESTOCK_BROKER_USER"] },
        deletedAt: null,
        status: "APPROVED",
      },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  } else {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, status: "APPROVED", role: { not: "PUBLIC" } },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  }

  await notifyMany(userIds, {
    title,
    message,
    type: (body?.type as NotificationType) || "SYSTEM_ANNOUNCEMENT",
    sector: "system",
    senderId: auth.user.id,
  });

  return jsonOk({ sent: userIds.length }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (body?.action === "mark_all_read") {
    await markAllNotificationsRead(auth.user.id);
    return jsonOk({ ok: true });
  }

  const id = Number(body?.id);
  if (!id) return jsonError("id is required");
  await markNotificationRead(auth.user.id, id);
  return jsonOk({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("all") === "1") {
    await deleteAllNotifications(auth.user.id);
    return jsonOk({ ok: true });
  }
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");
  await deleteNotification(auth.user.id, id);
  return jsonOk({ ok: true });
}
