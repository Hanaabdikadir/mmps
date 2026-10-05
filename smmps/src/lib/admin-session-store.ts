import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import type { Role } from "@prisma/client";

export type AdminSessionRecord = {
  sid: string;
  userId: number;
  email: string;
  role: Role;
  userAgentHash: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

/** Absolute max age for an admin session (even if idle guard misses). */
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
/** Server-side idle backup (slightly above client 10 min). */
export const ADMIN_SESSION_IDLE_MS = 12 * 60 * 1000; // 12 minutes

export function hashUserAgent(userAgent: string): string {
  return createHash("sha256")
    .update(userAgent || "unknown")
    .digest("hex")
    .slice(0, 40);
}

/**
 * Create a new admin session for this tab. Other tabs keep their own sessions
 * so Super Admin and company/broker admins can stay signed in together.
 */
export async function createAdminSession(opts: {
  userId: number;
  role: Role;
  userAgent: string;
}): Promise<AdminSessionRecord> {
  const now = new Date();
  const id = randomBytes(24).toString("hex");
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_MAX_AGE_MS);
  const session = await withDbTimeout(
    prisma.adminSession.create({
      data: {
        id,
        userId: opts.userId,
        role: opts.role,
        userAgentHash: hashUserAgent(opts.userAgent),
        lastSeenAt: now,
        expiresAt,
      },
      include: { user: { select: { email: true } } },
    })
  );
  return {
    sid: session.id,
    userId: session.userId,
    email: session.user.email,
    role: session.role,
    userAgentHash: session.userAgentHash,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function validateAdminSession(opts: {
  sid?: string | null;
  email: string;
  userAgent: string;
}): Promise<boolean> {
  const sid = opts.sid?.trim();
  if (!sid) return false;
  const email = opts.email.trim().toLowerCase();
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - ADMIN_SESSION_IDLE_MS);
  const session = await withDbTimeout(
    prisma.adminSession.findFirst({
      where: {
        id: sid,
        revokedAt: null,
        expiresAt: { gt: now },
        lastSeenAt: { gt: idleCutoff },
        user: { email },
      },
      select: { userAgentHash: true },
    })
  );
  if (!session) return false;
  // Bind session to this browser (User-Agent). Another browser cannot reuse the cookie.
  if (session.userAgentHash !== hashUserAgent(opts.userAgent)) {
    return false;
  }
  return true;
}

export async function touchAdminSession(sid: string): Promise<boolean> {
  const now = new Date();
  const result = await withDbTimeout(
    prisma.adminSession.updateMany({
      where: {
        id: sid,
        revokedAt: null,
        expiresAt: { gt: now },
        lastSeenAt: {
          gt: new Date(now.getTime() - ADMIN_SESSION_IDLE_MS),
        },
      },
      data: { lastSeenAt: now },
    })
  );
  return result.count === 1;
}

export async function revokeAdminSession(sid: string): Promise<void> {
  await withDbTimeout(
    prisma.adminSession.updateMany({
      where: { id: sid, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  );
}

export async function revokeAdminSessionsForEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await withDbTimeout(
    prisma.adminSession.updateMany({
      where: { user: { email: normalized }, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  );
}
