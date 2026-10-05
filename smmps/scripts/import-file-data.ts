import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  type AccountStatus,
  type CompanyType,
  type NotificationType,
  type Role,
  type UserStatus,
} from "@prisma/client";

type JsonObject = Record<string, unknown>;
type Counts = Record<string, number>;

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const dataArg = process.argv.find((arg) => arg.startsWith("--data-dir="));
const dataDir = path.resolve(dataArg?.slice("--data-dir=".length) || ".data");
const rollback = Symbol("dry-run rollback");

const counts: Counts = {
  usersCreated: 0,
  usersExisting: 0,
  usersLinkedToCompanies: 0,
  companiesCreated: 0,
  companiesExisting: 0,
  companyProfilesMerged: 0,
  documentsCreated: 0,
  documentsExisting: 0,
  settingsCreated: 0,
  settingsExisting: 0,
  notificationsCreated: 0,
  notificationsExisting: 0,
  notificationsSkippedNoUser: 0,
  sessionsRevoked: 0,
  resetTokensInvalidated: 0,
  sourceRecordsSkipped: 0,
};

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizedEmail(value: unknown): string | undefined {
  const valueText = text(value)?.toLowerCase();
  return valueText && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valueText)
    ? valueText
    : undefined;
}

function date(value: unknown, fallback = new Date()): Date {
  const parsed = typeof value === "string" ? new Date(value) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `company-${crypto.randomUUID().slice(0, 8)}`
  );
}

function load(name: string): JsonObject | null {
  const file = path.join(dataDir, name);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  if (!object(parsed)) throw new Error(`${file} must contain a JSON object`);
  return parsed as JsonObject;
}

function arrayFrom(file: JsonObject | null, ...keys: string[]): JsonObject[] {
  if (!file) return [];
  for (const key of keys) {
    const value = file[key];
    if (Array.isArray(value)) return value.map(object).filter(Boolean) as JsonObject[];
  }
  return [];
}

function companyType(record: JsonObject): CompanyType {
  const value = `${text(record.sector) || ""} ${text(record.companySector) || ""} ${text(record.companyType) || ""}`.toLowerCase();
  if (value.includes("water")) return "WATER_SUPPLY";
  if (value.includes("electric")) return "ELECTRICITY";
  return "OTHER";
}

function role(record: JsonObject): Role {
  const raw = text(record.role)?.toUpperCase();
  if (raw === "ADMIN") return "SUPER_ADMIN";
  if (raw === "COMPANY_USER") return "COMPANY_ADMIN";
  if (raw === "LIVESTOCK_BROKER_ADMIN") return "LIVESTOCK_BROKER_USER";
  const valid: Role[] = [
    "PUBLIC",
    "REGISTERED",
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "LIVESTOCK_BROKER_USER",
  ];
  if (raw && valid.includes(raw as Role)) return raw as Role;
  return "REGISTERED";
}

function userStatus(record: JsonObject, pending: boolean): UserStatus {
  const raw = text(record.status)?.toUpperCase();
  return raw === "APPROVED" || raw === "REJECTED" || raw === "PENDING"
    ? raw
    : pending
      ? "PENDING"
      : "APPROVED";
}

function accountStatus(record: JsonObject): AccountStatus {
  const raw = text(record.accountStatus)?.toUpperCase();
  return raw === "ACTIVE" || raw === "SUSPENDED" || raw === "INACTIVE"
    ? raw
    : "ACTIVE";
}

function documents(record: JsonObject): Array<[string, string]> {
  const raw = record.registrationDocuments;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const values = object(parsed);
  if (!values) return [];
  return Object.entries(values).flatMap(([kind, value]) => {
    const fileName = text(value);
    return fileName ? [[kind, path.basename(fileName)]] : [];
  });
}

function mimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function fileSize(fileName: string): number {
  const candidates = [
    path.join(process.cwd(), "public", "uploads", "registrations", fileName),
    path.join(process.cwd(), "public", "uploads", "companies", fileName),
  ];
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  return file ? fs.statSync(file).size : 0;
}

function profileObject(value: unknown): JsonObject | null {
  const profile = object(value);
  if (!profile) return null;
  const safe = { ...profile };
  delete safe.password;
  delete safe.passwords;
  return safe;
}

async function uniqueSlug(tx: Prisma.TransactionClient, preferred: string): Promise<string> {
  const base = slugify(preferred);
  let candidate = base;
  let suffix = 2;
  while (await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base.slice(0, 43)}-${suffix++}`;
  }
  return candidate;
}

async function importCompanyAndUser(
  tx: Prisma.TransactionClient,
  record: JsonObject,
  pending: boolean,
  deletedIds: Set<string>,
  deletedEmails: Set<string>,
): Promise<void> {
  const email = normalizedEmail(record.email) || normalizedEmail(record.companyEmail);
  const name = text(record.name) || text(record.companyName);
  const sourceId = text(record.id);
  if (!email || !name || (sourceId && deletedIds.has(sourceId)) || deletedEmails.has(email)) {
    counts.sourceRecordsSkipped++;
    return;
  }

  const preferredSlug = text(record.slug) || text(record.companySlug) || sourceId || name;
  let company = await tx.company.findFirst({
    where: { OR: [{ slug: slugify(preferredSlug) }, { email }] },
  });
  if (company) {
    counts.companiesExisting++;
  } else {
    company = await tx.company.create({
      data: {
        name,
        slug: await uniqueSlug(tx, preferredSlug),
        type: companyType(record),
        email: normalizedEmail(record.companyEmail) || email,
        phone: text(record.phone),
        location: text(record.location) || text(record.companyLocation),
        district: text(record.companyDistrict) || text(record.district),
        address: text(record.companyAddress) || text(record.address),
        registrationNumber: text(record.companyRegistrationNumber),
        logoFileName: text(record.companyLogoFileName) || text(record.logoUrl) || text(record.image),
        status: accountStatus(record),
        createdAt: date(record.registeredOn || record.createdAt),
      },
    });
    counts.companiesCreated++;
  }

  const existingUser = await tx.user.findUnique({ where: { email } });
  let user = existingUser;
  if (existingUser) {
    counts.usersExisting++;
    if (existingUser.companyId === null) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          companyId: company.id,
          ...(existingUser.companySlug === null ? { companySlug: company.slug } : {}),
        },
      });
      counts.usersLinkedToCompanies++;
    }
  } else {
    // Legacy plaintext credentials are deliberately ignored. Imported accounts
    // are reset-only and receive an unknown random password hash.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("base64url"), 12);
    user = await tx.user.create({
      data: {
        fullName: text(record.fullName) || name,
        email,
        password: passwordHash,
        phone: text(record.phone),
        companyName: name,
        companySector: text(record.companySector) || text(record.sector),
        companyLocation: text(record.companyLocation) || text(record.location),
        companyType: text(record.companyType),
        companyEstablishedDate: text(record.companyEstablishedDate),
        companyCountry: text(record.companyCountry),
        companyDistrict: text(record.companyDistrict) || text(record.district),
        companyAddress: text(record.companyAddress) || text(record.address),
        companyLogoFileName: text(record.companyLogoFileName),
        companyRegistrationNumber: text(record.companyRegistrationNumber),
        companyEmail: normalizedEmail(record.companyEmail) || email,
        companySlug: company.slug,
        contactRole: text(record.contactRole),
        documentFileName: text(record.documentFileName),
        registrationDocuments:
          documents(record).length > 0
            ? JSON.stringify(Object.fromEntries(documents(record)))
            : undefined,
        role: role(record),
        status: userStatus(record, pending),
        accountStatus: accountStatus(record),
        companyId: company.id,
        createdAt: date(record.registeredOn || record.createdAt),
      },
    });
    counts.usersCreated++;
  }

  for (const [kind, fileName] of documents(record)) {
    const existing = await tx.companyDocument.findFirst({
      where: { companyId: company.id, fileName },
      select: { id: true },
    });
    if (existing) {
      counts.documentsExisting++;
      continue;
    }
    await tx.companyDocument.create({
      data: {
        companyId: company.id,
        fileName,
        originalName: fileName,
        mimeType: mimeType(fileName),
        sizeBytes: fileSize(fileName),
        uploadedById: user?.id,
        createdAt: date(record.registeredOn || record.createdAt),
      },
    });
    counts.documentsCreated++;
    void kind;
  }
}

async function importProfiles(
  tx: Prisma.TransactionClient,
  profilesFile: JsonObject | null,
): Promise<void> {
  const profiles = object(profilesFile?.profiles);
  if (!profiles) return;
  for (const [slug, rawProfile] of Object.entries(profiles)) {
    const incoming = profileObject(rawProfile);
    if (!incoming) {
      counts.sourceRecordsSkipped++;
      continue;
    }
    const company = await tx.company.findUnique({ where: { slug } });
    if (!company) {
      counts.sourceRecordsSkipped++;
      continue;
    }
    const existing = profileObject(company.profileData) || {};
    const merged = { ...incoming, ...existing };
    if (JSON.stringify(merged) === JSON.stringify(existing)) {
      counts.companiesExisting++;
      continue;
    }
    await tx.company.update({
      where: { id: company.id },
      data: { profileData: merged as Prisma.InputJsonObject },
    });
    counts.companyProfilesMerged++;
  }
}

async function importSettings(
  tx: Prisma.TransactionClient,
  settingsFile: JsonObject | null,
): Promise<void> {
  if (!settingsFile) return;
  for (const [key, rawValue] of Object.entries(settingsFile)) {
    if (["password", "passwords", "sessions", "resetTokens"].includes(key)) continue;
    const value = typeof rawValue === "string" ? rawValue.trim() : JSON.stringify(rawValue);
    if (!value) continue;
    const existing = await tx.systemSetting.findUnique({ where: { key } });
    if (existing) {
      counts.settingsExisting++;
      continue;
    }
    await tx.systemSetting.create({ data: { key, value } });
    counts.settingsCreated++;
  }
}

function notificationType(value: unknown): NotificationType {
  const raw = text(value)?.toUpperCase();
  const valid: NotificationType[] = [
    "PRICE_SUBMITTED",
    "PRICE_APPROVED",
    "PRICE_REJECTED",
    "SUBSCRIPTION_ACTIVATED",
    "SUBSCRIPTION_EXPIRING",
    "SUBSCRIPTION_EXPIRED",
    "USER_CREATED",
    "SYSTEM_ANNOUNCEMENT",
    "GENERAL",
  ];
  return raw && valid.includes(raw as NotificationType) ? (raw as NotificationType) : "GENERAL";
}

async function importNotifications(
  tx: Prisma.TransactionClient,
  notificationFile: JsonObject | null,
): Promise<void> {
  const items = arrayFrom(notificationFile, "items", "notifications");
  const admins = await tx.user.findMany({
    where: { role: "SUPER_ADMIN", deletedAt: null },
    select: { id: true },
  });
  for (const item of items) {
    const title = text(item.title);
    const message = text(item.message);
    if (!title || !message) {
      counts.sourceRecordsSkipped++;
      continue;
    }
    const explicitEmail = normalizedEmail(item.email) || normalizedEmail(item.userEmail);
    const recipients = explicitEmail
      ? await tx.user.findMany({ where: { email: explicitEmail }, select: { id: true } })
      : admins;
    if (recipients.length === 0) {
      counts.notificationsSkippedNoUser++;
      continue;
    }
    const createdAt = date(item.createdAt);
    for (const recipient of recipients) {
      const existing = await tx.notification.findFirst({
        where: { userId: recipient.id, title, message, createdAt },
        select: { id: true },
      });
      if (existing) {
        counts.notificationsExisting++;
        continue;
      }
      await tx.notification.create({
        data: {
          userId: recipient.id,
          title,
          message,
          type: notificationType(item.type),
          sector: text(item.sector) || "system",
          read: typeof item.read === "boolean" ? item.read : false,
          createdAt,
        },
      });
      counts.notificationsCreated++;
    }
  }
}

async function run(tx: Prisma.TransactionClient): Promise<void> {
  const pendingFile = load("pending-registrations.json");
  const registeredFile = load("registered-companies.json");
  const usersFile = load("users.json");
  const companiesFile = load("companies.json");
  const documentsFile = load("company-documents.json");
  const overridesFile = load("company-overrides.json");
  const deletedIds = new Set(
    (Array.isArray(overridesFile?.deletedIds) ? overridesFile.deletedIds : [])
      .filter((value): value is string => typeof value === "string"),
  );
  const deletedEmails = new Set(
    (Array.isArray(overridesFile?.deletedEmails) ? overridesFile.deletedEmails : [])
      .map(normalizedEmail)
      .filter(Boolean) as string[],
  );
  const statusOverrides = object(overridesFile?.statuses) ?? {};

  const pending = arrayFrom(pendingFile, "registrations", "users");
  for (const record of pending) {
    const sourceId = text(record.id);
    const overriddenStatus = sourceId ? text(statusOverrides[sourceId]) : undefined;
    await importCompanyAndUser(
      tx,
      overriddenStatus ? { ...record, status: overriddenStatus } : record,
      true,
      deletedIds,
      deletedEmails,
    );
  }

  const registered = [
    ...arrayFrom(registeredFile, "companies"),
    ...arrayFrom(companiesFile, "companies", "items"),
    ...arrayFrom(usersFile, "users", "items"),
  ];
  for (const record of registered) {
    await importCompanyAndUser(tx, record, false, deletedIds, deletedEmails);
  }

  // Standalone document exports are accepted when they include companySlug/companyEmail.
  for (const document of arrayFrom(documentsFile, "documents", "items")) {
    const fileName = text(document.fileName);
    const companySlug = text(document.companySlug);
    const companyEmail = normalizedEmail(document.companyEmail);
    if (!fileName || (!companySlug && !companyEmail)) {
      counts.sourceRecordsSkipped++;
      continue;
    }
    const company = await tx.company.findFirst({
      where: {
        OR: [
          ...(companySlug ? [{ slug: companySlug }] : []),
          ...(companyEmail ? [{ email: companyEmail }] : []),
        ],
      },
    });
    if (!company) {
      counts.sourceRecordsSkipped++;
      continue;
    }
    const existing = await tx.companyDocument.findFirst({
      where: { companyId: company.id, fileName: path.basename(fileName) },
    });
    if (existing) {
      counts.documentsExisting++;
      continue;
    }
    await tx.companyDocument.create({
      data: {
        companyId: company.id,
        fileName: path.basename(fileName),
        originalName: text(document.originalName) || path.basename(fileName),
        mimeType: text(document.mimeType) || mimeType(fileName),
        sizeBytes:
          typeof document.sizeBytes === "number" ? document.sizeBytes : fileSize(fileName),
        createdAt: date(document.createdAt),
      },
    });
    counts.documentsCreated++;
  }

  await importProfiles(tx, load("company-profiles.json"));
  await importSettings(tx, load("system-settings.json"));
  await importNotifications(tx, load("system-notifications.json"));

  const now = new Date();
  counts.sessionsRevoked = (
    await tx.adminSession.updateMany({
      where: { revokedAt: null },
      data: { revokedAt: now },
    })
  ).count;
  counts.resetTokensInvalidated = (
    await tx.passwordResetToken.updateMany({
      where: { usedAt: null },
      data: { usedAt: now },
    })
  ).count;

  if (!apply) throw rollback;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory does not exist: ${dataDir}`);
  }

  try {
    await prisma.$transaction(run, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 120_000,
      maxWait: 10_000,
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", dataDir, counts }, null, 2));
  if (!apply) console.log("Dry run rolled back. Re-run with --apply to commit.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
