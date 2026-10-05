import { NextResponse } from "next/server";
import { resendEmailOtp, resetErrorMessage } from "@/lib/password-reset-store";
import { sendOtpEmail } from "@/lib/mailer";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

function readString(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * POST /api/auth/resend-login-code
 * Body: { loginToken: string }
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const rl = rateLimit(`resend-login:${ip}`, 5, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    const body: unknown = await request.json().catch(() => ({}));
    const loginToken = readString(body, "loginToken");
    if (!loginToken) {
      return NextResponse.json(
        {
          error: resetErrorMessage("INVALID_RESET_TOKEN"),
          code: "INVALID_RESET_TOKEN",
        },
        { status: 400 }
      );
    }

    const result = await resendEmailOtp(loginToken, "LOGIN");
    if (!result.ok) {
      return NextResponse.json(
        { error: resetErrorMessage(result.code), code: result.code },
        { status: 400 }
      );
    }

    try {
      await sendOtpEmail({
        to: result.email,
        code: result.code,
        purpose: "login",
        fullName: result.fullName,
      });
    } catch (mailError) {
      console.error("[auth/resend-login-code] mail send failed", mailError);
      return NextResponse.json(
        {
          error:
            "Unable to send the login code right now. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/resend-login-code]", error);
    return NextResponse.json(
      { error: "Could not resend the login code" },
      { status: 500 }
    );
  }
}
