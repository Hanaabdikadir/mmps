import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-guard";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return jsonError("currentPassword and newPassword are required");
  }
  if (newPassword.length < 8) {
    return jsonError("New password must be at least 8 characters");
  }

  const dbUser = await prisma.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: { id: true, password: true },
  });
  if (!dbUser) return jsonError("User not found", 404);

  const valid = await verifyPassword(currentPassword, dbUser.password);
  if (!valid) return jsonError("Current password is incorrect", 400);

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { password: hashed },
  });

  return jsonOk({ ok: true });
}
