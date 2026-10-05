import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  getDocumentsReviewedAt,
  markDocumentsReviewedAt,
} from "@/lib/documents-reviewed";

/**
 * Mark registration documents as reviewed by Super Admin.
 * Drives application track step 03 → DONE (green tick).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser("super");
    if (!admin || !isSuperAdmin(admin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid applicant id" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const existing = await getDocumentsReviewedAt(userId);
    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyReviewed: true,
        documentsReviewedAt: existing.toISOString(),
      });
    }

    const now = new Date();
    const reviewedAt = await markDocumentsReviewedAt(userId, now, admin.id);
    if (!reviewedAt) {
      return NextResponse.json(
        { error: "Could not mark documents as reviewed" },
        { status: 503 }
      );
    }

    try {
    } catch {
    }

    return NextResponse.json({
      ok: true,
      alreadyReviewed: false,
      documentsReviewedAt: reviewedAt.toISOString(),
    });
  } catch (error) {
    console.error("[super-admin/users/.../review-documents]", error);
    return NextResponse.json(
      { error: "Could not mark documents as reviewed" },
      { status: 503 }
    );
  }
}
