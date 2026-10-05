import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { hardDeleteUser, isProtectedPlatformUser } from "@/lib/delete-user";
import { LIVESTOCK_MANAGER_EMAIL } from "@/lib/livestock-manager-broker";
import {
  COMPANY_REGISTRATION_TYPES,
  formatRegisteredCompanyLocation,
  REGISTRATION_COMPANY_COUNTRY,
  companyTypeToSector,
} from "@/lib/company-registration";
import {
  phoneWriteError,
  registerErrorMessage,
  validateEmailField,
} from "@/lib/register-validation";
import {
  REGISTRATION_COMPANY_LOGO_FIELD,
  REGISTRATION_DOCUMENT_FORM_PREFIX,
  requiredDocumentIds,
  type CompanyRegistrationSector,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import {
  RegistrationUploadError,
  saveRegistrationCompanyLogo,
  saveRegistrationDocument,
} from "@/lib/registration-upload";
import type { CompanyType, Role } from "@prisma/client";
import { areRegisteredLivestockTypeChoices } from "@/lib/livestock-catalog";
import { findRegistrationLivestockMarket } from "@/lib/livestock-registration-markets";
import { promoteApprovedBroker } from "@/lib/promote-broker";
import { promoteApprovedCompany } from "@/lib/promote-company";
import { allocateUniqueCompanySlug } from "@/lib/registered-companies-store";
import { findDefaultMarketForCompanyType } from "@/lib/company-default-market";
import { assignBrokerFromRegistration } from "@/lib/livestock-assignments";
import { formatRoleLabel } from "@/lib/role-labels";

const CREATABLE_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "LIVESTOCK_BROKER_USER",
];

function personalPhotoFromRegistrationDocs(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  try {
    const docs = JSON.parse(raw) as Record<string, unknown>;
    const file = docs.personal_photo;
    return typeof file === "string" && file.trim() ? file.trim() : null;
  } catch {
    return null;
  }
}

function parseRegistrationDocuments(
  raw: string | null | undefined
): Record<string, string> | null {
  if (!raw?.trim()) return null;
  try {
    const docs = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(docs)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requirePermission("MANAGE_USERS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const [users, livestockCategoryCount] = await Promise.all([
    prisma.user.findMany({
    where: {
      role: { not: "SUPER_ADMIN" },
      email: { not: LIVESTOCK_MANAGER_EMAIL },
      AND: [
        q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        {
          OR: [
            { deletedAt: null, status: "APPROVED" },
            { deletedAt: { not: null } },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      accountStatus: true,
      companyId: true,
      brokerId: true,
      companySlug: true,
      companyName: true,
      companySector: true,
      companyType: true,
      contactRole: true,
      companyLocation: true,
      companyAddress: true,
      profilePicture: true,
      registrationDocuments: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      market: { select: { id: true, name: true, location: true } },
      company: { select: { id: true, name: true } },
      broker: {
        select: {
          id: true,
          name: true,
          livestockFocus: true,
          market: { select: { id: true, name: true, location: true } },
          assignedMarkets: {
            select: { market: { select: { id: true, name: true, location: true } } },
          },
          authorizedCategories: {
            select: {
              category: { select: { slug: true, name: true, nameSomali: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  }),
    prisma.livestockCategory.count({ where: { status: "ACTIVE" } }),
  ]);

  return jsonOk({
    users: users
      .filter((u) => !isProtectedPlatformUser({ email: u.email, role: u.role }))
      .map((u) => {
        const registrationDocuments = parseRegistrationDocuments(
          u.registrationDocuments
        );
        const personalPhotoFile =
          (u.profilePicture?.trim() ? u.profilePicture.trim() : null) ||
          personalPhotoFromRegistrationDocs(u.registrationDocuments);

        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          status: u.status,
          accountStatus: u.accountStatus,
          companyId: u.companyId,
          brokerId: u.brokerId,
          companySlug: u.companySlug,
          companyName: u.companyName,
          companySector: u.companySector,
          companyType: u.companyType,
          contactRole: u.contactRole,
          companyLocation: u.companyLocation,
          companyAddress: u.companyAddress,
          deletedAt: u.deletedAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          market: u.market || u.broker?.market || null,
          assignedMarketNames: (u.broker?.assignedMarkets ?? [])
            .map((link) => link.market?.name)
            .filter((name): name is string => Boolean(name)),
          company: u.company,
          broker: u.broker
            ? {
                id: u.broker.id,
                name: u.broker.name,
                livestockFocus: u.broker.livestockFocus,
                categories: (u.broker.authorizedCategories ?? [])
                  .map((row) => row.category)
                  .filter(Boolean),
              }
            : null,
          personalPhotoFile,
          registrationDocuments,
        };
      }),
    livestockCategoryCount,
  });
}

type CreateUserFields = {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  role: Role;
  phone: string;
  companyName: string;
  companyType: string;
  companyDistrict: string;
  companyAddress: string;
  companyEmail: string;
  livestockSection: string;
  marketIdRaw: string;
  planIdRaw: string;
  companyIdRaw: string;
  brokerIdRaw: string;
};

async function readCreateUserRequest(request: Request): Promise<{
  fields: CreateUserFields;
  form: FormData | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const str = (key: string) => String(form.get(key) ?? "").trim();
    return {
      form,
      fields: {
        email: str("email").toLowerCase(),
        fullName: str("fullName"),
        password: String(form.get("password") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
        role: (str("role") as Role) || "COMPANY_ADMIN",
        phone: str("phone"),
        companyName: str("companyName"),
        companyType: str("companyType"),
        companyDistrict: str("companyDistrict"),
        companyAddress: str("companyAddress"),
        companyEmail: str("companyEmail").toLowerCase(),
        livestockSection: str("livestockSection"),
        marketIdRaw: str("marketId"),
        planIdRaw: str("planId"),
        companyIdRaw: str("companyId"),
        brokerIdRaw: str("brokerId"),
      },
    };
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    form: null,
    fields: {
      email: String(body?.email || "").trim().toLowerCase(),
      fullName: String(body?.fullName || "").trim(),
      password: String(body?.password || ""),
      confirmPassword: String(body?.confirmPassword || ""),
      role: (body?.role as Role) || "COMPANY_ADMIN",
      phone: String(body?.phone || "").trim(),
      companyName: String(body?.companyName || "").trim(),
      companyType: String(body?.companyType || "").trim(),
      companyDistrict: String(body?.companyDistrict || "").trim(),
      companyAddress: String(body?.companyAddress || "").trim(),
      companyEmail: String(body?.companyEmail || "").trim().toLowerCase(),
      livestockSection: String(body?.livestockSection || "").trim(),
      marketIdRaw: body?.marketId != null ? String(body.marketId) : "",
      planIdRaw: body?.planId != null ? String(body.planId) : "",
      companyIdRaw: body?.companyId != null ? String(body.companyId) : "",
      brokerIdRaw: body?.brokerId != null ? String(body.brokerId) : "",
    },
  };
}

async function saveCreateUserUploads(
  form: FormData,
  sector: CompanyRegistrationSector,
  options?: { logoRequired?: boolean }
): Promise<{
  companyLogoFileName: string | undefined;
  registrationDocuments: string | undefined;
  documentFileName?: string;
  profilePicture: string | undefined;
}> {
  const logoEntry = form.get(REGISTRATION_COMPANY_LOGO_FIELD);
  let companyLogoFileName: string | undefined;
  if (logoEntry instanceof File && logoEntry.size > 0) {
    companyLogoFileName = await saveRegistrationCompanyLogo(logoEntry);
  } else if (options?.logoRequired !== false) {
    throw new RegistrationUploadError("companyLogoRequired");
  }

  const ids = requiredDocumentIds(sector);
  const stored: Partial<Record<RegistrationDocumentId, string>> = {};
  for (const id of ids) {
    const entry = form.get(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`);
    if (entry instanceof File && entry.size > 0) {
      stored[id] = await saveRegistrationDocument(entry);
    }
  }

  const hasDocs = Object.keys(stored).length > 0;
  return {
    companyLogoFileName,
    registrationDocuments: hasDocs ? JSON.stringify(stored) : undefined,
    documentFileName:
      stored.business_license ??
      stored.id_passport ??
      Object.values(stored)[0],
    profilePicture: stored.personal_photo ?? companyLogoFileName,
  };
}

function prismaCompanyType(companyType: string | null): CompanyType {
  const hay = (companyType || "").toLowerCase();
  if (hay.includes("water")) return "WATER_SUPPLY";
  if (hay.includes("electric")) return "ELECTRICITY";
  return "OTHER";
}

/** Public company card + active Company row so the new login can open /admin. */
async function activateCreatedCompanyAccount(opts: {
  userId: number;
  email: string;
  role: Role;
}) {
  try {
    await promoteApprovedCompany({ userId: opts.userId, email: opts.email });
  } catch (error) {
    console.error("[api/users POST promote company]", error);
  }

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: {
      companyId: true,
      companySlug: true,
      companyName: true,
      email: true,
      phone: true,
      companyEmail: true,
      companyDistrict: true,
      companyAddress: true,
      companyLocation: true,
      companyType: true,
      companyLogoFileName: true,
    },
  });
  if (!user) return;

  const slug =
    user.companySlug?.trim() ||
    (await allocateUniqueCompanySlug(user.companyName || user.email));

  let company = user.companyId
    ? await prisma.company.findFirst({
        where: { id: user.companyId, deletedAt: null },
      })
    : await prisma.company.findFirst({
        where: { slug, deletedAt: null },
      });

  if (company && company.status !== "ACTIVE") {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { status: "ACTIVE" },
    });
  }

  if (!company) {
    const type = prismaCompanyType(user.companyType);
    const defaultMarket = await findDefaultMarketForCompanyType(type);
    company = await prisma.company.create({
      data: {
        name: user.companyName?.trim() || user.email,
        slug,
        type,
        email: (user.companyEmail || user.email).toLowerCase(),
        phone: user.phone,
        district: user.companyDistrict,
        address: user.companyAddress,
        location: user.companyLocation,
        logoFileName: user.companyLogoFileName,
        status: "ACTIVE",
        ...(defaultMarket?.id ? { marketId: defaultMarket.id } : {}),
      },
    });
  } else if (!company.marketId) {
    const defaultMarket = await findDefaultMarketForCompanyType(company.type);
    if (defaultMarket?.id) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { marketId: defaultMarket.id },
      });
    }
  }

  await prisma.user.update({
    where: { id: opts.userId },
    data: {
      role: opts.role,
      status: "APPROVED",
      accountStatus: "ACTIVE",
      companyId: company.id,
      companySlug: company.slug,
      ...(company.marketId ? { marketId: company.marketId } : {}),
      deletedAt: null,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission("CREATE_USER");
  if (auth.error) return auth.error;

  const { fields, form } = await readCreateUserRequest(request);
  const {
    email,
    fullName,
    password,
    confirmPassword,
    role,
  } = fields;

  if (!email || !fullName || password.length < 8) {
    return jsonError("email, fullName, and password (8+ chars) are required");
  }
  const emailErr = validateEmailField(email);
  if (emailErr) return jsonError(registerErrorMessage(emailErr, "en"));
  const phoneErr = phoneWriteError(fields.phone, true);
  if (phoneErr) return jsonError(phoneErr);
  if (password !== confirmPassword) {
    return jsonError("Passwords do not match");
  }

  const allowedRoles: Role[] = auth.user.role === "SUPER_ADMIN"
    ? CREATABLE_ROLES
    : auth.user.role === "LIVESTOCK_BROKER_USER"
      ? ["LIVESTOCK_BROKER_USER"]
      : ["COMPANY_ADMIN"];

  if (!allowedRoles.includes(role)) return jsonError("You cannot create that role", 403);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already in use", 409);

  const isBroker = role === "LIVESTOCK_BROKER_USER";
  const parsedCompanyId = fields.companyIdRaw ? Number(fields.companyIdRaw) : NaN;
  const parsedBrokerId = fields.brokerIdRaw ? Number(fields.brokerIdRaw) : NaN;
  const parsedMarketId = fields.marketIdRaw ? Number(fields.marketIdRaw) : NaN;
  const companyId = isBroker
    ? null
    : (auth.user.companyId ?? (Number.isFinite(parsedCompanyId) ? parsedCompanyId : null));
  const parentBrokerId =
    isBroker && auth.user.role !== "SUPER_ADMIN"
      ? (auth.user.brokerId ?? (Number.isFinite(parsedBrokerId) ? parsedBrokerId : null))
      : Number.isFinite(parsedBrokerId)
        ? parsedBrokerId
        : null;

  const phone = fields.phone || null;
  const companyName = fields.companyName || null;
  const livestockSection = fields.livestockSection || null;
  const companyType = isBroker ? livestockSection : fields.companyType || null;
  const companyDistrict = fields.companyDistrict || null;
  const companyEmail = fields.companyEmail || email;

  if (!companyName) {
    return jsonError("Company / market name is required");
  }
  if (!isBroker && !(COMPANY_REGISTRATION_TYPES as readonly string[]).includes(companyType || "")) {
    return jsonError("Select a company type");
  }
  if (isBroker && !(await areRegisteredLivestockTypeChoices(livestockSection || ""))) {
    return jsonError("Select one, two, or three livestock categories.");
  }
  const planId = Number(fields.planIdRaw);
  if (!Number.isFinite(planId) || planId <= 0) {
    return jsonError("Select a subscription plan");
  }
  // Utility companies must pick a Banadir district; brokers use market location instead.
  if (!isBroker && !companyDistrict) return jsonError("Select a Banadir district");

  let brokerMarket: { id: number; name: string; location: string | null } | null =
    null;
  if (isBroker) {
    if (!Number.isFinite(parsedMarketId) || parsedMarketId <= 0) {
      return jsonError("Please select a livestock market.");
    }
    brokerMarket = await findRegistrationLivestockMarket(parsedMarketId);
    if (!brokerMarket) {
      brokerMarket = await prisma.market.findFirst({
        where: {
          id: parsedMarketId,
          deletedAt: null,
          status: "ACTIVE",
          marketType: "LIVESTOCK",
        },
        select: { id: true, name: true, location: true },
      });
    }
    if (!brokerMarket) {
      return jsonError("Please select a livestock market.");
    }
  }

  const companyAddress = isBroker
    ? brokerMarket?.name || fields.companyAddress || livestockSection
    : fields.companyAddress || null;
  if (!isBroker && (!companyAddress || companyAddress.length < 5)) {
    return jsonError("Company address must be at least 5 characters");
  }

  const sectorKey: CompanyRegistrationSector | null = isBroker
    ? "livestock"
    : companyTypeToSector(companyType || "");
  if (!sectorKey) {
    return jsonError("Select a company type");
  }

  const companySector =
    sectorKey === "electricity"
      ? "Electricity"
      : sectorKey === "livestock"
        ? "Livestock"
        : "Water";
  const companyLocation = isBroker && brokerMarket
    ? `${brokerMarket.name}${
        brokerMarket.location ? `, ${brokerMarket.location}` : ""
      }, Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`
    : formatRegisteredCompanyLocation(companyDistrict || "", companyAddress || "");
  const contactRole = isBroker
    ? livestockSection || "Livestock Market Broker"
    : "Company Admin / Signatory";

  let companyLogoFileName: string | undefined;
  let registrationDocuments: string | undefined;
  let documentFileName: string | undefined;
  let profilePicture: string | undefined;

  try {
    if (!form) {
      if (!isBroker) {
        return jsonError(registerErrorMessage("companyLogoRequired", "en"));
      }
    } else {
      const uploaded = await saveCreateUserUploads(form, sectorKey, {
        logoRequired: !isBroker,
      });
      companyLogoFileName = uploaded.companyLogoFileName;
      registrationDocuments = uploaded.registrationDocuments;
      documentFileName = uploaded.documentFileName;
      profilePicture = uploaded.profilePicture;
    }
  } catch (error) {
    if (error instanceof RegistrationUploadError) {
      return jsonError(registerErrorMessage(error.code, "en"));
    }
    console.error("[api/users POST uploads]", error);
    return jsonError("Could not save uploaded files", 500);
  }

  {
    let docs: Record<string, unknown> = {};
    if (registrationDocuments) {
      try {
        const parsed = JSON.parse(registrationDocuments) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          docs = parsed as Record<string, unknown>;
        }
      } catch {
        docs = {};
      }
    }
    docs.plan_id = planId;
    registrationDocuments = JSON.stringify(docs);
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: await hashPassword(password),
        role,
        status: "APPROVED",
        accountStatus: "ACTIVE",
        phone,
        companyName,
        companyType,
        companySector,
        companyDistrict,
        companyAddress,
        companyEmail,
        companyLocation,
        companyCountry: REGISTRATION_COMPANY_COUNTRY,
        contactRole,
        companyId,
        brokerId: parentBrokerId,
        marketId: brokerMarket?.id ?? null,
        companyLogoFileName,
        documentFileName,
        ...(registrationDocuments ? { registrationDocuments } : {}),
        profilePicture,
      },
    });
  } catch (error) {
    console.error("[api/users POST]", error);
    return jsonError("Could not save user to the database", 500);
  }

  try {
    if (isBroker) {
      if (!parentBrokerId) {
        await promoteApprovedBroker({ userId: user.id, email: user.email });
      } else if (brokerMarket && livestockSection) {
        await assignBrokerFromRegistration({
          brokerId: parentBrokerId,
          marketId: brokerMarket.id,
          livestockSection,
        });
      }
    } else if (companyId) {
      const parent = await prisma.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: { id: true, slug: true, status: true },
      });
      if (parent && parent.status !== "ACTIVE") {
        await prisma.company.update({
          where: { id: parent.id },
          data: { status: "ACTIVE" },
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role,
          status: "APPROVED",
          accountStatus: "ACTIVE",
          companyId: parent?.id ?? companyId,
          ...(parent?.slug ? { companySlug: parent.slug } : {}),
          deletedAt: null,
        },
      });
    } else {
      await activateCreatedCompanyAccount({
        userId: user.id,
        email: user.email,
        role,
      });
    }
  } catch (error) {
    console.error("[api/users POST activate account]", error);
  }

  await createNotification({
    userId: user.id,
    title: "Account created",
    message: `Your ${formatRoleLabel(role)} account was created for ${email}.`,
    type: "USER_CREATED",
    sector: "account",
    senderId: auth.user.id,
  });

  return jsonOk({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("EDIT_USER");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  if (body?.restore === true) {
    if (auth.user.role !== "SUPER_ADMIN") {
      return jsonError("Only Super Admin can restore deleted users", 403);
    }
    const deleted = await prisma.user.findFirst({ where: { id } });
    if (!deleted) return jsonError("User not found", 404);
    if (!deleted.deletedAt) return jsonError("User is not deleted");
    const restored = await prisma.user.update({
      where: { id },
      data: { deletedAt: null, accountStatus: "ACTIVE" },
    });
    return jsonOk({
      ok: true,
      user: {
        id: restored.id,
        email: restored.email,
        accountStatus: restored.accountStatus,
        deletedAt: null,
      },
    });
  }

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) return jsonError("User not found", 404);

  const isSelf = auth.user.id === id;
  const sameScope =
    (auth.user.companyId && target.companyId === auth.user.companyId) ||
    (auth.user.brokerId && target.brokerId === auth.user.brokerId);
  if (auth.user.role !== "SUPER_ADMIN" && !isSelf && !sameScope) {
    return jsonError("Forbidden", 403);
  }

  let hashedResetPassword: string | undefined;
  if (body.resetPassword != null) {
    const nextPassword = String(body.resetPassword);
    const confirmPassword = String(body.confirmPassword ?? "");
    if (nextPassword.length < 8) {
      return jsonError("Password must be at least 8 characters");
    }
    if (nextPassword !== confirmPassword) {
      return jsonError("Passwords do not match");
    }
    hashedResetPassword = await hashPassword(nextPassword);
  }

  let nextAccountStatus: "ACTIVE" | "SUSPENDED" | undefined;
  if (body.accountStatus != null) {
    if (auth.user.role !== "SUPER_ADMIN") {
      return jsonError("Only Super Admin can suspend or activate accounts", 403);
    }
    const status = String(body.accountStatus).toUpperCase();
    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      return jsonError("accountStatus must be ACTIVE or SUSPENDED");
    }
    if (isSelf && status === "SUSPENDED") {
      return jsonError("You cannot suspend your own account");
    }
    nextAccountStatus = status;
  }

  // Promote approved applicant → company admin + public company (Companies page)
  if (body.activateCompany === true) {
    if (auth.user.role !== "SUPER_ADMIN") {
      return jsonError("Only Super Admin can activate company access", 403);
    }
    if (target.status !== "APPROVED") {
      return jsonError("User must be approved before company activation");
    }
    const { promoteApprovedCompany } = await import("@/lib/promote-company");
    const promoted = await promoteApprovedCompany({
      email: target.email,
      userId: target.id,
    });
    if (!promoted.slug) {
      return jsonError("Could not activate company for this user", 500);
    }
    return jsonOk({
      ok: true,
      user: {
        id: target.id,
        email: target.email,
        companySlug: promoted.slug,
        companyHref: promoted.href,
      },
    });
  }

  if (body.phone != null) {
    const phoneErr = phoneWriteError(String(body.phone), false);
    if (phoneErr) return jsonError(phoneErr);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(body.fullName != null ? { fullName: String(body.fullName).trim() } : {}),
      ...(body.phone != null ? { phone: String(body.phone).trim() } : {}),
      ...(body.role != null && auth.user.role === "SUPER_ADMIN" ? { role: body.role as Role } : {}),
      ...(body.status != null && auth.user.role === "SUPER_ADMIN"
        ? { status: body.status as never }
        : {}),
      ...(nextAccountStatus ? { accountStatus: nextAccountStatus } : {}),
      ...(hashedResetPassword ? { password: hashedResetPassword } : {}),
    },
  });

  // Users Suspend/Activate affects only this login account.
  // Company Inactive and Broker Suspend stay on Companies / Brokers pages.

  if (
    auth.user.role === "SUPER_ADMIN" &&
    body.status != null &&
    String(body.status).toUpperCase() === "APPROVED"
  ) {
    try {
      const { activateApprovedApplicant } = await import(
        "@/lib/activate-approved-applicant"
      );
      await activateApprovedApplicant({ userId: id, email: updated.email });
    } catch {
      // ignore promote failures
    }
  }

  return jsonOk({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      accountStatus: updated.accountStatus,
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("DELETE_USER");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");
  if (id === auth.user.id) return jsonError("You cannot delete your own account");

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, email: true, role: true, fullName: true },
  });
  if (!target) return jsonError("User not found", 404);

  if (isProtectedPlatformUser({ email: target.email, role: target.role })) {
    return jsonError("Platform / Super Admin accounts cannot be deleted", 400);
  }

  try {
    await hardDeleteUser(target.id);
  } catch (error) {
    console.error("[api/users DELETE]", error);
    return jsonError("Could not delete user from the database", 500);
  }

  return jsonOk({ ok: true, deleted: true, userId: target.id });
}
