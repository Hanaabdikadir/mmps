import { NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { authenticateUser } from "@/lib/login-service";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const rl = rateLimit(`login:${ip}`, 10, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    const body: unknown = await request.json();
    const email =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : "";
    const password =
      typeof (body as { password?: unknown }).password === "string"
        ? (body as { password: string }).password
        : "";
    const tabSlot =
      typeof (body as { tabSlot?: unknown }).tabSlot === "string"
        ? (body as { tabSlot: string }).tabSlot
        : "";

    const result = await authenticateUser({
      email,
      password,
      userAgent: request.headers.get("user-agent") || "",
      tabSlot,
    });

    if (!result.ok) {
      const status = result.error.includes("Invalid email or password")
        ? 401
        : result.error.includes("closed") || result.error.includes("approved")
          ? 403
          : 503;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      redirectTo: result.redirectTo,
      portal: result.portal,
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
