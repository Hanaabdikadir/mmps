import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  getDocumentReviews,
  setDocumentReview,
} from "@/lib/registration-document-reviews";
import { SHARED_SECTOR_DOCUMENTS } from "@/lib/registration-requirements";

export async function GET(
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
      select: { id: true, status: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const reviews = await getDocumentReviews(userId);
    return NextResponse.json({
      slots: SHARED_SECTOR_DOCUMENTS.map((d) => ({
        id: d.id,
        label: d.label,
        review: reviews[d.id] || {
          status: "PENDING",
          reason: null,
          reviewedAt: null,
          reviewedById: null,
        },
      })),
      reviews,
    });
  } catch (error) {
    console.error("[document-reviews GET]", error);
    return NextResponse.json(
      { error: "Could not load document reviews" },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: Request,
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

    const body = await request.json().catch(() => ({}));
    const documentId =
      typeof body?.documentId === "string" ? body.documentId.trim() : "";
    const actionRaw = String(body?.action || "").toUpperCase();
    const action =
      actionRaw === "ACCEPT" || actionRaw === "ACCEPTED"
        ? "ACCEPT"
        : actionRaw === "REJECT" || actionRaw === "REJECTED"
          ? "REJECT"
          : null;
    const reason =
      typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!documentId || !action) {
      return NextResponse.json(
        { error: "documentId and action (ACCEPT|REJECT) are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, status: true, email: true, fullName: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const result = await setDocumentReview({
      userId,
      documentId,
      action,
      reason,
      adminId: admin.id,
      adminName: admin.fullName,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
    } catch {
    }

    if (action === "REJECT") {
      try {
        const { createNotification } = await import("@/lib/notifications");
        const label =
          SHARED_SECTOR_DOCUMENTS.find((d) => d.id === documentId)?.label ||
          documentId;
        await createNotification({
          userId,
          title: `Document needs replacement: ${label}`,
          message: reason
            ? `"${label}" was not accepted. Reason: ${reason}. Open Documents to upload a replacement.`
            : `"${label}" was not accepted. Open Documents to upload a replacement.`,
          type: "GENERAL",
          sector: "account",
        });
      } catch {
      }
    }

    return NextResponse.json({
      ok: true,
      reviews: result.reviews,
      slots: SHARED_SECTOR_DOCUMENTS.map((d) => ({
        id: d.id,
        label: d.label,
        review: result.reviews[d.id] || {
          status: "PENDING",
          reason: null,
          reviewedAt: null,
          reviewedById: null,
        },
      })),
    });
  } catch (error) {
    console.error("[document-reviews PATCH]", error);
    return NextResponse.json(
      { error: "Could not update document review" },
      { status: 503 }
    );
  }
}
