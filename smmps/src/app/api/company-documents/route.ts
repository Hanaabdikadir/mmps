import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission, isCompanyAdmin, isSuperAdmin } from "@/lib/auth";
import {
  ALLOWED_DOCUMENT_EXT,
  ALLOWED_DOCUMENT_MIME,
  MAX_DOCUMENT_BYTES,
} from "@/lib/smlpms-constants";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "companies");

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

async function assertCompanyAccess(user: Awaited<ReturnType<typeof requireAuth>>["user"], companyId: number) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (checkPermission(user, "MANAGE_COMPANIES")) return true;
  if (isCompanyAdmin(user) && user.companyId === companyId) return true;
  return false;
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const companyId = Number(searchParams.get("companyId") || auth.user.companyId);
  if (!companyId) return jsonError("companyId is required");

  if (!(await assertCompanyAccess(auth.user, companyId))) {
    return jsonError("Forbidden", 403);
  }

  const documents = await prisma.companyDocument.findMany({
    where: { companyId, deletedAt: null },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ documents });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (
    !checkPermission(auth.user, "MANAGE_COMPANY") &&
    !checkPermission(auth.user, "MANAGE_COMPANIES")
  ) {
    return jsonError("Forbidden", 403);
  }

  const form = await request.formData();
  const file = form.get("file");
  const companyId = Number(form.get("companyId") || auth.user.companyId);
  if (!companyId) return jsonError("companyId is required");
  if (!(await assertCompanyAccess(auth.user, companyId))) {
    return jsonError("Forbidden", 403);
  }
  if (!(file instanceof File)) return jsonError("file is required");
  if (file.size > MAX_DOCUMENT_BYTES) return jsonError("File too large (max 10MB)");

  const originalName = file.name || "document";
  const ext = extOf(originalName);
  const mime = file.type || "application/octet-stream";
  if (
    !ALLOWED_DOCUMENT_EXT.includes(ext as (typeof ALLOWED_DOCUMENT_EXT)[number]) &&
    !ALLOWED_DOCUMENT_MIME.includes(mime as (typeof ALLOWED_DOCUMENT_MIME)[number])
  ) {
    return jsonError("Unsupported file type. Use PDF, JPG, PNG, DOC, or DOCX.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const safeBase = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const fileName = `${companyId}-${Date.now()}-${safeBase}`;
  const abs = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buffer);

  const doc = await prisma.companyDocument.create({
    data: {
      companyId,
      fileName,
      originalName,
      mimeType: mime,
      sizeBytes: file.size,
      uploadedById: auth.user.id,
    },
  });

  return jsonOk({ document: doc }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const doc = await prisma.companyDocument.findFirst({
    where: { id, deletedAt: null },
  });
  if (!doc) return jsonError("Not found", 404);
  if (!(await assertCompanyAccess(auth.user, doc.companyId))) {
    return jsonError("Forbidden", 403);
  }

  await prisma.companyDocument.delete({ where: { id } });

  try {
    await unlink(path.join(UPLOAD_DIR, doc.fileName));
  } catch {
    // file may already be gone
  }

  return jsonOk({ ok: true });
}
