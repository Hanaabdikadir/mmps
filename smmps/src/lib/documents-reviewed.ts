import { prisma } from "@/lib/prisma";
import { recordDocumentsReviewedTimeline } from "@/lib/registration-tracking";

/** Read Super Admin document-review timestamp without requiring a fresh Prisma client. */
export async function getDocumentsReviewedAt(
  userId: number
): Promise<Date | null> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ documents_reviewed_at: Date | null }>
    >`SELECT documents_reviewed_at FROM users WHERE id = ${userId} LIMIT 1`;
    return rows[0]?.documents_reviewed_at ?? null;
  } catch {
    return null;
  }
}

/** Mark registration documents reviewed (idempotent). */
export async function markDocumentsReviewedAt(
  userId: number,
  at: Date = new Date(),
  actorId?: number | null
): Promise<Date | null> {
  try {
    const existing = await getDocumentsReviewedAt(userId);
    await prisma.$executeRaw`
      UPDATE users
      SET documents_reviewed_at = COALESCE(documents_reviewed_at, ${at})
      WHERE id = ${userId}
    `;
    if (!existing) {
      await recordDocumentsReviewedTimeline(userId, actorId ?? null);
    }
    return getDocumentsReviewedAt(userId);
  } catch {
    return null;
  }
}
