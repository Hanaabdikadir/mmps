import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  getRegistrationRejectionInfo,
  listRejectionReasonHistory,
  updateRegistrationRejectionReason,
} from "@/lib/registration-tracking";

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
      select: { id: true, status: true, fullName: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const rejection = await getRegistrationRejectionInfo(userId);
    const history = await listRejectionReasonHistory(userId);

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
      rejection,
      history,
    });
  } catch (error) {
    console.error("[rejection-reason GET]", error);
    return NextResponse.json(
      { error: "Could not load rejection details" },
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
    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : typeof body?.rejectionReason === "string"
          ? body.rejectionReason.trim()
          : "";

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const result = await updateRegistrationRejectionReason({
      userId,
      newReason: reason,
      changedById: admin.id,
      changedByName: admin.fullName,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
    } catch {
    }

    const rejection = await getRegistrationRejectionInfo(userId);
    const history = await listRejectionReasonHistory(userId);

    return NextResponse.json({
      ok: true,
      message: "Rejection reason updated successfully.",
      rejection,
      history,
    });
  } catch (error) {
    console.error("[rejection-reason PATCH]", error);
    return NextResponse.json(
      { error: "Could not update rejection reason" },
      { status: 503 }
    );
  }
}
