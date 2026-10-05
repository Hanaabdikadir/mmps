import type { AuthUser } from "@/lib/auth";
import { resolveCompanyAdminSlug } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  companySectorForSlug,
  providerMetaForSlug,
  publicHrefForCompanySlug,
} from "@/lib/company-scope-server";
import { getRegisteredCompanyBySlug } from "@/lib/registered-companies-store";
import { promoteApprovedCompany } from "@/lib/promote-company";
import { Suspense } from "react";
import { CompanyAdminDashboard } from "@/components/admin/CompanyAdminDashboard";

function personalPhotoFromRegistrationDocs(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  try {
    const docs = JSON.parse(raw) as Record<string, unknown>;
    const file = docs.personal_photo;
    return typeof file === "string" && file.trim() ? file.trim() : null;
  } catch {
    return null;
  }
}

export async function CompanyAdminHome({
  user,
  ownPriceCount = 0,
}: {
  user: AuthUser;
  ownPriceCount?: number;
}) {
  let slug = resolveCompanyAdminSlug(user);

  // Heal approved company admins who never got a public registry / slug
  if (!slug && user.email) {
    const promoted = await promoteApprovedCompany({ email: user.email });
    slug = promoted.slug;
  }

  if (!slug) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        Your company profile is not ready yet. Please contact the admin to
        finish approval.
      </div>
    );
  }

  const [sector, meta, registered, href] = await Promise.all([
    companySectorForSlug(slug),
    providerMetaForSlug(slug),
    getRegisteredCompanyBySlug(slug),
    publicHrefForCompanySlug(slug),
  ]);
  const companyName =
    meta && "name" in meta ? String(meta.name) : registered?.name || user.fullName;
  const acronym =
    (meta && "acronym" in meta && meta.acronym
      ? String(meta.acronym)
      : registered?.acronym) || companyName;
  const logoUrl =
    (meta && "image" in meta && meta.image ? String(meta.image) : null) ||
    registered?.logoUrl ||
    null;

  let personalPhotoFile: string | null =
    user.profilePicture?.trim() || null;
  try {
    const dbUser = await prisma.user.findFirst({
      where: user.id
        ? { id: user.id }
        : { email: { equals: user.email, mode: "insensitive" } },
      select: { profilePicture: true, registrationDocuments: true },
    });
    personalPhotoFile =
      dbUser?.profilePicture?.trim() ||
      personalPhotoFromRegistrationDocs(dbUser?.registrationDocuments);
  } catch {
    personalPhotoFile = user.profilePicture?.trim() || null;
  }

  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        </div>
      }
    >
      <CompanyAdminDashboard
        userId={user.id}
        fullName={user.fullName}
        email={user.email}
        slug={slug}
        companyName={companyName}
        acronym={acronym}
        sector={sector}
        href={href}
        ownPriceCount={ownPriceCount}
        logoUrl={logoUrl}
        personalPhotoFile={personalPhotoFile}
        userRole={user.role}
      />
    </Suspense>
  );
}
