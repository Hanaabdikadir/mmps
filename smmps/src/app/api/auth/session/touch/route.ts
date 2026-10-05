import { NextResponse } from "next/server";
import {
  getAuthCookie,
  isAdmin,
  resolveRequestAuthPortal,
  verifyToken,
} from "@/lib/auth";
import { touchAdminSession, validateAdminSession } from "@/lib/admin-session-store";
import { AUTH_PORTAL_HEADER } from "@/lib/auth-portal";

/** Keep Company / Super Admin server session alive while the dashboard is in use. */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const portal = await resolveRequestAuthPortal(
      url.searchParams.get("portal") || request.headers.get(AUTH_PORTAL_HEADER)
    );
    const token = await getAuthCookie(portal);
    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user || !isAdmin(user) || !user.sid) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const ua = request.headers.get("user-agent") || "";
    if (
      !(await validateAdminSession({
        sid: user.sid,
        email: user.email,
        userAgent: ua,
      }))
    ) {
      return NextResponse.json({ ok: false, reason: "session" }, { status: 401 });
    }

    const touched = await touchAdminSession(user.sid);
    if (!touched) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/session/touch] Database unavailable:", error);
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
