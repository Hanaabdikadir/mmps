import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  verifyPassword,
  signToken,
  setAuthCookie,
  isApproved,
  ADMIN_AUTH_MAX_AGE_SEC,
  type AuthUser,
} from "@/lib/auth";
import { authPortalForRole } from "@/lib/auth-portal";
import { createAdminSession } from "@/lib/admin-session-store";
import { brokerHomeHref, isLegacyLivestockManagerEmail } from "@/lib/livestock-manager-broker";
import type { Role, UserStatus } from "@/lib/rbac";

const ACCOUNT_CLOSED_MESSAGE =
  "Your account was closed. Please contact the system administrator.";

const MANAGER_RETIRED_MESSAGE =
  "The Livestock Manager portal was removed. Livestock broker registrations and prices are approved by Super Admin only.";

export type LoginSuccess = {
  ok: true;
  redirectTo: string;
  portal: "super" | "admin" | "broker" | "user";
};

export type LoginFailure = {
  ok: false;
  error: string;
};

export type LoginResult = LoginSuccess | LoginFailure;

function redirectForUser(authUser: AuthUser, progressOnly: boolean): string {
  if (progressOnly) return "/account";

  const role = authUser.role;
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "COMPANY_ADMIN") {
    return "/admin";
  }
  if (role === "LIVESTOCK_BROKER_USER") {
    return brokerHomeHref({ email: authUser.email });
  }
  if (role === "REGISTERED") return "/account";
  return "/dashboard";
}

export async function authenticateUser(opts: {
  email: string;
  password: string;
  userAgent?: string;
  tabSlot?: string | null;
}): Promise<LoginResult> {
  const email = opts.email.trim();
  const password = opts.password;

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const normalizedEmail = email.toLowerCase();
  let authUser: AuthUser | null = null;

  try {
    const user = await withDbTimeout(
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          company: {
            select: { slug: true, status: true, deletedAt: true },
          },
          broker: {
            select: { status: true, deletedAt: true },
          },
        },
      })
    );

    if (user) {
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return { ok: false, error: "Invalid email or password" };
      }

      const dbSlug = user.companySlug || user.company?.slug || undefined;

      if (
        user.deletedAt ||
        user.accountStatus !== "ACTIVE"
      ) {
        return { ok: false, error: ACCOUNT_CLOSED_MESSAGE };
      }

      const livestockAccount =
        user.role === "LIVESTOCK_BROKER_USER" ||
        Boolean(user.brokerId) ||
        (user.companySector || "").toLowerCase().includes("livestock");

      if (
        !livestockAccount &&
        (user.company?.deletedAt ||
          (user.company && user.company.status !== "ACTIVE"))
      ) {
        return { ok: false, error: ACCOUNT_CLOSED_MESSAGE };
      }

      if (
        livestockAccount &&
        user.broker &&
        (user.broker.deletedAt || user.broker.status !== "ACTIVE")
      ) {
        return { ok: false, error: ACCOUNT_CLOSED_MESSAGE };
      }

      authUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role as Role,
        status: user.status as UserStatus,
        companyId: user.companyId,
        brokerId: user.brokerId,
        companySlug: dbSlug,
      };
    }
  } catch (dbError) {
    console.error("[auth/login] Database unavailable:", dbError);
    return {
      ok: false,
      error: "Authentication service is temporarily unavailable. Try again.",
    };
  }

  if (!authUser) {
    return { ok: false, error: "Invalid email or password" };
  }

  if (isLegacyLivestockManagerEmail(authUser.email)) {
    return { ok: false, error: MANAGER_RETIRED_MESSAGE };
  }

  const progressOnly =
    authUser.status === "PENDING" || authUser.status === "REJECTED";

  if (!progressOnly && !isApproved(authUser)) {
    return { ok: false, error: "Account not approved" };
  }

  // Approved applicants should land on their real portal, not tracking /account.
  if (!progressOnly && authUser.role === "REGISTERED") {
    try {
      const { activateApprovedApplicant } = await import(
        "@/lib/activate-approved-applicant"
      );
      const activated = await activateApprovedApplicant({
        userId: authUser.id,
        email: authUser.email,
      });
      if (activated.role && activated.role !== "REGISTERED") {
        const refreshed = await withDbTimeout(
          prisma.user.findUnique({
            where: { id: authUser.id },
            include: {
              company: {
                select: { slug: true, status: true, deletedAt: true },
              },
            },
          })
        );
        if (refreshed) {
          authUser = {
            id: refreshed.id,
            fullName: refreshed.fullName,
            email: refreshed.email,
            role: refreshed.role as Role,
            status: refreshed.status as UserStatus,
            companyId: refreshed.companyId,
            brokerId: refreshed.brokerId,
            companySlug:
              refreshed.companySlug || refreshed.company?.slug || undefined,
          };
        }
      }
    } catch (err) {
      console.error("[auth/login] activateApprovedApplicant failed:", err);
    }
  }

  const isPrivileged =
    !progressOnly &&
    (authUser.role === "SUPER_ADMIN" || authUser.role === "COMPANY_ADMIN");

  if (isPrivileged) {
    try {
      const session = await createAdminSession({
        userId: authUser.id,
        role: authUser.role,
        userAgent: opts.userAgent || "",
      });
      authUser = { ...authUser, sid: session.sid };
    } catch (dbError) {
      console.error("[auth/login] Session persistence failed:", dbError);
      return {
        ok: false,
        error: "Authentication service is temporarily unavailable. Try again.",
      };
    }
  }

  const token = signToken(authUser);
  const portal = authPortalForRole(authUser.role);
  await setAuthCookie(
    token,
    isPrivileged ? ADMIN_AUTH_MAX_AGE_SEC : undefined,
    portal,
    opts.tabSlot
  );

  return {
    ok: true,
    redirectTo: redirectForUser(authUser, progressOnly),
    portal,
  };
}
