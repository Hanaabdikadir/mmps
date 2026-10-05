import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { isLivestockBroker } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac-db";

const MAX_BYTES = 5 * 1024 * 1024;

function publicPhotoUrl(fileName: string) {
  return `/uploads/profiles/${fileName}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!id) return jsonError("Invalid broker id");

  const canManage = await roleHasPermission(auth.user.role, "MANAGE_LIVESTOCK_BROKERS");
  if (!canManage) {
    if (!isLivestockBroker(auth.user) || auth.user.brokerId !== id) {
      return jsonError("Forbidden", 403);
    }
  }

  const broker = await prisma.livestockBroker.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!broker) return jsonError("Broker not found", 404);

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Photo file is required");
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Photo must be 5 MB or smaller");
  }

  const extFromName = path.extname(file.name).toLowerCase();
  const isImage =
    file.type.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName);
  if (!isImage) {
    return jsonError("Photo must be PNG, JPEG, WEBP, or GIF");
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

  const fileName = `broker-${id}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const image = publicPhotoUrl(fileName);

  await prisma.user.updateMany({
    where: { brokerId: id, deletedAt: null },
    data: { profilePicture: image },
  });

  if (auth.user.brokerId === id) {
    await prisma.user.updateMany({
      where: { id: auth.user.id, deletedAt: null },
      data: { profilePicture: image },
    });
  }

  return jsonOk({ image });
}
