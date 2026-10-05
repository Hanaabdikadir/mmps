import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { withDbTimeout } from "./db-timeout";
import {
  validateAdminSession,
  revokeAdminSession,
} from "./admin-session-store";
import { type Role, type UserStatus } from "@prisma/client";
import { type Permission, hasPermission } from "./rbac-permissions";
import {
  AUTH_PATH_HEADER,
  AUTH_PORTAL_COOKIES,
  AUTH_PORTAL_HEADER,
  AUTH_PORTALS,
  type AuthPortal,
  authPortalForRole,
  inferAuthPortalFromPath,
  isAuthPortal,
  refererPathname,
} from "./auth-portal";
import {
  AUTH_TAB_COOKIE,
  AUTH_TAB_HEADER,
  sanitizeTabSlot,
  tabGuestCookieName,
  tabSessionCookieName,
} from "./auth-tab";

const DEV_JWT_FALLBACK = "mmps-dev-secret";

function resolveJwtSecret(): string {
  const fromEnv = String(process.env.JWT_SECRET || "").trim();
  const isProd = process.env.NODE_ENV === "production";

  if (fromEnv && fromEnv !== DEV_JWT_FALLBACK) {
    if (isProd && fromEnv.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters in production."
      );
    }
    return fromEnv;
  }

  // Production fail-closed: never accept a missing or default secret.
  if (isProd) {
    throw new Error(
      "JWT_SECRET is required in production. Set a strong secret in .env (min 32 chars)."
    );
  }

  return DEV_JWT_FALLBACK;
}

const JWT_SECRET = resolveJwtSecret();
const TOKEN_COOKIE = AUTH_PORTAL_COOKIES.user;
const LEGACY_TOKEN_COOKIE = "smmps_token";

/** Cookie / JWT lifetime for Company Admin + Super Admin (idle logout is 10 min). */
export const ADMIN_AUTH_MAX_AGE_SEC = 60 * 60 * 12; // 12 hours
const PUBLIC_AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  companyId?: number | null;
  brokerId?: number | null;
  /** Provider slug — company admins are scoped to this company only */
  companySlug?: string | null;
  companySector?: string | null;
  companyType?: string | null;
  /** Personal photo of the signed-in admin (not the company logo). */
  profilePicture?: string | null;
  /** Server session id — idle/session checks for this portal */
  sid?: string;
  iat?: number;
  exp?: number;
}

function isPrivilegedRole(role?: Role | string | null): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/** Single-browser idle session is for company/super admins, not livestock brokers entering prices. */
function requiresAdminSession(role?: Role | string | null): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

function shouldUseSecureCookies(): boolean {
  if (process.env.FORCE_SECURE_COOKIES === "true") return true;
  if (process.env.FORCE_SECURE_COOKIES === "false") return false;
  if (process.env.NODE_ENV === "production") return true;
  const site = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";
  return /^https:\/\//i.test(site) || site.includes("vercel.app");
}

// ============ PASSWORD OPERATIONS ============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============ TOKEN OPERATIONS ============

export function signToken(
  user: AuthUser,
  expiresIn: jwt.SignOptions["expiresIn"] = isPrivilegedRole(user.role)
    ? ADMIN_AUTH_MAX_AGE_SEC
    : "7d"
): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      status: user.status,
      companyId: user.companyId,
      brokerId: user.brokerId,
      companySlug: user.companySlug,
      ...(user.sid ? { sid: user.sid } : {}),
    },
    JWT_SECRET,
    { expiresIn }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}

// ============ COOKIE OPERATIONS ============

function getCookieConfig(maxAgeSec = PUBLIC_AUTH_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict" as const,
    maxAge: maxAgeSec,
    path: "/",
  };
}

export async function resolveRequestAuthPortal(
  explicit?: string | null
): Promise<AuthPortal | "auto"> {
  if (explicit === "auto") return "auto";
  if (isAuthPortal(explicit)) return explicit;
  try {
    const h = await headers();
    const headerPortal = h.get(AUTH_PORTAL_HEADER);
    if (isAuthPortal(headerPortal)) return headerPortal;
    const path = h.get(AUTH_PATH_HEADER) || "";
    const referer = refererPathname(h.get("referer"));
    return inferAuthPortalFromPath(path, referer);
  } catch {
    return "auto";
  }
}

function cookieNameForPortal(portal: AuthPortal): string {
  return AUTH_PORTAL_COOKIES[portal];
}

function guestCookieConfig(maxAgeSec: number) {
  return {
    httpOnly: false,
    secure: shouldUseSecureCookies(),
    sameSite: "strict" as const,
    maxAge: maxAgeSec,
    path: "/",
  };
}

export async function setAuthCookie(
  token: string,
  maxAgeSec?: number,
  portal?: AuthPortal,
  tabSlot?: string | null
): Promise<void> {
  const cookieStore = await cookies();
  const payload = verifyToken(token);
  const resolved = portal || authPortalForRole(payload?.role);
  cookieStore.set(cookieNameForPortal(resolved), token, getCookieConfig(maxAgeSec));
  const slot =
    sanitizeTabSlot(tabSlot) ||
    sanitizeTabSlot(cookieStore.get(AUTH_TAB_COOKIE)?.value);
  if (slot) {
    cookieStore.set(
      AUTH_TAB_COOKIE,
      slot,
      guestCookieConfig(maxAgeSec ?? PUBLIC_AUTH_MAX_AGE_SEC)
    );
    cookieStore.set(tabSessionCookieName(slot), token, getCookieConfig(maxAgeSec));
    cookieStore.set(tabGuestCookieName(slot), "", guestCookieConfig(0));
  }
}

export function getCookieForResponse(
  token: string,
  maxAgeSec?: number,
  portal?: AuthPortal
) {
  const payload = verifyToken(token);
  const resolved = portal || authPortalForRole(payload?.role);
  return {
    name: cookieNameForPortal(resolved),
    value: token,
    options: getCookieConfig(maxAgeSec),
  };
}

export function getLogoutCookieForResponse(portal: AuthPortal = "user") {
  return {
    name: cookieNameForPortal(portal),
    value: "",
    options: { ...getCookieConfig(0), maxAge: 0 },
  };
}

export function getLogoutCookiesForPortal(
  portal: AuthPortal,
  legacyToken?: string | null,
  slot?: string | null
) {
  const expired = { ...getCookieConfig(0), maxAge: 0 };
  const list = [
    { name: cookieNameForPortal(portal), value: "", options: expired },
  ];
  if (legacyToken) {
    const payload = verifyToken(legacyToken);
    if (payload && authPortalForRole(payload.role) === portal) {
      list.push({ name: TOKEN_COOKIE, value: "", options: expired });
      list.push({ name: LEGACY_TOKEN_COOKIE, value: "", options: expired });
    }
  }
  const tab = sanitizeTabSlot(slot);
  if (tab) {
    list.push({ name: tabSessionCookieName(tab), value: "", options: expired });
    list.push({
      name: tabGuestCookieName(tab),
      value: "1",
      options: guestCookieConfig(60 * 60 * 24 * 7),
    });
  }
  return list;
}

export async function getAuthCookie(
  portal?: AuthPortal | "auto" | null
): Promise<string | null> {
  const resolved = portal ?? (await resolveRequestAuthPortal());
  return readAuthToken(resolved);
}

async function readPortalOrLegacyToken(
  portal: AuthPortal | "auto"
): Promise<string | null> {
  const cookieStore = await cookies();
  if (portal !== "auto") {
    const named = cookieStore.get(cookieNameForPortal(portal))?.value;
    if (named) return named;
    const legacy =
      cookieStore.get(TOKEN_COOKIE)?.value ||
      cookieStore.get(LEGACY_TOKEN_COOKIE)?.value ||
      null;
    if (!legacy) return null;
    const payload = verifyToken(legacy);
    if (payload && authPortalForRole(payload.role) === portal) return legacy;
    return null;
  }

  for (const name of AUTH_PORTALS) {
    const value = cookieStore.get(cookieNameForPortal(name))?.value;
    if (value && verifyToken(value)) return value;
  }
  return (
    cookieStore.get(TOKEN_COOKIE)?.value ||
    cookieStore.get(LEGACY_TOKEN_COOKIE)?.value ||
    null
  );
}

async function readAuthToken(portal: AuthPortal | "auto"): Promise<string | null> {
  const cookieStore = await cookies();
  let headerSlot: string | null = null;
  try {
    const h = await headers();
    headerSlot = sanitizeTabSlot(h.get(AUTH_TAB_HEADER));
  } catch {
    headerSlot = null;
  }
  const slot =
    headerSlot || sanitizeTabSlot(cookieStore.get(AUTH_TAB_COOKIE)?.value);
  if (slot) {
    const sess = cookieStore.get(tabSessionCookieName(slot))?.value;
    const sessUser = sess ? verifyToken(sess) : null;
    if (sessUser) {
      if (portal === "auto") return sess ?? null;
      if (String(authPortalForRole(sessUser.role)) === String(portal)) return sess ?? null;
      return null;
    }
    if (cookieStore.get(tabGuestCookieName(slot))?.value === "1") {
      return null;
    }
  }
  return readPortalOrLegacyToken(portal);
}

export async function clearAuthCookie(portal?: AuthPortal): Promise<void> {
  const cookieStore = await cookies();
  const resolved = portal ?? (await resolveRequestAuthPortal());
  if (resolved === "auto") {
    cookieStore.delete(TOKEN_COOKIE);
    cookieStore.delete(LEGACY_TOKEN_COOKIE);
    return;
  }
  cookieStore.delete(cookieNameForPortal(resolved));
  const legacy =
    cookieStore.get(TOKEN_COOKIE)?.value ||
    cookieStore.get(LEGACY_TOKEN_COOKIE)?.value ||
    null;
  if (legacy) {
    const payload = verifyToken(legacy);
    if (payload && authPortalForRole(payload.role) === resolved) {
      cookieStore.delete(TOKEN_COOKIE);
      cookieStore.delete(LEGACY_TOKEN_COOKIE);
    }
  }
}

export async function getRequestUserAgent(): Promise<string> {
  try {
    const h = await headers();
    return h.get("user-agent") || "";
  } catch {
    return "";
  }
}

// ============ SESSION MANAGEMENT ============

export const getCurrentUser = cache(async (
  portalHint?: string | null
): Promise<AuthUser | null> => {
  try {
    const token = await getAuthCookie(await resolveRequestAuthPortal(portalHint));
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    if (requiresAdminSession(payload.role)) {
      const ua = await getRequestUserAgent();
      const ok = await validateAdminSession({
        sid: payload.sid,
        email: payload.email,
        userAgent: ua,
      });
      if (!ok) return null;
    }

    const user = await withDbTimeout(
      prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          accountStatus: true,
          deletedAt: true,
          companySlug: true,
          companyId: true,
          brokerId: true,
          companySector: true,
          companyType: true,
          profilePicture: true,
          company: { select: { status: true, deletedAt: true } },
          broker: { select: { status: true, deletedAt: true } },
        },
      })
    );
    if (
      !user ||
      user.email.toLowerCase() !== payload.email.toLowerCase() ||
      user.deletedAt ||
      user.accountStatus !== "ACTIVE"
    ) {
      return null;
    }

    const livestockPortal =
      user.role === "LIVESTOCK_BROKER_USER" ||
      Boolean(user.brokerId) ||
      (user.companySector || "").toLowerCase().includes("livestock") ||
      Boolean(user.companyType && /camel|cattle|goat|sheep|geel|loda|arri/i.test(user.companyType));

    if (
      !livestockPortal &&
      (user.company?.deletedAt ||
        (user.company && user.company.status !== "ACTIVE"))
    ) {
      return null;
    }

    if (
      livestockPortal &&
      user.broker &&
      (user.broker.deletedAt || user.broker.status !== "ACTIVE")
    ) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      brokerId: user.brokerId,
      companySlug: user.companySlug,
      companyType: user.companyType,
      profilePicture: user.profilePicture,
      sid: payload.sid,
    };
  } catch {
    throw new Error("Authentication database unavailable");
  }
});

/** Revoke server session id from the current auth cookie (logout). */
export async function revokeCurrentAdminSession(
  portalHint?: string | null
): Promise<void> {
  const token = await getAuthCookie(await resolveRequestAuthPortal(portalHint));
  if (!token) return;
  const payload = verifyToken(token);
  if (payload?.sid) await revokeAdminSession(payload.sid);
}

// ============ AUTHORIZATION CHECKS ============

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

/** COMPANY_ADMIN acts as company admin */
export function isCompanyAdmin(user: AuthUser | null): boolean {
  return user?.role === "COMPANY_ADMIN";
}

export function isLivestockBroker(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.role === "LIVESTOCK_BROKER_USER") return true;
  if (user.brokerId) return true;
  const sector = `${user.companySector || ""} ${user.companyType || ""}`.toLowerCase();
  return /livestock|camel|cattle|goat|sheep|geel|xoolo|\bloda\b|\blo['’]?\b|\bari\b/.test(
    sector
  );
}

/** Super Admin manages livestock markets, brokers, and catalog. */
export function isLivestockSectorAdmin(user: AuthUser | null): boolean {
  return isSuperAdmin(user);
}

export function isCompanyUser(user: AuthUser | null): boolean {
  return isCompanyAdmin(user);
}

export function isAdmin(user: AuthUser | null): boolean {
  return isCompanyAdmin(user) || isSuperAdmin(user);
}

export function checkPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role, permission);
}

export function isPublic(user: AuthUser | null): boolean {
  return user?.role === "PUBLIC";
}

export function isAuthenticated(user: AuthUser | null): boolean {
  return !!user;
}

export function isApproved(user: AuthUser | null): boolean {
  if (!user) return false;
  const status = String(user.status || "").toUpperCase();
  return status === "APPROVED";
}

export function canAccessPersonalData(
  currentUser: AuthUser | null,
  targetUserId: number,
  targetCompanyId?: number | null
): boolean {
  if (!currentUser) return false;

  if (isSuperAdmin(currentUser)) return true;

  if (currentUser.id === targetUserId) return true;

  if (
    isCompanyAdmin(currentUser) &&
    targetCompanyId &&
    currentUser.companyId === targetCompanyId
  ) {
    return true;
  }

  return false;
}

export function canEditPrice(
  currentUser: AuthUser | null,
  companyId?: number | null
): boolean {
  if (!currentUser || !isApproved(currentUser)) return false;

  if (isSuperAdmin(currentUser)) return true;

  if (isCompanyAdmin(currentUser) && companyId === currentUser.companyId)
    return true;

  return false;
}

/** Company admin may view/edit only their own company (by provider slug). */
export function canManageCompany(
  currentUser: AuthUser | null,
  companySlug?: string | null
): boolean {
  if (!currentUser || !isApproved(currentUser)) return false;
  if (isSuperAdmin(currentUser)) return true;
  const ownSlug = currentUser.companySlug;
  if (
    isCompanyAdmin(currentUser) &&
    ownSlug &&
    companySlug &&
    ownSlug === companySlug
  ) {
    return true;
  }
  return false;
}

/** True when a company admin is restricted to a single provider. */
export function isScopedCompanyAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return isCompanyAdmin(user) && Boolean(user.companySlug);
}

/** Resolve the company slug for the signed-in company admin (token / DB / email). */
export function resolveCompanyAdminSlug(user: AuthUser | null): string | null {
  if (!user) return null;
  return user.companySlug || null;
}
