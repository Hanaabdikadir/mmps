import { NextResponse } from "next/server";
import {
  getCurrentUser,
  isApproved,
  isSuperAdmin,
} from "@/lib/auth";
import {
  listThreadMessages,
  markThreadReadForViewer,
  postThreadMessage,
} from "@/lib/registration-messages";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";

async function requireSuperAdmin() {
  const user = await getCurrentUser("super");
  if (!user || !isApproved(user) || !isSuperAdmin(user)) return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const threadUserId = Number(url.searchParams.get("userId"));
  if (!Number.isFinite(threadUserId) || threadUserId <= 0) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const applicant = await withDbTimeout(
    prisma.user.findFirst({
      where: { id: threadUserId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        companyName: true,
        companySector: true,
        status: true,
      },
    })
  );
  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  try {
    await markThreadReadForViewer({
      threadUserId,
      viewerId: admin.id,
    });
    const messages = await listThreadMessages(threadUserId, {
      skipWelcome: true,
      hideWelcome: applicant.status === "APPROVED",
    });
    return NextResponse.json({
      threadUserId,
      applicant,
      messages,
    });
  } catch (error) {
    console.error("[super-admin/registration-messages GET]", error);
    return NextResponse.json(
      { error: "Could not load messages" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: number;
    body?: string;
  };
  const threadUserId = Number(body.userId);
  if (!Number.isFinite(threadUserId) || threadUserId <= 0) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const applicant = await withDbTimeout(
    prisma.user.findFirst({
      where: { id: threadUserId, deletedAt: null },
      select: { id: true },
    })
  );
  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  try {
    const message = await postThreadMessage({
      threadUserId,
      senderId: admin.id,
      body: String(body.body ?? ""),
    });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Could not send message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
