import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import { isValidRegisterEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/password-reset-store";
import {
  buildPasswordResetUrl,
  maskEmail,
  sendPasswordResetEmail,
} from "@/lib/mailer";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const rl = rateLimit(`forgot:${ip}`, 5, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    const body: unknown = await request.json().catch(() => ({}));
    const emailRaw =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : "";
    const email = emailRaw.trim().toLowerCase();

    if (!email || !isValidRegisterEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 }
      );
    }

    let user: { fullName: string; email: string } | null;

    try {
      user = await withDbTimeout(
        prisma.user.findUnique({
          where: { email },
          select: { fullName: true, email: true },
        })
      );
    } catch (dbError) {
      console.error("[auth/forgot-password] Database unavailable:", dbError);
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable" },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found for that email" },
        { status: 404 }
      );
    }

    let token: string;
    let code: string;
    try {
      ({ token, code } = await createPasswordResetToken(email));
    } catch (dbError) {
      console.error("[auth/forgot-password] Token persistence failed:", dbError);
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable" },
        { status: 503 }
      );
    }

    const resetUrl = buildPasswordResetUrl(token);

    try {
      await sendPasswordResetEmail({
        to: email,
        resetUrl,
        code,
        fullName: user.fullName,
      });
    } catch (mailError) {
      console.error("[auth/forgot-password] mail send failed", mailError);
      return NextResponse.json(
        {
          error:
            "Fariinta Gmail-ka lama dirin. Hubi in aad ku qortay Gmail-ka saxda ah, eeg Spam, iskuna day mar kale.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailed: true,
      maskedEmail: maskEmail(email),
      message: "Check your Gmail for the confirmation code.",
    });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { error: "Could not process password reset request" },
      { status: 500 }
    );
  }
}
