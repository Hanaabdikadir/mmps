import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword, type AuthUser } from "@/lib/auth";
import { providerMetaForSlug, companySectorForSlug } from "@/lib/company-scope-server";

/**
 * Ensure the signed-in company admin exists in Prisma so price FKs work.
 * Creates/updates the user from session + provider meta when missing.
 */
export async function ensureDbCompanyAdmin(user: AuthUser): Promise<number> {
  try {
    const byId = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (byId) return byId.id;
  } catch {
    // ignore
  }

  const email = user.email.trim().toLowerCase();
  try {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  } catch {
    // ignore
  }

  const slug = user.companySlug;
  const meta = slug ? await providerMetaForSlug(slug) : null;
  const sector = slug ? await companySectorForSlug(slug) : null;
  const companyName =
    meta && "name" in meta ? String(meta.name) : user.fullName;
  const password = await hashPassword(`company-${email}-${Date.now()}`);

  try {
    const created = await prisma.user.create({
      data: {
        fullName: user.fullName,
        email,
        password,
        role: "COMPANY_ADMIN",
        status: "APPROVED",
        companyName,
        companySector:
          sector === "electricity"
            ? "Electricity"
            : sector === "livestock"
              ? "Livestock"
              : "Water",
        companySlug: slug ?? undefined,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    // Race: email may already exist
    const again = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (again) return again.id;
    throw new Error("Could not resolve company admin user for price write");
  }
}
