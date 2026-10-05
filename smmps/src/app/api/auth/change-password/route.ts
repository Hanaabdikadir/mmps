import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const current = String(body?.currentPassword || "");
  const next = String(body?.newPassword || "");
  const confirm = String(body?.confirmPassword || "");

  if (!current || !next) return jsonError("Current and new password are required");
  if (next.length < 8) return jsonError("New password must be at least 8 characters");
  if (next !== confirm) return jsonError("Passwords do not match");
  if (next === current) {
    return jsonError("New password must be different from your current password");
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, password: true, email: true },
  });
  if (!user) return jsonError("User not found", 404);
  if (!user.password) {
    return jsonError("Account password cannot be updated", 400);
  }

  const ok = await verifyPassword(current, user.password);
  if (!ok) return jsonError("Current password is incorrect", 400);

  const hashed = await hashPassword(next);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return jsonOk({ ok: true, message: "Password updated successfully." });
}
