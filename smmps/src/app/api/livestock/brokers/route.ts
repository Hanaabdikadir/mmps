import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { ensureLivestockCatalog, ensureBrokerCode } from "@/lib/livestock-catalog";
import {
  BROKER_DETAIL_INCLUDE,
  serializeBroker,
  syncBrokerAssignments,
} from "@/lib/livestock-assignments";
import { revalidateLivestockPublic } from "@/lib/livestock-price-persist";
import type { AccountStatus, UserStatus } from "@prisma/client";
import { phoneWriteError } from "@/lib/register-validation";
import { hardDeleteBroker } from "@/lib/delete-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  try {
  await ensureLivestockCatalog();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status") as AccountStatus | null;
  const approvalStatus = searchParams.get("approvalStatus") as UserStatus | null;
  const marketId = Number(searchParams.get("marketId") || 0);
  const categoryId = Number(searchParams.get("categoryId") || 0);

  const brokers = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(marketId
        ? {
            OR: [
              { marketId },
              { assignedMarkets: { some: { marketId } } },
            ],
          }
        : {}),
      ...(categoryId
        ? { authorizedCategories: { some: { categoryId } } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { users: { some: { fullName: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: BROKER_DETAIL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  for (const broker of brokers) {
    if (!broker.code) await ensureBrokerCode(broker.id);
  }

  const pendingApplicants = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "PENDING",
      role: "REGISTERED",
      OR: [
        { companySector: { contains: "livestock", mode: "insensitive" } },
        { companyType: { contains: "Camel", mode: "insensitive" } },
        { companyType: { contains: "Cattle", mode: "insensitive" } },
        { companyType: { contains: "Goat", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      profilePicture: true,
      companyType: true,
      createdAt: true,
      market: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonOk({
    brokers: brokers.map((b) => serializeBroker(b)),
    pendingApplicants,
  });
  } catch (error) {
    console.error("[api/livestock/brokers GET]", error);
    return jsonError("Could not load brokers", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const phone = String(body?.phone || "").trim();
  if (!name) return jsonError("Full name is required");
  if (!email) return jsonError("Email is required");
  if (password.length < 8) return jsonError("Password must be at least 8 characters");
  const phoneErr = phoneWriteError(phone, false);
  if (phoneErr) return jsonError(phoneErr);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return jsonError("Email already in use", 409);
  const existingBroker = await prisma.livestockBroker.findFirst({
    where: { email, deletedAt: null },
  });
  if (existingBroker) return jsonError("Broker email already in use", 409);

  const result = await prisma.$transaction(async (tx) => {
    const broker = await tx.livestockBroker.create({
      data: {
        name,
        email,
        phone: phone || null,
        location: body?.location ? String(body.location).trim() : null,
        description: body?.description ? String(body.description) : null,
        status: (body?.status as AccountStatus) || "ACTIVE",
        approvalStatus: (body?.approvalStatus as UserStatus) || "APPROVED",
      },
    });

    const user = await tx.user.create({
      data: {
        fullName: name,
        email,
        password: await hashPassword(password),
        role: "LIVESTOCK_BROKER_USER",
        status: "APPROVED",
        accountStatus: "ACTIVE",
        phone: phone || null,
        companySector: "livestock",
        contactRole: "Livestock Broker",
        brokerId: broker.id,
      },
    });

    return { broker, user };
  });

  await syncBrokerAssignments(result.broker.id, {
    marketIds: Array.isArray(body?.marketIds) ? body.marketIds.map(Number) : [],
    categoryIds: Array.isArray(body?.categoryIds) ? body.categoryIds.map(Number) : [],
    livestockTypeIds: Array.isArray(body?.livestockTypeIds)
      ? body.livestockTypeIds.map(Number)
      : undefined,
  });
  await ensureBrokerCode(result.broker.id);

  const firstCategoryId = Array.isArray(body?.categoryIds)
    ? Number(body.categoryIds[0])
    : 0;
  if (firstCategoryId) {
    const category = await prisma.livestockCategory.findUnique({
      where: { id: firstCategoryId },
      select: { name: true },
    });
    if (category) {
      await prisma.livestockBroker.update({
        where: { id: result.broker.id },
        data: { livestockFocus: category.name },
      });
    }
  }

  await createNotification({
    userId: result.user.id,
    title: "Livestock broker account created",
    message: `Your livestock broker account is ready. You can submit prices for your assigned markets and categories.`,
    type: "USER_CREATED",
    sector: "livestock",
    senderId: auth.user.id,
  });

  const fresh = await prisma.livestockBroker.findUnique({
    where: { id: result.broker.id },
    include: BROKER_DETAIL_INCLUDE,
  });

  return jsonOk(
    {
      broker: fresh ? serializeBroker(fresh) : result.broker,
      user: { id: result.user.id, email: result.user.email, fullName: result.user.fullName },
    },
    201
  );
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);

  if (body?.approveApplicantId) {
    const userId = Number(body.approveApplicantId);
    const applicant = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: "PENDING" },
      select: { id: true, email: true, fullName: true },
    });
    if (!applicant) return jsonError("Pending registration not found", 404);
    await prisma.user.update({
      where: { id: userId },
      data: { status: "APPROVED", accountStatus: "ACTIVE" },
    });
    const { activateApprovedApplicant } = await import(
      "@/lib/activate-approved-applicant"
    );
    await activateApprovedApplicant({ userId, email: applicant.email });
    return jsonOk({ ok: true, approved: applicant.fullName });
  }

  if (body?.rejectApplicantId) {
    const userId = Number(body.rejectApplicantId);
    const applicant = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: "PENDING" },
      select: { id: true, email: true, fullName: true },
    });
    if (!applicant) return jsonError("Pending registration not found", 404);
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        rejectionReason: String(body.reason || "Registration was not approved.").trim(),
        rejectedAt: new Date(),
        rejectedById: auth.user.id,
      },
    });
    return jsonOk({ ok: true, rejected: applicant.fullName });
  }

  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  const existing = await prisma.livestockBroker.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return jsonError("Broker not found", 404);

  if (body.phone != null) {
    const patchPhoneErr = phoneWriteError(String(body.phone), false);
    if (patchPhoneErr) return jsonError(patchPhoneErr);
  }

  const broker = await prisma.livestockBroker.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.email != null ? { email: String(body.email).trim().toLowerCase() } : {}),
      ...(body.phone != null ? { phone: String(body.phone).trim() } : {}),
      ...(body.location != null ? { location: String(body.location).trim() } : {}),
      ...(body.description != null ? { description: String(body.description) } : {}),
      ...(body.status != null ? { status: body.status as AccountStatus } : {}),
      ...(body.approvalStatus != null
        ? { approvalStatus: body.approvalStatus as UserStatus }
        : {}),
    },
  });

  if (
    body.marketIds ||
    body.categoryIds ||
    body.livestockTypeIds
  ) {
    await syncBrokerAssignments(id, {
      marketIds: Array.isArray(body.marketIds) ? body.marketIds.map(Number) : undefined,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds.map(Number) : undefined,
      livestockTypeIds: Array.isArray(body.livestockTypeIds)
        ? body.livestockTypeIds.map(Number)
        : undefined,
    });
  }

  await ensureBrokerCode(id);

  const fresh = await prisma.livestockBroker.findUnique({
    where: { id },
    include: BROKER_DETAIL_INCLUDE,
  });

  return jsonOk({ broker: fresh ? serializeBroker(fresh) : broker });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const existing = await prisma.livestockBroker.findFirst({
    where: { id },
  });
  if (!existing) return jsonError("Broker not found", 404);

  await hardDeleteBroker(id);

  revalidateLivestockPublic();
  return jsonOk({ ok: true });
}
