import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isApproved,
  isCompanyAdmin,
  isSuperAdmin,
} from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;

function publicPhotoUrl(fileName: string) {
  return `/uploads/profiles/${fileName}`;
}

export async function POST(request: Request) {
  const user = (await getCurrentUser("admin")) || (await getCurrentUser());
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in again to upload a photo" },
      { status: 401 }
    );
  }

  if (!isApproved(user)) {
    return NextResponse.json(
      { error: "Your account must be approved before uploading images" },
      { status: 403 }
    );
  }

  if (!isCompanyAdmin(user) && !isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only company admins can upload a personal photo" },
      { status: 403 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Photo file is required" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo must be 5 MB or smaller" },
      { status: 400 }
    );
  }

  const extFromName = path.extname(file.name).toLowerCase();
  const isImage =
    file.type.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName);
  if (!isImage) {
    return NextResponse.json(
      { error: "Photo must be PNG, JPEG, WEBP, or GIF" },
      { status: 400 }
    );
  }

  const ext = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName)
    ? extFromName === ".jpeg"
      ? ".jpg"
      : extFromName
    : file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
        ? ".webp"
        : file.type === "image/gif"
          ? ".gif"
          : ".jpg";

  const dbUser = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { id: user.id },
        { email: { equals: user.email, mode: "insensitive" } },
      ],
    },
    select: { id: true, registrationDocuments: true },
  });
  if (!dbUser) {
    return NextResponse.json(
      { error: "Company admin account was not found" },
      { status: 404 }
    );
  }

  const fileName = `ca-${dbUser.id}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const image = publicPhotoUrl(fileName);
  let docs: Record<string, unknown> = {};
  try {
    docs = dbUser.registrationDocuments
      ? (JSON.parse(dbUser.registrationDocuments) as Record<string, unknown>)
      : {};
  } catch {
    docs = {};
  }
  docs.personal_photo = image;

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      profilePicture: image,
      registrationDocuments: JSON.stringify(docs),
    },
  });

  return NextResponse.json({ ok: true, image });
}
