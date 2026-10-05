import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AUTH_PORTAL_HEADER } from "@/lib/auth-portal";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await getCurrentUser(
      url.searchParams.get("portal") || request.headers.get(AUTH_PORTAL_HEADER)
    );
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[auth/me] Database unavailable:", error);
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
