import "server-only";

import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import type { UserStatus } from "@/lib/rbac";
import type {
  RegistrationStatusResult,
} from "@/lib/registration-status";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function asUserStatus(value: string | null | undefined): UserStatus | null {
  if (value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
    return value;
  }
  return null;
}

/** Resolve public registration / account status by email (no secrets). */
export async function resolveRegistrationStatus(
  rawEmail: string
): Promise<RegistrationStatusResult> {
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes("@")) {
    return { status: "NOT_FOUND", email };
  }

  const user = await withDbTimeout(
    prisma.user.findUnique({
      where: { email },
      select: { status: true, email: true },
    })
  );
  const status = asUserStatus(user?.status);
  if (status) {
    return { status, email: user!.email };
  }

  return { status: "NOT_FOUND", email };
}
