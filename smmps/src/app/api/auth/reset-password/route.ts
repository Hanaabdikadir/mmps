import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import { hashPassword } from "@/lib/auth";
import {
  consumePasswordResetToken,
  peekPasswordResetToken,
} from "@/lib/password-reset-store";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() || "";
    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    const peek = await peekPasswordResetToken(token);
    if (!peek) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    return NextResponse.json({
      valid: true,
      email: peek.email,
      expiresAt: peek.expiresAt,
    });
  } catch (error) {
    console.error("[auth/reset-password GET] Database unavailable:", error);
    return NextResponse.json(
      { error: "Password reset service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const rl = rateLimit(`reset:${ip}`, 8, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    const body: unknown = await request.json().catch(() => ({}));
    const token =
      typeof (body as { token?: unknown }).token === "string"
        ? (body as { token: string }).token.trim()
        : "";
    const password =
      typeof (body as { password?: unknown }).password === "string"
        ? (body as { password: string }).password
        : "";
    const confirmPassword =
      typeof (body as { confirmPassword?: unknown }).confirmPassword === "string"
        ? (body as { confirmPassword: string }).confirmPassword
        : "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset link is missing or invalid" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    let consumed: { email: string } | null;
    try {
      consumed = await consumePasswordResetToken(token);
    } catch (dbError) {
      console.error("[auth/reset-password] Token lookup failed:", dbError);
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable" },
        { status: 503 }
      );
    }
    if (!consumed) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const email = consumed.email;
    try {
      const user = await withDbTimeout(
        prisma.user.findUnique({ where: { email } })
      );
      if (user) {
        await withDbTimeout(
          prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(password) },
          })
        );
      } else {
        return NextResponse.json(
          { error: "Account not found for this reset link" },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error("[auth/reset-password] Database update failed:", dbError);
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { error: "Could not reset password" },
      { status: 500 }
    );
  }
}
