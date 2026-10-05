import { NextResponse } from "next/server";
import {
  resetErrorMessage,
  verifyPasswordResetOtp,
  verifyPasswordResetOtpByEmail,
} from "@/lib/password-reset-store";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import {
  isSupabaseRecoveryConfigured,
  verifySupabaseRecoveryOtp,
} from "@/lib/supabase/auth-password";

function readString(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * POST /api/auth/verify-reset-code
 * Body: { resetToken: string, code: string, email?: string }
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const rl = rateLimit(`verify-reset:${ip}`, 15, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    const body: unknown = await request.json().catch(() => ({}));
    const resetToken = readString(body, "resetToken");
    const code = readString(body, "code");
    const email = readString(body, "email").toLowerCase();

    if (isSupabaseRecoveryConfigured()) {
      if (!email || !code) {
        return NextResponse.json(
          { error: resetErrorMessage("INVALID_OTP"), code: "INVALID_OTP" },
          { status: 400 }
        );
      }
      const verified = await verifySupabaseRecoveryOtp({ email, code });
      if (!verified.ok) {
        return NextResponse.json(
          { error: resetErrorMessage("INVALID_OTP"), code: "INVALID_OTP" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        resetToken: resetToken || "supabase",
        expiresAt: verified.expiresAt.toISOString(),
      });
    }

    if (!code || (!resetToken && !email)) {
      return NextResponse.json(
        { error: resetErrorMessage("INVALID_OTP"), code: "INVALID_OTP" },
        { status: 400 }
      );
    }

    const result = resetToken
      ? await verifyPasswordResetOtp(resetToken, code)
      : await verifyPasswordResetOtpByEmail(email, code);
    if (!result.ok) {
      const status = result.code === "TOO_MANY_ATTEMPTS" ? 429 : 400;
      return NextResponse.json(
        {
          error: resetErrorMessage(result.code),
          code: result.code,
          ...(typeof result.attemptsRemaining === "number"
            ? { attemptsRemaining: result.attemptsRemaining }
            : {}),
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      resetToken: result.authToken,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[auth/verify-reset-code]", error);
    return NextResponse.json(
      { error: "Could not verify the reset code" },
      { status: 500 }
    );
  }
}
