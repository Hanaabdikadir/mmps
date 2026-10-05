import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthCookie,
  getLogoutCookiesForPortal,
  resolveRequestAuthPortal,
  revokeCurrentAdminSession,
} from "@/lib/auth";
import { AUTH_PORTAL_HEADER } from "@/lib/auth-portal";
import { AUTH_TAB_COOKIE, sanitizeTabSlot } from "@/lib/auth-tab";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const portalHint =
    url.searchParams.get("portal") || request.headers.get(AUTH_PORTAL_HEADER);
  const portal = await resolveRequestAuthPortal(portalHint);
  const resolved = portal === "auto" ? "user" : portal;

  let unavailable = false;
  try {
    await revokeCurrentAdminSession(portalHint);
  } catch (error) {
    unavailable = true;
    console.error("[auth/logout] Session revocation failed:", error);
  }

  const legacy = await getAuthCookie("auto");
  const slot = sanitizeTabSlot(request.cookies.get(AUTH_TAB_COOKIE)?.value);
  const response = NextResponse.json(
    unavailable
      ? { error: "Authentication service is temporarily unavailable" }
      : { success: true },
    { status: unavailable ? 503 : 200 }
  );
  for (const cookie of getLogoutCookiesForPortal(resolved, legacy, slot)) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
