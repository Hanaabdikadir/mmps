import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { brokerHomeHref } from "@/lib/livestock-manager-broker";
import {
  normalizeLivestockSection,
  promoteApprovedBroker,
} from "@/lib/promote-broker";
import { promoteApprovedCompany } from "@/lib/promote-company";

export type ActivatedApplicant = {
  activated: boolean;
  userId: number | null;
  email: string | null;
  role: Role | null;
  redirectTo: string | null;
  kind: "broker" | "company" | null;
};

function isLivestockApplicant(sector?: string | null, companyType?: string | null) {
  const s = (sector || "").toLowerCase();
  return (
    s.includes("livestock") ||
    s.includes("xoolaha") ||
    Boolean(normalizeLivestockSection(companyType))
  );
}

function portalRedirectForRole(
  role: Role | null | undefined,
  email?: string | null
): string | null {
  if (!role) return null;
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "COMPANY_ADMIN") {
    return "/admin";
  }
  if (role === "LIVESTOCK_BROKER_USER") {
    return brokerHomeHref({ email: email || "" });
  }
  return null;
}

/**
 * After Super Admin approval: move REGISTERED applicants onto their real
 * portal (company admin or livestock broker) so /account is tracking-only.
 */
export async function activateApprovedApplicant(opts: {
  userId?: number | null;
  email?: string | null;
}): Promise<ActivatedApplicant> {
  const email = opts.email?.trim().toLowerCase() || null;
  const user = await prisma.user.findFirst({
    where: opts.userId
      ? {
          deletedAt: null,
          OR: [{ id: opts.userId }, ...(email ? [{ email }] : [])],
        }
      : email
        ? { email, deletedAt: null }
        : { id: -1 },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      companySector: true,
      companyType: true,
    },
  });

  if (!user || String(user.status).toUpperCase() !== "APPROVED") {
    return {
      activated: false,
      userId: user?.id ?? null,
      email: user?.email ?? email,
      role: user?.role ?? null,
      redirectTo: portalRedirectForRole(user?.role, user?.email ?? email),
      kind: null,
    };
  }

  const alreadyPortal = portalRedirectForRole(user.role, user.email);
  if (alreadyPortal && user.role !== "REGISTERED" && user.role !== "PUBLIC") {
    return {
      activated: false,
      userId: user.id,
      email: user.email,
      role: user.role,
      redirectTo: alreadyPortal,
      kind: user.role === "LIVESTOCK_BROKER_USER" ? "broker" : "company",
    };
  }

  const livestock = isLivestockApplicant(user.companySector, user.companyType);
  let kind: ActivatedApplicant["kind"] = null;

  if (livestock) {
    await promoteApprovedBroker({ userId: user.id, email: user.email });
    kind = "broker";
  } else {
    await promoteApprovedCompany({ userId: user.id, email: user.email });
    kind = "company";
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, status: true, companySector: true, companyType: true },
  });

  if (livestock && refreshed && refreshed.role !== "LIVESTOCK_BROKER_USER") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "APPROVED",
        accountStatus: "ACTIVE",
        role: "LIVESTOCK_BROKER_USER",
        companySector: "livestock",
      },
    });
  }

  const latest = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, status: true },
  });

  const redirectTo = portalRedirectForRole(
    latest?.role,
    latest?.email ?? user.email
  );

  return {
    activated: Boolean(redirectTo),
    userId: latest?.id ?? user.id,
    email: latest?.email ?? user.email,
    role: latest?.role ?? user.role,
    redirectTo,
    kind,
  };
}

export { portalRedirectForRole };
