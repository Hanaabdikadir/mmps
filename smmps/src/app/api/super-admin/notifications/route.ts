import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  countUnreadNotifications,
  deleteNotification,
  listSystemNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/system-notifications-store";

export async function GET(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(1, Number(searchParams.get("limit") || 80) || 80)
  );
  const items = await listSystemNotifications(limit);
  return NextResponse.json({
    notifications: items,
    unread: await countUnreadNotifications(),
    total: items.length,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const markAll = Boolean((body as { markAllRead?: unknown }).markAllRead);
  const id =
    typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";
  const read =
    typeof (body as { read?: unknown }).read === "boolean"
      ? (body as { read: boolean }).read
      : true;

  if (markAll) {
    const changed = await markAllNotificationsRead();
    return NextResponse.json({
      ok: true,
      changed,
      unread: await countUnreadNotifications(),
    });
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const item = await markNotificationRead(id, read);
  if (!item) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    notification: item,
    unread: await countUnreadNotifications(),
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const clearAll = Boolean((body as { clearAll?: unknown }).clearAll);
  const id =
    typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";

  if (clearAll) {
    const { clearAllNotifications } = await import(
      "@/lib/system-notifications-store"
    );
    await clearAllNotifications();
    return NextResponse.json({ ok: true, unread: 0 });
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const ok = await deleteNotification(id);
  if (!ok) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    unread: await countUnreadNotifications(),
  });
}
