import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  RegistrationUploadError,
  saveRegistrationDocument,
} from "@/lib/registration-upload";
import {
  requiredDocumentIds,
  SHARED_SECTOR_DOCUMENTS,
  type CompanyRegistrationSector,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import { addRegistrationTimelineEvent } from "@/lib/registration-tracking";
import { getDocumentReviews } from "@/lib/registration-document-reviews";

function parseDocs(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function sectorFromUser(sector: string | null | undefined): CompanyRegistrationSector {
  const s = (sector || "").toLowerCase();
  if (s.includes("electric")) return "electricity";
  if (s.includes("live") || s.includes("xool")) return "livestock";
  if (s.includes("water") || s.includes("biya")) return "water";
  return "livestock";
}

/**
 * Pending applicants may upload missing registration documents.
 * Rejected document slots may be replaced. Accepted / under-review files stay locked.
 */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser("user");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        role: true,
        companySector: true,
        registrationDocuments: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const status = String(user.status).toUpperCase();
    if (status !== "REJECTED" && status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending or rejected applications can update documents" },
        { status: 403 }
      );
    }

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const form = await request.formData();
    const resubmit =
      String(form.get("resubmit") || "").toLowerCase() === "true" ||
      String(form.get("resubmit") || "") === "1";

    const sector = sectorFromUser(user.companySector);
    const existing = parseDocs(user.registrationDocuments);
    const planPrice = Number(existing.plan_price ?? NaN);
    const isFreePlan =
      Number.isFinite(planPrice) &&
      planPrice <= 0 &&
      Boolean(existing.plan_id || existing.plan_name);
    const allowedIds = new Set(
      requiredDocumentIds(sector).filter(
        (id) => !(isFreePlan && id === "payment_receipt")
      )
    );
    const nextDocs = { ...existing };
    const replaced: string[] = [];
    const reviews = await getDocumentReviews(user.id);
    const rejectedIds = new Set(
      Object.entries(reviews)
        .filter(([, row]) => row.status === "REJECTED")
        .map(([id]) => id)
    );

    const isRealUpload = (value: string | undefined) => {
      const v = value?.trim() || "";
      if (!v || v === "Not uploaded") return false;
      const base = v.split(/[/\\]/).pop() || v;
      return /\.[a-z0-9]{2,5}$/i.test(base);
    };

    for (const id of allowedIds) {
      const entry = form.get(`document_${id}`);
      if (!(entry instanceof File) || entry.size <= 0) continue;

      const alreadyUploaded = isRealUpload(existing[id]);
      const isRejected = rejectedIds.has(id);
      // Pending applicants may upload missing docs the first time;
      // rejected slots may be replaced. Do not overwrite accepted / under-review files.
      if (alreadyUploaded && !isRejected) {
        return NextResponse.json(
          {
            error:
              "Only a missing or rejected document can be uploaded or replaced",
          },
          { status: 400 }
        );
      }
      if (!alreadyUploaded && status !== "PENDING" && status !== "REJECTED") {
        return NextResponse.json(
          { error: "Only pending or rejected applications can update documents" },
          { status: 403 }
        );
      }

      try {
        nextDocs[id] = await saveRegistrationDocument(entry);
        replaced.push(id);
      } catch (err) {
        if (err instanceof RegistrationUploadError) {
          return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
        }
        throw err;
      }
    }

    if (replaced.length === 0 && !resubmit) {
      return NextResponse.json(
        { error: "Upload at least one document to replace" },
        { status: 400 }
      );
    }

    const missing = [...allowedIds].filter((id) => !nextDocs[id]?.trim());
    if (resubmit && missing.length > 0) {
      const labels = SHARED_SECTOR_DOCUMENTS.filter((d) =>
        missing.includes(d.id)
      ).map((d) => d.label);
      return NextResponse.json(
        {
          error: `Upload all required documents before resubmitting: ${labels.join(", ")}`,
          missing,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const wasRejected = status === "REJECTED";
    const shouldReopen = resubmit || (wasRejected && replaced.length > 0 && missing.length === 0);

    // Persist document map (raw SQL keeps working if Prisma client is stale)
    await prisma.$executeRaw`
      UPDATE users
      SET
        registration_documents = ${JSON.stringify(nextDocs)},
        updated_at = ${now}
      WHERE id = ${user.id}
    `;

    if (replaced.length > 0) {
      const { clearDocumentReviewAfterReplace } = await import(
        "@/lib/registration-document-reviews"
      );
      await clearDocumentReviewAfterReplace(user.id, replaced);
    }

    if (shouldReopen && wasRejected) {
      await prisma.$executeRaw`
        UPDATE users
        SET
          status = 'PENDING'::"UserStatus",
          documents_reviewed_at = NULL,
          rejection_reason = NULL,
          rejected_at = NULL,
          rejected_by_id = NULL,
          updated_at = ${now}
        WHERE id = ${user.id}
      `;

      await addRegistrationTimelineEvent({
        userId: user.id,
        eventType: "DOCUMENTS_RESUBMITTED",
        title: "Documents resubmitted for review",
        detail:
          replaced.length > 0
            ? `Updated: ${replaced
                .map(
                  (id) =>
                    SHARED_SECTOR_DOCUMENTS.find((d) => d.id === id)?.label || id
                )
                .join(", ")}`
            : "Application reopened for document review",
        statusLabel: "Under Review",
        actorLabel: null,
        at: now,
      });

      try {
        const { notifySuperAdmin } = await import(
          "@/lib/system-notifications-store"
        );
        await notifySuperAdmin({
          title: "Documents resubmitted",
          message: `${user.fullName || user.email} re-uploaded registration documents after rejection.`,
          sector: "system",
          href: "/super-admin/approvals",
        });
      } catch {
      }

      try {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: user.id,
          title: "Documents submitted for re-review",
          message:
            "Your updated documents were received. MMPS will review them again.",
          type: "GENERAL",
          sector: "account",
        });
      } catch {
      }
    } else if (replaced.length > 0) {
      // Pending applicant replaced files — reset document review tick
      await prisma.$executeRaw`
        UPDATE users
        SET documents_reviewed_at = NULL, updated_at = ${now}
        WHERE id = ${user.id}
      `;

      await addRegistrationTimelineEvent({
        userId: user.id,
        eventType: "DOCUMENTS_UPDATED",
        title: "Registration documents updated",
        detail: `Updated: ${replaced
          .map(
            (id) =>
              SHARED_SECTOR_DOCUMENTS.find((d) => d.id === id)?.label || id
          )
          .join(", ")}`,
        statusLabel: "Documents",
        actorLabel: null,
        at: now,
      });

      try {
        const { notifySuperAdmin } = await import(
          "@/lib/system-notifications-store"
        );
        await notifySuperAdmin({
          title: "Rejected document replaced",
          message: `${user.fullName || user.email} replaced: ${replaced
            .map(
              (id) =>
                SHARED_SECTOR_DOCUMENTS.find((d) => d.id === id)?.label || id
            )
            .join(", ")}.`,
          sector: "system",
          href: "/super-admin/approvals",
        });
      } catch {
      }
    }

    return NextResponse.json({
      ok: true,
      replaced: replaced as RegistrationDocumentId[],
      documents: nextDocs,
      status: shouldReopen && wasRejected ? "PENDING" : status,
      resubmitted: Boolean(shouldReopen && wasRejected),
    });
  } catch (error) {
    console.error("[account/documents POST]", error);
    return NextResponse.json(
      { error: "Could not update documents" },
      { status: 503 }
    );
  }
}
