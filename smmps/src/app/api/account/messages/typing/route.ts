import { NextResponse } from "next/server";
import { getCurrentUser, isApproved, isSuperAdmin } from "@/lib/auth";
import {
  clearTyping,
  getTypingPresence,
  markTyping,
} from "@/lib/registration-typing";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    threadUserId: user.id,
    ...getTypingPresence({ threadUserId: user.id, viewerId: user.id }),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isSuperAdmin(user) && isApproved(user)) {
    return NextResponse.json(
      { error: "Use the admin typing endpoint" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    typing?: boolean;
  };
  const typing = body.typing !== false;
  if (typing) markTyping(user.id, user.id);
  else clearTyping(user.id, user.id);

  return NextResponse.json({
    ok: true,
    ...getTypingPresence({ threadUserId: user.id, viewerId: user.id }),
  });
}
