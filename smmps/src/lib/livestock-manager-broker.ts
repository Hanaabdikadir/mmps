import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth";

/** Legacy email — no longer a portal role; blocked from broker dashboards. */
export const LIVESTOCK_MANAGER_EMAIL = "broker@livestock.so";

export const SECTION_BROKER_EMAILS = [
  "camel@livestock.so",
  "cattle@livestock.so",
  "goat@livestock.so",
] as const;

/** Manager-only routes — closed; Super Admin owns approvals / users. */
export const SECTION_BROKER_HIDDEN_HREFS = [
  "/broker/users",
  "/broker/notifications",
  "/broker/approvals",
] as const;

/** @deprecated Livestock Manager portal removed — always false for portal access. */
export function isLivestockManagerBroker(
  user: { email?: string | null } | null | undefined
): boolean {
  return (user?.email || "").toLowerCase() === LIVESTOCK_MANAGER_EMAIL;
}

export function isLegacyLivestockManagerEmail(email?: string | null): boolean {
  return (email || "").toLowerCase() === LIVESTOCK_MANAGER_EMAIL;
}

export function isSectionBrokerHiddenRoute(
  _user: { email?: string | null } | null | undefined,
  pathname: string
): boolean {
  return SECTION_BROKER_HIDDEN_HREFS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

/** Section brokers land on Overview, like water and electricity company portals. */
export function brokerHomeHref(
  _user?: { email?: string | null } | null
): string {
  return "/broker";
}

export async function getSectionBrokerIds(): Promise<number[]> {
  const rows = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      email: { in: [...SECTION_BROKER_EMAILS] },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function resolveSectionBrokerId(
  sectionEmail: string
): Promise<number | null> {
  const email = sectionEmail.trim().toLowerCase();
  if (
    !SECTION_BROKER_EMAILS.includes(
      email as (typeof SECTION_BROKER_EMAILS)[number]
    )
  ) {
    return null;
  }
  const broker = await prisma.livestockBroker.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  return broker?.id ?? null;
}

export function brokerPriceScope(user: AuthUser) {
  if (user.brokerId) {
    return { brokerId: user.brokerId, deletedAt: null as null };
  }
  return { updatedById: user.id, deletedAt: null as null };
}

export async function brokerUsersWhere(user: AuthUser) {
  const base = {
    deletedAt: null,
    role: { in: ["LIVESTOCK_BROKER_USER"] as Role[] },
  };

  return {
    ...base,
    email: { not: LIVESTOCK_MANAGER_EMAIL },
    OR: [
      { email: { in: [...SECTION_BROKER_EMAILS] } },
      ...(user.brokerId ? [{ brokerId: user.brokerId }] : []),
    ],
  };
}

export async function canManageBrokerUser(
  actor: { id: number; email: string; brokerId?: number | null },
  target: {
    id: number;
    email: string;
    brokerId: number | null;
    role: string;
  }
): Promise<boolean> {
  if (target.id === actor.id) return false;
  if (target.role === "SUPER_ADMIN") return false;
  if (target.email.toLowerCase() === LIVESTOCK_MANAGER_EMAIL) return false;
  if (isLegacyLivestockManagerEmail(actor.email)) return false;

  if (
    SECTION_BROKER_EMAILS.includes(
      target.email.toLowerCase() as (typeof SECTION_BROKER_EMAILS)[number]
    )
  ) {
    return false;
  }

  if (actor.brokerId && target.brokerId === actor.brokerId) return true;
  return false;
}
