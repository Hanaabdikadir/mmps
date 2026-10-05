import { prisma } from "@/lib/prisma";
import {
  SHARED_SECTOR_DOCUMENTS,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import { addRegistrationTimelineEvent } from "@/lib/registration-tracking";
import { markDocumentsReviewedAt } from "@/lib/documents-reviewed";

export type DocumentReviewStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type DocumentReviewEntry = {
  status: DocumentReviewStatus;
  reason: string | null;
  reviewedAt: string | null;
  reviewedById: number | null;
  reviewedByName?: string | null;
  /** Applicant replaced the file after a prior review */
  reuploaded?: boolean;
  replacedAt?: string | null;
};

export type DocumentReviewsMap = Record<string, DocumentReviewEntry>;

function resolveDocumentSlotId(raw: string): string {
  const value = raw.trim();
  if (SHARED_SECTOR_DOCUMENTS.some((d) => d.id === value)) return value;
  const hit = SHARED_SECTOR_DOCUMENTS.find(
    (d) => value.endsWith(`-${d.id}`) || value.includes(d.id)
  );
  return hit?.id || value;
}

export function parseDocumentReviews(
  raw: string | null | undefined
): DocumentReviewsMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: DocumentReviewsMap = {};
    for (const [id, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const status = String(row.status || "PENDING").toUpperCase();
      if (status !== "PENDING" && status !== "ACCEPTED" && status !== "REJECTED") {
        continue;
      }
      out[id] = {
        status: status as DocumentReviewStatus,
        reason: typeof row.reason === "string" ? row.reason.trim() || null : null,
        reviewedAt:
          typeof row.reviewedAt === "string" ? row.reviewedAt : null,
        reviewedById:
          typeof row.reviewedById === "number" ? row.reviewedById : null,
        reviewedByName:
          typeof row.reviewedByName === "string"
            ? row.reviewedByName
            : null,
        reuploaded: row.reuploaded === true,
        replacedAt:
          typeof row.replacedAt === "string" ? row.replacedAt : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function getDocumentReviews(
  userId: number
): Promise<DocumentReviewsMap> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ registration_document_reviews: string | null }>
    >`
      SELECT registration_document_reviews
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    return parseDocumentReviews(rows[0]?.registration_document_reviews);
  } catch {
    return {};
  }
}

export async function setDocumentReview(input: {
  userId: number;
  documentId: string;
  action: "ACCEPT" | "REJECT";
  reason?: string | null;
  adminId: number;
  adminName: string;
}): Promise<
  | { ok: true; reviews: DocumentReviewsMap }
  | { ok: false; error: string }
> {
  const documentId = resolveDocumentSlotId(input.documentId);
  const allowed = new Set(SHARED_SECTOR_DOCUMENTS.map((d) => d.id));
  if (!allowed.has(documentId as RegistrationDocumentId)) {
    return { ok: false, error: "Invalid document id" };
  }

  const reason = input.reason?.trim() || null;
  if (input.action === "REJECT" && !reason) {
    return { ok: false, error: "Rejection reason is required for this document" };
  }

  const reviews = await getDocumentReviews(input.userId);
  const now = new Date().toISOString();
  const label =
    SHARED_SECTOR_DOCUMENTS.find((d) => d.id === documentId)?.label ||
    documentId;
  const previous = reviews[documentId] || reviews[input.documentId];

  reviews[documentId] = {
    status: input.action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
    reason: input.action === "REJECT" ? reason : null,
    reviewedAt: now,
    reviewedById: input.adminId,
    reviewedByName: input.adminName,
    reuploaded: false,
    replacedAt: previous?.replacedAt ?? null,
  };

  try {
    await prisma.$executeRaw`
      UPDATE users
      SET
        registration_document_reviews = ${JSON.stringify(reviews)},
        documents_reviewed_at = CASE
          WHEN ${input.action === "REJECT"} THEN NULL
          ELSE documents_reviewed_at
        END,
        updated_at = ${new Date()}
      WHERE id = ${input.userId} AND deleted_at IS NULL
    `;
  } catch (err) {
    console.error("[document-reviews] save failed", err);
    return { ok: false, error: "Could not save document review" };
  }

  const allAccepted = SHARED_SECTOR_DOCUMENTS.every(
    (d) => reviews[d.id]?.status === "ACCEPTED"
  );
  if (allAccepted) {
    await markDocumentsReviewedAt(input.userId, new Date(), input.adminId);
  }

  await addRegistrationTimelineEvent({
    userId: input.userId,
    eventType:
      input.action === "ACCEPT" ? "DOCUMENT_ACCEPTED" : "DOCUMENT_REJECTED",
    title:
      input.action === "ACCEPT"
        ? `Document accepted: ${label}`
        : `Document rejected: ${label}`,
    detail: input.action === "REJECT" ? reason : null,
    statusLabel: input.action === "ACCEPT" ? "Accepted" : "Rejected",
    actorId: input.adminId,
    actorLabel: "MMPS Administration",
  });

  return { ok: true, reviews };
}

/** After applicant replaces a file, put that slot back to waiting review. */
export async function clearDocumentReviewAfterReplace(
  userId: number,
  documentIds: string[]
): Promise<void> {
  if (!documentIds.length) return;
  const reviews = await getDocumentReviews(userId);
  const now = new Date().toISOString();
  for (const id of documentIds) {
    reviews[id] = {
      status: "PENDING",
      reason: null,
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reuploaded: true,
      replacedAt: now,
    };
  }
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET
        registration_document_reviews = ${JSON.stringify(reviews)},
        documents_reviewed_at = NULL,
        updated_at = ${new Date()}
      WHERE id = ${userId}
    `;
  } catch (err) {
    console.error("[document-reviews] clear after replace failed", err);
  }
}
