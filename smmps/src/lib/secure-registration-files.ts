import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  isSuperAdmin,
  type AuthUser,
} from "@/lib/auth";
import {
  mimeForRegistrationFile,
  sanitizeRegistrationFileName,
} from "@/lib/registration-document-url";

export {
  mimeForRegistrationFile,
  registrationDocumentUrl,
  sanitizeRegistrationFileName,
} from "@/lib/registration-document-url";

/** Private on-disk root (not served by Next static files). */
export function privateRegistrationsDir() {
  return path.join(process.cwd(), "storage", "uploads", "registrations");
}

/** Legacy public folder — still read for older uploads. */
export function legacyPublicRegistrationsDir() {
  return path.join(process.cwd(), "public", "uploads", "registrations");
}

export async function writePrivateRegistrationFile(
  fileName: string,
  buffer: Buffer
): Promise<void> {
  const safe = sanitizeRegistrationFileName(fileName);
  if (!safe) throw new Error("Invalid file name");
  const dir = privateRegistrationsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), buffer);
}

export async function readRegistrationFileBuffer(
  fileName: string
): Promise<Buffer | null> {
  const safe = sanitizeRegistrationFileName(fileName);
  if (!safe) return null;

  const privatePath = path.join(privateRegistrationsDir(), safe);
  try {
    await access(privatePath);
    return await readFile(privatePath);
  } catch {
    /* try legacy */
  }

  const legacyPath = path.join(legacyPublicRegistrationsDir(), safe);
  try {
    await access(legacyPath);
    return await readFile(legacyPath);
  } catch {
    return null;
  }
}

function docsContainFile(docs: unknown, fileName: string): boolean {
  if (!docs || typeof docs !== "object") return false;
  return Object.values(docs as Record<string, unknown>).some((v) => {
    const s = String(v || "");
    return s === fileName || s.endsWith(`/${fileName}`) || s.endsWith(fileName);
  });
}

/** Who may view a registration/PII upload. */
export async function canViewRegistrationFile(
  user: AuthUser,
  fileName: string
): Promise<boolean> {
  const safe = sanitizeRegistrationFileName(fileName);
  if (!safe) return false;
  if (isSuperAdmin(user)) return true;

  const me = await prisma.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: {
      registrationDocuments: true,
      companyLogoFileName: true,
      profilePicture: true,
      documentFileName: true,
    },
  });
  if (!me) return false;

  if (docsContainFile(me.registrationDocuments, safe)) return true;
  if (me.companyLogoFileName === safe) return true;
  if (me.documentFileName === safe) return true;
  if (me.profilePicture === safe || me.profilePicture?.endsWith(`/${safe}`)) {
    return true;
  }

  return false;
}
