import path from "path";
import {
  REGISTER_MAX_FILE_BYTES,
  registerErrorMessage,
  type RegisterErrorCode,
} from "@/lib/register-validation";
import { writePrivateRegistrationFile } from "@/lib/secure-registration-files";

const DOC_ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const IMAGE_ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const DOC_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export class RegistrationUploadError extends Error {
  code: RegisterErrorCode;

  constructor(code: RegisterErrorCode) {
    super(registerErrorMessage(code, "en"));
    this.name = "RegistrationUploadError";
    this.code = code;
  }
}

function extension(name: string): string {
  return path.extname(name).toLowerCase();
}

function isAllowed(
  file: File,
  mimeSet: Set<string>,
  extSet: Set<string>
): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime && mimeSet.has(mime)) return true;
  return extSet.has(extension(file.name));
}

export async function saveRegistrationDocument(file: File): Promise<string> {
  if (file.size > REGISTER_MAX_FILE_BYTES) {
    throw new RegistrationUploadError("fileTooLarge");
  }
  if (!isAllowed(file, DOC_ALLOWED, DOC_EXT)) {
    throw new RegistrationUploadError("fileTypeDocument");
  }

  const extFromName = extension(file.name);
  const ext =
    extFromName && DOC_EXT.has(extFromName)
      ? extFromName
      : file.type === "application/pdf"
        ? ".pdf"
        : file.type === "image/png"
          ? ".png"
          : file.type === "image/webp"
            ? ".webp"
            : ".jpg";
  const safeBase =
    path
      .basename(file.name, extFromName)
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 80) || "document";
  const fileName = `${Date.now()}-${safeBase}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writePrivateRegistrationFile(fileName, buffer);

  return fileName;
}

export async function saveRegistrationCompanyLogo(file: File): Promise<string> {
  if (file.size > REGISTER_MAX_FILE_BYTES) {
    throw new RegistrationUploadError("fileTooLarge");
  }
  if (!isAllowed(file, IMAGE_ALLOWED, IMAGE_EXT)) {
    throw new RegistrationUploadError("fileTypeImage");
  }

  const extFromName = extension(file.name);
  const ext =
    extFromName && IMAGE_EXT.has(extFromName)
      ? extFromName
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg";
  const safeBase =
    path
      .basename(file.name, extFromName)
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 80) || "logo";
  const fileName = `${Date.now()}-${safeBase}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writePrivateRegistrationFile(fileName, buffer);

  return fileName;
}
