import { NextResponse } from "next/server";
import {
  getCurrentUser,
  isApproved,
  isSuperAdmin,
} from "@/lib/auth";
import {
  clearTyping,
  getTypingPresence,
  markTyping,
} from "@/lib/registration-typing";

async function requireSuperAdmin() {
  const user = await getCurrentUser("super");
  if (!user || !isApproved(user) || !isSuperAdmin(user)) return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const threadUserId = Number(new URL(request.url).searchParams.get("userId"));
  if (!Number.isFinite(threadUserId) || threadUserId <= 0) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  return NextResponse.json({
    threadUserId,
    ...getTypingPresence({ threadUserId, viewerId: admin.id }),
  });
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    userId?: number;
    typing?: boolean;
  };
  const threadUserId = Number(body.userId);
  if (!Number.isFinite(threadUserId) || threadUserId <= 0) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const typing = body.typing !== false;
  if (typing) markTyping(threadUserId, admin.id);
  else clearTyping(threadUserId, admin.id);

  return NextResponse.json({
    ok: true,
    ...getTypingPresence({ threadUserId, viewerId: admin.id }),
  });
}
