import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;

function publicPhotoUrl(fileName: string) {
  if (fileName.startsWith("/")) return fileName;
  return `/uploads/profiles/${fileName}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Photo file is required" }, { status: 400 });
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

  const ext =
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName)
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
      OR: [
        { id: user.id, role: "SUPER_ADMIN" },
        { email: user.email, role: "SUPER_ADMIN" },
      ],
    },
    select: { id: true },
  });
  if (!dbUser) {
    return NextResponse.json(
      { error: "Super Admin account was not found in the database" },
      { status: 404 }
    );
  }

  const fileName = `sa-${dbUser.id}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const image = publicPhotoUrl(fileName);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { profilePicture: image },
  });

  return NextResponse.json({ ok: true, image });
}
