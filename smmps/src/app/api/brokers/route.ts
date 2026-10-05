import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import {
  formatRegisteredCompanyLocation,
  REGISTRATION_COMPANY_COUNTRY,
} from "@/lib/company-registration";
import { phoneWriteError, registerErrorMessage } from "@/lib/register-validation";
import { hardDeleteBroker } from "@/lib/delete-user";
import {
  REGISTRATION_COMPANY_LOGO_FIELD,
  REGISTRATION_DOCUMENT_FORM_PREFIX,
  requiredDocumentIds,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import {
  RegistrationUploadError,
  saveRegistrationCompanyLogo,
  saveRegistrationDocument,
} from "@/lib/registration-upload";
import type { AccountStatus } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (
    !checkPermission(auth.user, "MANAGE_LIVESTOCK_BROKERS") &&
    !checkPermission(auth.user, "MANAGE_SUBSCRIPTIONS")
  ) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status") as AccountStatus | null;

  const brokers = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      market: { select: { id: true, name: true } },
      _count: { select: { users: true, livestockPrices: true } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
        take: 1,
        include: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ brokers });
}

async function saveBrokerUploads(form: FormData): Promise<{
  companyLogoFileName: string;
  registrationDocuments: string;
  documentFileName?: string;
  profilePicture: string;
}> {
  const logoEntry = form.get(REGISTRATION_COMPANY_LOGO_FIELD);
  if (!(logoEntry instanceof File) || logoEntry.size === 0) {
    throw new RegistrationUploadError("companyLogoRequired");
  }
  const companyLogoFileName = await saveRegistrationCompanyLogo(logoEntry);

  const ids = requiredDocumentIds("livestock");
  const stored: Partial<Record<RegistrationDocumentId, string>> = {};
  for (const id of ids) {
    const entry = form.get(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`);
    if (entry instanceof File && entry.size > 0) {
      stored[id] = await saveRegistrationDocument(entry);
    }
  }
  for (const id of ids) {
    if (!stored[id]?.trim()) {
      throw new RegistrationUploadError("docsRequired");
    }
  }

  return {
    companyLogoFileName,
    registrationDocuments: JSON.stringify(stored),
    documentFileName:
      stored.business_license ??
      stored.id_passport ??
      Object.values(stored)[0],
    profilePicture: stored.personal_photo ?? companyLogoFileName,
  };
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  if (!isMultipart) {
    const body = await request.json().catch(() => null);
    if (!body?.name?.trim()) return jsonError("name is required");
    const jsonPhoneErr = phoneWriteError(String(body.phone ?? ""), false);
    if (jsonPhoneErr) return jsonError(jsonPhoneErr);

    const broker = await prisma.livestockBroker.create({
      data: {
        name: String(body.name).trim(),
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        phone: (() => {
          const raw = body.phone ? String(body.phone).trim() : "";
          return raw || null;
        })(),
        location: body.location ? String(body.location).trim() : null,
        description: body.description ? String(body.description) : null,
        livestockFocus: body.livestockFocus ? String(body.livestockFocus) : null,
        marketId: body.marketId != null ? Number(body.marketId) : null,
        status: (body.status as AccountStatus) || "ACTIVE",
      },
    });

    return jsonOk({ broker }, 201);
  }

  const form = await request.formData();
  const str = (key: string) => String(form.get(key) ?? "").trim();
  const fullName = str("fullName");
  const email = str("email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");
  const phone = str("phone") || null;
  const companyName = str("companyName");
  const livestockSection = str("livestockSection");
  const companyDistrict = str("companyDistrict");
  const companyAddress = str("companyAddress");
  const companyEmail = str("companyEmail").toLowerCase() || email;
  const marketIdRaw = str("marketId");
  const marketId = marketIdRaw ? Number(marketIdRaw) : null;

  if (!fullName || !email || password.length < 8) {
    return jsonError("fullName, email, and password (8+ chars) are required");
  }
  const phoneErr = phoneWriteError(phone || "", true);
  if (phoneErr) return jsonError(phoneErr);
  if (password !== confirmPassword) return jsonError("Passwords do not match");
  if (!companyName) return jsonError("Broker / market name is required");
  if (!livestockSection) return jsonError("Select a market section");
  if (!companyDistrict) return jsonError("Select a Banadir district");
  if (!companyAddress || companyAddress.length < 5) {
    return jsonError("Address must be at least 5 characters");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return jsonError("Email already in use", 409);

  const existingBroker = await prisma.livestockBroker.findFirst({
    where: { email, deletedAt: null },
  });
  if (existingBroker) return jsonError("Broker email already in use", 409);

  let uploads;
  try {
    uploads = await saveBrokerUploads(form);
  } catch (error) {
    if (error instanceof RegistrationUploadError) {
      return jsonError(registerErrorMessage(error.code, "en"));
    }
    console.error("[api/brokers POST uploads]", error);
    return jsonError("Could not save uploaded files", 500);
  }

  const companyLocation = formatRegisteredCompanyLocation(
    companyDistrict,
    companyAddress
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const broker = await tx.livestockBroker.create({
        data: {
          name: companyName,
          email,
          phone,
          location: companyDistrict,
          description: companyAddress,
          livestockFocus: livestockSection,
          marketId: Number.isFinite(marketId) ? marketId : null,
          status: "ACTIVE",
          profilePicture: uploads.companyLogoFileName,
        },
      });

      const user = await tx.user.create({
        data: {
          fullName,
          email,
          password: await hashPassword(password),
          role: "LIVESTOCK_BROKER_USER",
          status: "APPROVED",
          accountStatus: "ACTIVE",
          phone,
          companyName,
          companyType: "Livestock Market Company",
          companySector: "Livestock",
          companyDistrict,
          companyAddress,
          companyEmail,
          companyLocation,
          companyCountry: REGISTRATION_COMPANY_COUNTRY,
          contactRole: livestockSection || "Livestock Market Broker",
          brokerId: broker.id,
          companyLogoFileName: uploads.companyLogoFileName,
          documentFileName: uploads.documentFileName,
          registrationDocuments: uploads.registrationDocuments,
          profilePicture: uploads.profilePicture,
        },
      });

      return { broker, user };
    });

    await createNotification({
      userId: result.user.id,
      title: "Broker account created",
      message: `Your livestock broker account was created for ${email}.`,
      type: "USER_CREATED",
      sector: "account",
      senderId: auth.user.id,
    });

    try {
      const { assignBrokerFromRegistration } = await import(
        "@/lib/livestock-assignments"
      );
      await assignBrokerFromRegistration({
        brokerId: result.broker.id,
        marketId: Number.isFinite(marketId) ? marketId : null,
        livestockSection,
      });
    } catch (assignError) {
      console.error("[api/brokers POST assign]", assignError);
    }

    return jsonOk(
      {
        broker: result.broker,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
        },
      },
      201
    );
  } catch (error) {
    console.error("[api/brokers POST]", error);
    return jsonError("Could not save broker to the database", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
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
      ...(body.email != null
        ? { email: String(body.email).trim().toLowerCase() }
        : {}),
      ...(body.phone != null ? { phone: String(body.phone).trim() } : {}),
      ...(body.location != null
        ? { location: String(body.location).trim() }
        : {}),
      ...(body.description != null
        ? { description: String(body.description) }
        : {}),
      ...(body.livestockFocus != null
        ? { livestockFocus: String(body.livestockFocus) }
        : {}),
      ...(body.marketId !== undefined
        ? { marketId: body.marketId == null ? null : Number(body.marketId) }
        : {}),
      ...(body.status != null ? { status: body.status as AccountStatus } : {}),
    },
  });

  if (body.status != null) {
    const accountStatus = String(body.status).toUpperCase();
    if (accountStatus === "ACTIVE" || accountStatus === "SUSPENDED") {
      await prisma.user.updateMany({
        where: { deletedAt: null, brokerId: id },
        data: { accountStatus: accountStatus as "ACTIVE" | "SUSPENDED" },
      });
    } else if (accountStatus === "INACTIVE") {
      await prisma.user.updateMany({
        where: { deletedAt: null, brokerId: id },
        data: { accountStatus: "SUSPENDED" },
      });
    }
  }

  if (body.marketId !== undefined || body.livestockFocus != null) {
    try {
      const { assignBrokerFromRegistration } = await import(
        "@/lib/livestock-assignments"
      );
      await assignBrokerFromRegistration({
        brokerId: id,
        marketId: broker.marketId,
        livestockSection: broker.livestockFocus,
      });
    } catch (assignError) {
      console.error("[api/brokers PATCH assign]", assignError);
    }
  }

  return jsonOk({ broker });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const existing = await prisma.livestockBroker.findFirst({
    where: { id },
    select: { id: true },
  });
  if (!existing) return jsonError("Broker not found", 404);

  await hardDeleteBroker(id);

  return jsonOk({ ok: true });
}
