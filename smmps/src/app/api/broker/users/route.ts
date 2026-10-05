import { prisma } from "@/lib/prisma";

import {

  getCurrentUser,

  hashPassword,

  isSuperAdmin,

} from "@/lib/auth";

import { jsonOk, jsonError } from "@/lib/api-guard";

import { syncUnlinkedLivestockBrokers } from "@/lib/promote-broker";

import { normalizeBanadirDistrict } from "@/lib/banadir-districts";
import { phoneWriteError } from "@/lib/register-validation";
import { hardDeleteUser } from "@/lib/delete-user";

import {

  saveRegistrationCompanyLogo,

  saveRegistrationDocument,

} from "@/lib/registration-upload";

import {

  brokerUsersWhere,

  canManageBrokerUser,

  isLivestockManagerBroker,

  resolveSectionBrokerId,

  SECTION_BROKER_EMAILS,

} from "@/lib/livestock-manager-broker";

export async function GET() {

  const user = await getCurrentUser();

  if (!user) return jsonError("Unauthorized", 401);

  if (!isSuperAdmin(user) && user.role !== "LIVESTOCK_BROKER_USER") {

    return jsonError("Forbidden", 403);

  }

  if (!user.brokerId && !isLivestockManagerBroker(user) && !isSuperAdmin(user)) {

    return jsonError("No broker account linked", 400);

  }

  if (isSuperAdmin(user)) {

    await syncUnlinkedLivestockBrokers().catch(() => 0);

  }

  const broker = user.brokerId

    ? await prisma.livestockBroker.findUnique({

        where: { id: user.brokerId },

        select: { id: true, name: true, livestockFocus: true, location: true },

      })

    : null;

  const users = await prisma.user.findMany({

    where: await brokerUsersWhere(user),

    select: {

      id: true,

      fullName: true,

      email: true,

      phone: true,

      role: true,

      status: true,

      accountStatus: true,

      companyType: true,

      companyName: true,

      companyDistrict: true,

      createdAt: true,

    },

    orderBy: { createdAt: "desc" },

  });

  const seen = new Set<string>();

  const unique = users.filter((u) => {

    const key = u.email.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);

    return true;

  });

  return jsonOk({

    broker,

    users: unique.map((u) => ({

      ...u,

      createdAt: u.createdAt.toISOString(),

    })),

  });

}

export async function POST(request: Request) {

  const user = await getCurrentUser();

  if (!user) return jsonError("Unauthorized", 401);

  if (!isSuperAdmin(user)) return jsonError("Forbidden", 403);

  if (!user.brokerId && !isLivestockManagerBroker(user)) {

    return jsonError("No broker account linked", 400);

  }

  const contentType = request.headers.get("content-type") || "";

  const isForm = contentType.includes("multipart/form-data");

  let fullName = "";

  let email = "";

  let password = "";

  let confirmPassword = "";

  let phone = "";

  let companyName = "";

  let companyDistrict = "";

  let companyAddress = "";

  let companyEmail = "";

  let sectionEmail = "";

  let logoFile: File | null = null;

  const docFiles: Record<string, File> = {};

  if (isForm) {

    const form = await request.formData();

    fullName = String(form.get("fullName") || "").trim();

    email = String(form.get("email") || "")

      .trim()

      .toLowerCase();

    password = String(form.get("password") || "");

    confirmPassword = String(form.get("confirmPassword") || "");

    phone = String(form.get("phone") || "").trim();

    companyName = String(form.get("companyName") || "").trim();

    companyDistrict = String(form.get("companyDistrict") || "").trim();

    companyAddress = String(form.get("companyAddress") || "").trim();

    companyEmail = String(form.get("companyEmail") || "")

      .trim()

      .toLowerCase();

    sectionEmail = String(form.get("sectionEmail") || "")

      .trim()

      .toLowerCase();

    const logo = form.get("companyLogo");

    if (logo instanceof File && logo.size > 0) logoFile = logo;

    for (const [key, value] of form.entries()) {

      if (key.startsWith("doc_") && value instanceof File && value.size > 0) {

        docFiles[key.replace(/^doc_/, "")] = value;

      }

    }

  } else {

    const body = await request.json().catch(() => null);

    fullName = String(body?.fullName || "").trim();

    email = String(body?.email || "")

      .trim()

      .toLowerCase();

    password = String(body?.password || "");

    confirmPassword = String(body?.confirmPassword || password);

    phone = body?.phone ? String(body.phone).trim() : "";

    companyName = String(body?.companyName || "").trim();

    companyDistrict = String(body?.companyDistrict || "").trim();

    companyAddress = String(body?.companyAddress || "").trim();

    companyEmail = String(body?.companyEmail || "")

      .trim()

      .toLowerCase();

    sectionEmail = String(body?.sectionEmail || "")

      .trim()

      .toLowerCase();

  }

  if (!fullName || !email || !password) {

    return jsonError("fullName, email, and password are required");

  }

  if (password.length < 8) {

    return jsonError("Password must be at least 8 characters");

  }

  if (password !== confirmPassword) {

    return jsonError("Passwords do not match");

  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

    return jsonError("Invalid email");

  }

  const phoneErr = phoneWriteError(phone, true);

  if (phoneErr) return jsonError(phoneErr);

  if (!companyName) {

    return jsonError("Broker / market name is required");

  }

  const district = normalizeBanadirDistrict(companyDistrict);

  if (!district) {

    return jsonError("Select a Banadir district");

  }

  let targetBrokerId = user.brokerId ?? null;

  let section = "Camel Market Section";

  if (isLivestockManagerBroker(user)) {

    if (!sectionEmail) {

      return jsonError("Select Camel, Cattle, or Goat section");

    }

    targetBrokerId = await resolveSectionBrokerId(sectionEmail);

    if (!targetBrokerId) {

      return jsonError("Section broker account not found");

    }

    const sectionBroker = await prisma.livestockBroker.findUnique({

      where: { id: targetBrokerId },

      select: { livestockFocus: true },

    });

    section = sectionBroker?.livestockFocus?.trim() || section;

  } else if (user.brokerId) {

    const broker = await prisma.livestockBroker.findUnique({

      where: { id: user.brokerId },

      select: { id: true, name: true, livestockFocus: true, location: true },

    });

    if (!broker) return jsonError("Broker account not found", 404);

    section = broker.livestockFocus?.trim() || section;

  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) return jsonError("Email already in use", 409);

  let companyLogoFileName: string | undefined;

  if (logoFile) {

    try {

      companyLogoFileName = await saveRegistrationCompanyLogo(logoFile);

    } catch {

      return jsonError("Could not save market logo");

    }

  }

  const registrationDocuments: Record<string, string> = {};

  for (const [id, file] of Object.entries(docFiles)) {

    try {

      registrationDocuments[id] = await saveRegistrationDocument(file);

    } catch {

      return jsonError(`Could not save document: ${id}`);

    }

  }

  const hashed = await hashPassword(password);

  const created = await prisma.user.create({

    data: {

      fullName,

      email,

      password: hashed,

      phone: phone || null,

      role: "LIVESTOCK_BROKER_USER",

      status: "APPROVED",

      accountStatus: "ACTIVE",

      brokerId: targetBrokerId,

      companyName,

      companyType: section,

      companySector: "livestock",

      companyDistrict: district,

      companyAddress: companyAddress || section,

      companyEmail: companyEmail || email,

      companyLocation: `${section}, Mogadishu`,

      companyCountry: "Somalia",

      companyLogoFileName: companyLogoFileName || null,

      registrationDocuments:

        Object.keys(registrationDocuments).length > 0

          ? JSON.stringify(registrationDocuments)

          : null,

      contactRole: section,

    },

    select: {

      id: true,

      fullName: true,

      email: true,

      role: true,

      status: true,

      accountStatus: true,

      companyType: true,

      companyName: true,

      companyDistrict: true,

      createdAt: true,

    },

  });

  return jsonOk(

    {

      user: {

        ...created,

        createdAt: created.createdAt.toISOString(),

      },

    },

    201

  );

}

export async function PATCH(request: Request) {

  const user = await getCurrentUser();

  if (!user) return jsonError("Unauthorized", 401);

  if (!isSuperAdmin(user)) return jsonError("Forbidden", 403);

  const body = await request.json().catch(() => null);

  const id = Number(body?.id);

  if (!id) return jsonError("id is required");

  const target = await prisma.user.findFirst({

    where: { id, deletedAt: null },

    select: {

      id: true,

      email: true,

      fullName: true,

      brokerId: true,

      role: true,

      accountStatus: true,

    },

  });

  if (!target) return jsonError("User not found", 404);

  if (!(await canManageBrokerUser(user, target))) {

    return jsonError("You cannot manage this account", 403);

  }

  const data: {

    fullName?: string;

    phone?: string | null;

    companyName?: string;

    companyDistrict?: string;

    accountStatus?: "ACTIVE" | "SUSPENDED";

  } = {};

  if (body.fullName != null) data.fullName = String(body.fullName).trim();

  if (body.phone != null) {
    const phoneErr = phoneWriteError(String(body.phone), false);
    if (phoneErr) return jsonError(phoneErr);
    data.phone = String(body.phone).trim() || null;
  }

  if (body.companyName != null) data.companyName = String(body.companyName).trim();

  if (body.companyDistrict != null) {

    const district = normalizeBanadirDistrict(String(body.companyDistrict));

    if (district) data.companyDistrict = district;

  }

  if (body.accountStatus != null) {

    const status = String(body.accountStatus).toUpperCase();

    if (status !== "ACTIVE" && status !== "SUSPENDED") {

      return jsonError("accountStatus must be ACTIVE or SUSPENDED");

    }

    data.accountStatus = status;

  }

  const updated = await prisma.user.update({

    where: { id },

    data,

    select: {

      id: true,

      fullName: true,

      email: true,

      phone: true,

      role: true,

      status: true,

      accountStatus: true,

      companyType: true,

      companyName: true,

      companyDistrict: true,

      createdAt: true,

    },

  });

  return jsonOk({

    user: { ...updated, createdAt: updated.createdAt.toISOString() },

  });

}

export async function DELETE(request: Request) {

  const user = await getCurrentUser();

  if (!user) return jsonError("Unauthorized", 401);

  if (!isSuperAdmin(user)) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(request.url);

  const id = Number(searchParams.get("id"));

  if (!id) return jsonError("id is required");

  const target = await prisma.user.findFirst({

    where: { id, deletedAt: null },

    select: {

      id: true,

      email: true,

      brokerId: true,

      role: true,

    },

  });

  if (!target) return jsonError("User not found", 404);

  if (!(await canManageBrokerUser(user, target))) {

    return jsonError("You cannot delete this account", 403);

  }

  await hardDeleteUser(id);

  return jsonOk({ ok: true });

}

export { SECTION_BROKER_EMAILS };

