import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  deleteManagedCompany,
  setManagedCompanyStatus,
  type CompanyStatus,
} from "@/lib/super-admin-service";
import type { UserStatus } from "@/lib/rbac";
import { markDocumentsReviewedAt } from "@/lib/documents-reviewed";
import {
  addRegistrationTimelineEvent,
  rejectRegistrationApplication,
} from "@/lib/registration-tracking";
import { hardDeleteUser } from "@/lib/delete-user";

function parseId(body: unknown): string | null {
  const raw = (body as { id?: unknown }).id;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

function toUserStatus(status: CompanyStatus): UserStatus {
  if (status === "APPROVED") return "APPROVED";
  if (status === "PENDING") return "PENDING";
  return "REJECTED";
}

/**
 * Accept / reject registration: update User status, then on approve promote
 * into the real portal (company admin or livestock broker).
 */
async function persistUserStatus(
  id: string,
  status: CompanyStatus,
  email?: string,
  emails?: string[],
  companySlug?: string,
  opts?: {
    rejectionReason?: string;
    adminId?: number;
    adminName?: string;
  }
) {
  const dbStatus = toUserStatus(status);
  const normalizedEmail = email?.trim().toLowerCase();
  const slug = (companySlug || id).trim();
  const emailList = [
    ...new Set(
      [
        normalizedEmail,
        ...(emails ?? []).map((e) => e.trim().toLowerCase()),
      ].filter((e): e is string => Boolean(e && e !== "—"))
    ),
  ];
  let updatedDb = false;
  let targetUserId: number | null = null;

  const approveData =
    status === "APPROVED"
      ? {
          status: dbStatus,
          accountStatus: "ACTIVE" as const,
        }
      : status === "SUSPENDED"
        ? {
            status: "APPROVED" as const,
            accountStatus: "SUSPENDED" as const,
          }
        : status === "REJECTED"
          ? { status: dbStatus }
          : { status: dbStatus };

  if (/^\d+$/.test(id)) {
    const userId = Number(id);
    try {
      if (status === "REJECTED") {
        const reason = opts?.rejectionReason?.trim() || "";
        if (!reason || !opts?.adminId) {
          return {
            ok: false as const,
            error: "Rejection reason is required",
          };
        }
        const rejected = await rejectRegistrationApplication({
          userId,
          reason,
          rejectedById: opts.adminId,
          rejectedByName: opts.adminName || "Super Admin",
        });
        if (!rejected.ok) {
          return { ok: false as const, error: rejected.error };
        }
        updatedDb = true;
        targetUserId = userId;
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: approveData,
        });
        updatedDb = true;
        targetUserId = userId;
        if (status === "APPROVED") {
          await markDocumentsReviewedAt(userId, new Date(), opts?.adminId);
          await addRegistrationTimelineEvent({
            userId,
            eventType: "APPROVED",
            title: "Application approved",
            detail: null,
            statusLabel: "Approved",
            actorId: opts?.adminId ?? null,
            actorLabel: "MMPS Administration",
          });
        }
      }
    } catch {
      // id may be a company slug encoded as digits elsewhere — continue
    }
  }

  if (!updatedDb) {
    for (const addr of emailList) {
      if (status === "REJECTED") {
        const reason = opts?.rejectionReason?.trim() || "";
        if (!reason || !opts?.adminId) {
          return {
            ok: false as const,
            error: "Rejection reason is required",
          };
        }
        const row = await prisma.user.findFirst({
          where: { email: addr, deletedAt: null },
          select: { id: true },
        });
        if (!row) continue;
        const rejected = await rejectRegistrationApplication({
          userId: row.id,
          reason,
          rejectedById: opts.adminId,
          rejectedByName: opts.adminName || "Super Admin",
        });
        if (!rejected.ok) {
          return { ok: false as const, error: rejected.error };
        }
        updatedDb = true;
        targetUserId = row.id;
        break;
      }

      const result = await prisma.user.updateMany({
        where: { email: addr, deletedAt: null },
        data: approveData,
      });
      if (result.count > 0) {
        updatedDb = true;
        const row = await prisma.user.findFirst({
          where: { email: addr, deletedAt: null },
          select: { id: true },
        });
        targetUserId = row?.id ?? null;
        if (status === "APPROVED" && targetUserId) {
          await markDocumentsReviewedAt(targetUserId, new Date(), opts?.adminId);
          await addRegistrationTimelineEvent({
            userId: targetUserId,
            eventType: "APPROVED",
            title: "Application approved",
            detail: null,
            statusLabel: "Approved",
            actorId: opts?.adminId ?? null,
            actorLabel: "MMPS Administration",
          });
        }
      }
    }
  }

  if (!updatedDb && slug) {
    const result = await prisma.user.updateMany({
      where: { companySlug: slug, deletedAt: null },
      data: approveData,
    });
    if (result.count > 0) updatedDb = true;
  }

  if (!updatedDb && emailList.length > 0) {
    const existing = await prisma.user.findFirst({
      where: { email: emailList[0]!, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return {
        ok: false as const,
        error:
          "Could not unlock login for this applicant. Re-register or check the database connection.",
      };
    }
  }

  if (
    updatedDb &&
    (status === "APPROVED" || status === "REJECTED")
  ) {
    try {
      const target = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [
            ...(targetUserId ? [{ id: targetUserId }] : []),
            ...(/^\d+$/.test(id) ? [{ id: Number(id) }] : []),
            ...emailList.map((e) => ({ email: e })),
          ],
        },
        select: {
          id: true,
          email: true,
          companySector: true,
          companyType: true,
        },
      });
      if (target) {
        let portalLabel = "your MMPS portal";
        if (status === "APPROVED") {
          const { activateApprovedApplicant } = await import(
            "@/lib/activate-approved-applicant"
          );
          const activated = await activateApprovedApplicant({
            userId: target.id,
            email: target.email,
          });
          portalLabel =
            activated.kind === "broker"
              ? "the Livestock Broker portal"
              : "your Company Admin dashboard";
        }
        const { createNotification } = await import("@/lib/notifications");
        const reasonNote =
          status === "REJECTED" && opts?.rejectionReason?.trim()
            ? ` Reason: ${opts.rejectionReason.trim()}`
            : "";
        await createNotification({
          userId: target.id,
          title:
            status === "APPROVED"
              ? "Application approved"
              : "Application not approved",
          message:
            status === "APPROVED"
              ? `Your MMPS registration was approved. You can now open ${portalLabel}.`
              : `Your MMPS registration was not approved.${reasonNote} Open Documents to review what needs to be updated.`,
          type: "GENERAL",
          sector: "account",
        });
      }
    } catch {
      // never block status update
    }
  }

  return {
    ok: true as const,
    kind: "db" as const,
    companySlug: null as string | null,
    companyHref: null as string | null,
  };
}

async function deleteUserByEmailCascade(email: string) {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return;
  const matches = await prisma.user.findMany({
    where: { email: normalized },
    select: { id: true, role: true },
  });
  for (const row of matches) {
    if (row.role === "SUPER_ADMIN") continue;
    await hardDeleteUser(row.id);
  }
}

async function persistUserDelete(
  id: string,
  email?: string,
  snapshot?: {
    name?: string;
    acronym?: string;
    phone?: string;
    sector?: string;
    companyType?: string;
  }
) {
  if (!/^\d+$/.test(id)) {
    await deleteManagedCompany(id, email, snapshot);
    if (email) {
      await deleteUserByEmailCascade(email);
    }
    return { ok: true as const, kind: "db" as const };
  }

  const userId = Number(id);
  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) {
      await deleteManagedCompany(id, email, snapshot);
      if (email) {
        await deleteUserByEmailCascade(email);
      }
      return { ok: true as const, kind: "db" as const };
    }
    if (target.role === "SUPER_ADMIN") {
      return {
        ok: false as const,
        error: "Super admin accounts cannot be deleted",
      };
    }
    await hardDeleteUser(userId);
    await deleteManagedCompany(id, email ?? target.email, snapshot);
    return { ok: true as const, kind: "db" as const };
  } catch {
    if (email) {
      try {
        await deleteUserByEmailCascade(email);
        await deleteManagedCompany(id, email, snapshot);
        return { ok: true as const, kind: "db" as const };
      } catch {
        // continue to error below
      }
    }
    return {
      ok: false as const,
      error: "Could not delete this applicant. Please try again.",
    };
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body: unknown = await request.json().catch(() => ({}));
    const id = parseId(body);
    const status = (body as { status?: unknown }).status;
    const email =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : undefined;
    const emails = Array.isArray((body as { emails?: unknown }).emails)
      ? ((body as { emails: unknown[] }).emails.filter(
          (e) => typeof e === "string" && e.trim()
        ) as string[])
      : undefined;
    const companySlug =
      typeof (body as { companySlug?: unknown }).companySlug === "string"
        ? (body as { companySlug: string }).companySlug
        : undefined;
    const rejectionReason =
      typeof (body as { rejectionReason?: unknown }).rejectionReason === "string"
        ? (body as { rejectionReason: string }).rejectionReason.trim()
        : typeof (body as { reason?: unknown }).reason === "string"
          ? (body as { reason: string }).reason.trim()
          : "";

    if (
      !id ||
      (status !== "APPROVED" &&
        status !== "REJECTED" &&
        status !== "PENDING" &&
        status !== "SUSPENDED")
    ) {
      return NextResponse.json(
        {
          error:
            "id and status (APPROVED|REJECTED|PENDING|SUSPENDED) are required",
        },
        { status: 400 }
      );
    }

    if (status === "REJECTED" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const nextStatus = status as CompanyStatus;
    const dbResult = await persistUserStatus(
      id,
      nextStatus,
      email,
      emails,
      companySlug,
      {
        rejectionReason,
        adminId: user.id,
        adminName: user.fullName,
      }
    );
    if (!dbResult.ok) {
      return NextResponse.json({ error: dbResult.error }, { status: 400 });
    }

    try {
    } catch {
    }

    const updated = await setManagedCompanyStatus(id, nextStatus);

    try {
      const { notifySuperAdmin } = await import(
        "@/lib/system-notifications-store"
      );
      const label =
        nextStatus === "APPROVED"
          ? "User approved"
          : nextStatus === "REJECTED"
            ? "Registration rejected"
            : nextStatus === "SUSPENDED"
              ? "User set Not Active"
              : "Registration status updated";
      const name = updated?.acronym || updated?.name || companySlug || id;
      await notifySuperAdmin({
        title: label,
        message: `${name} is now ${nextStatus.toLowerCase().replace("_", " ")}.`,
        sector:
          updated?.sector === "Electricity"
            ? "electricity"
            : updated?.sector === "Livestock"
              ? "livestock"
              : updated?.sector === "Water"
                ? "water"
                : "system",
        href:
          nextStatus === "APPROVED"
            ? "/super-admin/users"
            : "/super-admin/approvals",
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      company: updated,
      persisted: dbResult.kind,
      companySlug: dbResult.companySlug ?? null,
      companyHref: dbResult.companyHref ?? null,
    });
  } catch (error) {
    console.error("[super-admin/companies PATCH]", error);
    return NextResponse.json(
      { error: "Company service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body: unknown = await request.json().catch(() => ({}));
    const id = parseId(body);
    const email =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : undefined;
    const snapshot = {
      name:
        typeof (body as { name?: unknown }).name === "string"
          ? (body as { name: string }).name
          : undefined,
      acronym:
        typeof (body as { acronym?: unknown }).acronym === "string"
          ? (body as { acronym: string }).acronym
          : undefined,
      phone:
        typeof (body as { phone?: unknown }).phone === "string"
          ? (body as { phone: string }).phone
          : undefined,
      sector:
        typeof (body as { sector?: unknown }).sector === "string"
          ? (body as { sector: string }).sector
          : undefined,
      companyType:
        typeof (body as { companyType?: unknown }).companyType === "string"
          ? (body as { companyType: string }).companyType
          : undefined,
    };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const result = await persistUserDelete(id, email, snapshot);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, id, persisted: result.kind });
  } catch (error) {
    console.error("[super-admin/companies DELETE]", error);
    return NextResponse.json(
      { error: "Company service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
