import type { AuthUser } from "@/lib/auth";
import {
  canManageCompany,
  isScopedCompanyAdmin,
  isSuperAdmin,
} from "@/lib/auth";
import { companySectorForSlug, resolveProviderSlug } from "@/lib/company-scope-server";

/**
 * Company admins may only create/update prices for their own company.
 * Super admins are unrestricted. Unscoped admins (legacy) remain allowed.
 * Server-only — do not import from Client Components.
 */
export async function assertCanWriteProvider(
  user: AuthUser,
  providerName: string,
  sector: "water" | "electricity" | "livestock"
): Promise<string | null> {
  if (isSuperAdmin(user)) return null;
  if (!isScopedCompanyAdmin(user)) return null;

  const ownSector = await companySectorForSlug(user.companySlug!);

  if (sector === "livestock") {
    if (ownSector === "livestock") return null;
    return "Company admins can only manage their own company sector.";
  }

  if (ownSector && ownSector !== sector) {
    return "Company admins can only manage their own company sector.";
  }

  const slug = await resolveProviderSlug(providerName, sector);
  if (!slug || !canManageCompany(user, slug)) {
    return "You can only view and edit prices for your own company.";
  }
  return null;
}
