import { NextResponse } from "next/server";
import { getCurrentUser, isApproved, isSuperAdmin } from "@/lib/auth";
import {
  listThreadMessages,
  markThreadReadForViewer,
  postThreadMessage,
} from "@/lib/registration-messages";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markThreadReadForViewer({
      threadUserId: user.id,
      viewerId: user.id,
    });
    const messages = await listThreadMessages(user.id, {
      skipWelcome: true,
      hideWelcome: isApproved(user),
    });
    return NextResponse.json({
      threadUserId: user.id,
      messages,
      unread: 0,
    });
  } catch (error) {
    console.error("[account/messages GET]", error);
    return NextResponse.json(
      { error: "Could not load messages" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Super Admin replies via /api/super-admin/registration-messages.
  // Livestock brokers and company admins message Super Admin from Notifications.
  if (isSuperAdmin(user) && isApproved(user)) {
    return NextResponse.json(
      { error: "Use the admin messaging endpoint" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  try {
    const message = await postThreadMessage({
      threadUserId: user.id,
      senderId: user.id,
      body: String(body.body ?? ""),
    });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Could not send message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
