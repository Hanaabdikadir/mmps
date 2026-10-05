import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

export async function createVerificationCode(
  userId: number,
  userEmail: string
): Promise<{ code: string; expiresAt: Date } | { error: string }> {
  try {
    await prisma.verificationCode.deleteMany({
      where: { userId },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = await prisma.verificationCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });

    console.log(`[Verification] Code ${code} generated for ${userEmail}, expires at ${expiresAt.toISOString()}`);

    return { code, expiresAt };
  } catch (error) {
    console.error("[createVerificationCode]", error);
    return { error: "Failed to generate verification code" };
  }
}

export async function verifyCode(
  userId: number,
  code: string
): Promise<{ verified: boolean; message: string }> {
  try {
    const verification = await prisma.verificationCode.findUnique({
      where: { userId },
    });

    if (!verification) {
      return { verified: false, message: "No verification code found" };
    }

    if (verification.lockedUntil && new Date() < verification.lockedUntil) {
      const remainingMins = Math.ceil(
        (verification.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      return {
        verified: false,
        message: `Too many attempts. Try again in ${remainingMins} minutes.`,
      };
    }

    if (new Date() > verification.expiresAt) {
      return { verified: false, message: "Verification code expired" };
    }

    if (verification.code !== code.trim()) {
      const attempts = verification.attempts + 1;
      let lockedUntil = null;

      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.verificationCode.update({
        where: { userId },
        data: {
          attempts,
          lockedUntil,
        },
      });

      return {
        verified: false,
        message:
          attempts >= 5
            ? "Too many failed attempts. Account locked for 15 minutes."
            : `Invalid code. ${5 - attempts} attempts remaining.`,
      };
    }

    await prisma.verificationCode.update({
      where: { userId },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return { verified: true, message: "Code verified successfully" };
  } catch (error) {
    console.error("[verifyCode]", error);
    return { verified: false, message: "Verification failed" };
  }
}

export async function isCodeVerified(userId: number): Promise<boolean> {
  try {
    const verification = await prisma.verificationCode.findUnique({
      where: { userId },
    });
    return verification?.verified ?? false;
  } catch {
    return false;
  }
}

export async function getPendingVerificationCount(): Promise<number> {
  try {
    return await prisma.verificationCode.count({
      where: {
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });
  } catch {
    return 0;
  }
}

export async function getPendingApprovalsCount(): Promise<{
  total: number;
  needsVerification: number;
  verified: number;
}> {
  try {
    const pendingUsers = await prisma.user.count({
      where: { status: "PENDING" },
    });

    const verifiedCount = await prisma.verificationCode.count({
      where: {
        verified: true,
        user: { status: "PENDING" },
      },
    });

    const needsVerification = pendingUsers - verifiedCount;

    return {
      total: pendingUsers,
      needsVerification,
      verified: verifiedCount,
    };
  } catch (error) {
    console.error("[getPendingApprovalsCount]", error);
    return { total: 0, needsVerification: 0, verified: 0 };
  }
}
