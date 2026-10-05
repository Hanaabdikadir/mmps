import { NextResponse } from "next/server";
import { verifyCode, isCodeVerified } from "@/lib/verification-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code are required" },
        { status: 400 }
      );
    }

    const result = await verifyCode(userId, code);

    if (result.verified) {
      // Keep the registration pending until the responsible broker admin reviews it.
      await prisma.user.update({
        where: { id: userId },
        data: { status: "PENDING" }, // Keep PENDING but now code is verified
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[verify-code]", error);
    return NextResponse.json(
      { error: "Verification failed", verified: false },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userIdStr = url.searchParams.get("userId");
    
    if (!userIdStr) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr, 10);
    const verified = await isCodeVerified(userId);

    return NextResponse.json({ verified });
  } catch (error) {
    console.error("[verify-code GET]", error);
    return NextResponse.json(
      { error: "Check failed", verified: false },
      { status: 500 }
    );
  }
}
