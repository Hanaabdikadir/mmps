import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  allocateUniqueCompanySlug,
  getRegisteredCompanyByEmail,
  isCoreCompanyEmail,
  isExtraPublicCompany,
  isPlatformCompanyEmail,
  listRegisteredCompanies,
  removeRegisteredCompany,
  upsertRegisteredCompany,
  type RegisteredCompanySector,
} from "@/lib/registered-companies-store";
import { publicHrefForCompanySlug } from "@/lib/company-scope-server";
import { upsertCompanyProfileOverride } from "@/lib/company-profile-store";
import { ensureCompanyMarketsLinked } from "@/lib/company-default-market";
import {
  ensureAccountSubscription,
  registrationPaidAmount,
  registrationPayMonths,
  registrationPlanId,
} from "@/lib/subscriptions";
import { registrationDocumentUrl } from "@/lib/registration-document-url";

function mapSector(raw?: string | null): RegisteredCompanySector {
  const s = (raw || "").toLowerCase();
  if (s.includes("electric")) return "Electricity";
  if (s.includes("livestock") || s.includes("animal")) return "Livestock";
  return "Water";
}

function acronymFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 6).toUpperCase();
  return parts
    .slice(0, 4)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}

function logoUrlFromFileName(fileName?: string | null): string | undefined {
  const name = fileName?.trim();
  if (!name) return undefined;
  if (name.startsWith("/uploads/")) return name;
  if (name.startsWith("/api/secure-files/")) return name;
  if (name.startsWith("uploads/")) return `/${name}`;
  return registrationDocumentUrl(name);
}

function logoFromRegistrationDocs(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const docs = JSON.parse(raw) as Record<string, unknown>;
    for (const key of [
      "company_logo",
      "companyLogo",
      "logo",
      "business_logo",
    ]) {
      const v = docs[key];
      if (typeof v === "string" && v.trim()) return logoUrlFromFileName(v);
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** Publish registration / uploaded logo onto the home card + public profile. */
async function publishCompanyCardLogo(slug: string, logoUrl?: string | null) {
  const url = logoUrl?.trim();
  if (!slug || !url) return;
  await upsertCompanyProfileOverride(slug, { image: url });
}

async function ensureCompanySubscription(
  companyId: number,
  opts?: {
    planId?: number | null;
    accessDays?: number | null;
    paidMonths?: number | null;
    paidAmount?: number | null;
  }
) {
  return ensureAccountSubscription({ companyId, ...opts });
}

/**
 * On Super Admin approve: make the applicant a COMPANY_ADMIN with a unique
 * companySlug, and publish their public company page entry.
 */
export async function promoteApprovedCompany(opts: {
  email?: string | null;
  userId?: number | null;
}): Promise<{ slug: string | null; href: string | null }> {
  const email = opts.email?.trim().toLowerCase();
  if (!email || email === "—") {
    return { slug: null, href: null };
  }
  // Never publish platform / super-admin accounts as water or electricity cards
  if (isPlatformCompanyEmail(email)) {
    await removeRegisteredCompany({ email });
    return { slug: null, href: null };
  }

  const existingReg = await getRegisteredCompanyByEmail(email);
  let companyName = existingReg?.name || "";
  let sector: RegisteredCompanySector = existingReg?.sector || "Water";
  let phone = existingReg?.phone;
  let companyEmail = existingReg?.companyEmail;
  let address = existingReg?.address;
  let district = existingReg?.district;
  let location = existingReg?.location;
  let logoUrl = existingReg?.logoUrl;
  let acronym = existingReg?.acronym || "";

  const dbUser = await prisma.user.findFirst({
      where: opts.userId
        ? { OR: [{ id: opts.userId }, { email }] }
        : { email },
      select: {
        id: true,
        companyName: true,
        companySector: true,
        phone: true,
        companyEmail: true,
        companyAddress: true,
        companyDistrict: true,
        companyLocation: true,
        companyLogoFileName: true,
        registrationDocuments: true,
        companySlug: true,
        fullName: true,
      },
    });

    if (dbUser) {
      companyName =
        dbUser.companyName?.trim() ||
        companyName ||
        dbUser.fullName ||
        email.split("@")[0];
      sector = mapSector(dbUser.companySector);
      phone = dbUser.phone?.trim() || phone;
      companyEmail = dbUser.companyEmail?.trim() || companyEmail;
      address = dbUser.companyAddress?.trim() || address;
      district = dbUser.companyDistrict?.trim() || district;
      location =
        dbUser.companyLocation?.trim() ||
        dbUser.companyDistrict?.trim() ||
        location;
      logoUrl =
        logoUrlFromFileName(dbUser.companyLogoFileName) ||
        logoFromRegistrationDocs(dbUser.registrationDocuments) ||
        logoUrl;
      acronym = acronym || acronymFromName(companyName);

      const slug =
        dbUser.companySlug ||
        existingReg?.slug ||
        await allocateUniqueCompanySlug(companyName);

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          status: "APPROVED",
          role: "COMPANY_ADMIN",
          companySlug: slug,
        },
      });

      const record = await upsertRegisteredCompany({
        slug,
        email,
        name: companyName,
        acronym,
        sector,
        phone,
        companyEmail,
        address,
        district,
        location,
        logoUrl,
      });

      await publishCompanyCardLogo(record.slug, record.logoUrl);

      const companyRow = await prisma.company.findFirst({
        where: { slug: record.slug, deletedAt: null },
        select: { id: true },
      });
      if (companyRow?.id) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { companyId: companyRow.id },
        });
        try {
          const paidMonths = registrationPayMonths(dbUser.registrationDocuments);
          const paidAmount = registrationPaidAmount(dbUser.registrationDocuments);
          await ensureCompanySubscription(companyRow.id, {
            planId: registrationPlanId(dbUser.registrationDocuments),
            accessDays: paidMonths ? paidMonths * 30 : null,
            paidMonths,
            paidAmount,
          });
        } catch (err) {
          console.error("[promoteApprovedCompany] subscription failed", err);
        }
      }

      return {
        slug: record.slug,
        href: await publicHrefForCompanySlug(record.slug),
      };
  }
  return { slug: null, href: null };
}

/**
 * Heal: any APPROVED water/electricity company admin missing from the
 * public registry gets promoted so sector hub cards + dashboards work.
 * (New applicants appear on sector pages only — not the homepage.)
 * Also removes stale cards (deleted users, platform accounts).
 *
 * Cached briefly so public pages do not re-run PostgreSQL scans on every click.
 */
const ENSURE_TTL_MS = 60_000;
let lastEnsureAt = 0;
let ensureInFlight: Promise<void> | null = null;

export async function ensureApprovedCompaniesPublished(
  sector?: RegisteredCompanySector
): Promise<void> {
  const now = Date.now();
  if (now - lastEnsureAt < ENSURE_TTL_MS) return;
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = runEnsureApprovedCompaniesPublished(sector).finally(() => {
    ensureInFlight = null;
  });
  return ensureInFlight;
}

async function runEnsureApprovedCompaniesPublished(
  sector?: RegisteredCompanySector
): Promise<void> {
  const users = await withDbTimeout(
    prisma.user.findMany({
      where: { role: "COMPANY_ADMIN", status: "APPROVED", deletedAt: null },
      select: { email: true, id: true, companySlug: true, companySector: true },
    })
  );
  const activeEmails = new Set(users.map((user) => user.email.trim().toLowerCase()));

  for (const company of await listRegisteredCompanies(sector)) {
    if (isCoreCompanyEmail(company.email) || company.slug === "livestock-market") continue;
    if (
      isPlatformCompanyEmail(company.email) ||
      company.slug === "system-administrator" ||
      !isExtraPublicCompany(company) ||
      !activeEmails.has(company.email.toLowerCase())
    ) {
      await removeRegisteredCompany({ slug: company.slug, email: company.email });
    }
  }

  for (const user of users) {
    const mapped = mapSector(user.companySector);
    if (sector && mapped !== sector) continue;
    const email = user.email.trim().toLowerCase();
    if (!email || isPlatformCompanyEmail(email) || isCoreCompanyEmail(email)) continue;
    if (await getRegisteredCompanyByEmail(email)) continue;
    await promoteApprovedCompany({ email, userId: user.id });
  }

  await ensureCompanyMarketsLinked();
  lastEnsureAt = Date.now();
}
