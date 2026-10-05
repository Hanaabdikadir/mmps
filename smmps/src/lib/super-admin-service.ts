import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import { MOGADISHU_WATER_PROVIDERS } from "@/lib/water-data";
import { MOGADISHU_ELECTRICITY_PROVIDERS } from "@/lib/electricity-data";
import {
  resolveProviderSlug,
  providerMetaForSlug,
} from "@/lib/company-scope";
import { sectorToCompanyType } from "@/lib/company-registration";
import { BANADIR_DISTRICTS } from "@/lib/banadir-districts";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { registrationDocumentUrl } from "@/lib/registration-document-url";
import {
  countUnreadNotifications,
  listSystemNotifications,
} from "@/lib/system-notifications-store";
import {
  SUPER_ADMIN_COMPANY_ORDER,
  companySystemOrderIndex,
  compareByCompanySystemOrder,
} from "@/lib/company-system-order";
import { realEmail, realPhone } from "@/lib/contact-display";

export {
  SUPER_ADMIN_COMPANY_ORDER,
  companySystemOrderIndex,
  compareByCompanySystemOrder,
};

/* ------------------------------------------------------------------ */
/* Companies (derived from registered provider metadata)               */
/* ------------------------------------------------------------------ */

export type CompanySector = "Water" | "Electricity" | "Livestock";
export type CompanyStatus = "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED";
export type CompanyVerification = "VERIFIED" | "UNDER_REVIEW" | "NOT_VERIFIED";

export interface CompanyRecord {
  id: string;
  name: string;
  acronym: string;
  sector: CompanySector;
  location: string;
  region: string;
  phone: string;
  email: string;
  website: string;
  registeredOn: string; // ISO date
  status: CompanyStatus;
  verification: CompanyVerification;
  href: string;
  /** Display code e.g. CMP-0001-2026 */
  companyCode: string;
  /** Company logo image (public path) */
  image?: string;
  /** Canonical provider slug when known (bawadco, beco, …) */
  companySlug?: string;
  /** Real registration profile fields (from register form / DB) */
  fullName?: string;
  companyType?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyDistrict?: string;
  companyEstablishedDate?: string;
  companyCountry?: string;
  contactRole?: string;
  /** docId → stored filename under /uploads/registrations */
  registrationDocuments?: Record<string, string>;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  rejectedByName?: string | null;
}

const COMPANY_REGISTRATION_DATES: Record<string, string> = {
  "livestock-market": "2026-06-01T15:52:00",
  bawadco: "2026-07-15T13:52:00",
  wabax: "2026-07-14T10:52:00",
  "banadir-water": "2026-07-12T06:52:00",
  beco: "2026-07-10T13:52:00",
  "mogadishu-power-supply": "2026-07-08T09:52:00",
  "blue-sky-energy": "2026-07-05T14:52:00",
};

/** Livestock serves every Banadir district — best single-cell label for both lists. */
export const LIVESTOCK_BANADIR_DISTRICT_LABEL = "All Banadir districts";

const COMPANY_CODES: Record<string, string> = {
  bawadco: "CMP-0001-2025",
  wabax: "CMP-0002-2025",
  "banadir-water": "CMP-0003-2026",
  beco: "CMP-0004-2025",
  "mogadishu-power-supply": "CMP-0005-2025",
  "blue-sky-energy": "CMP-0006-2026",
  "livestock-market": "CMP-0007-2026",
};

function regionFromAddress(address: string): string {
  const a = address.toLowerCase();
  if (a.includes("banadir") || a.includes("mogadishu")) return "Banadir";
  if (a.includes("hiraan") || a.includes("beledweyne")) return "Hiraan";
  if (a.includes("bari") || a.includes("bosaso")) return "Bari";
  return "Banadir";
}

function companyCodeFor(id: string, registeredOn: string): string {
  if (COMPANY_CODES[id]) return COMPANY_CODES[id];
  const year = registeredOn.slice(0, 4) || "2026";
  const n = Math.abs(
    [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  )
    .toString()
    .padStart(4, "0")
    .slice(-4);
  return `CMP-${n}-${year}`;
}

function extractDistrictFromText(...parts: Array<string | undefined | null>): string | undefined {
  const hay = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/-/g, " ");
  if (!hay.trim()) return undefined;
  const hit = BANADIR_DISTRICTS.find((d) => {
    const key = d.toLowerCase().replace(/-/g, " ");
    return hay.includes(key);
  });
  if (hit) return hit;
  if (hay.includes("afgooye") || hay.includes("afgoye")) return "Daynile";
  return undefined;
}

function foundedYearFromMeta(meta: {
  infoPoints?: string[];
  infoBrief?: string;
  description?: string;
  tagline?: string;
  slug?: string;
  id?: string;
}): string | undefined {
  const blobs = [
    ...(meta.infoPoints ?? []),
    meta.infoBrief,
    meta.description,
    meta.tagline,
  ].filter(Boolean) as string[];

  for (const text of blobs) {
    const full = text.match(
      /Founded:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
    );
    if (full?.[1]) {
      const parsed = Date.parse(full[1]);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString().slice(0, 10);
      }
    }
    const yearOnly = text.match(/Founded:\s*(\d{4})/i);
    if (yearOnly?.[1]) return `${yearOnly[1]}-01-01`;

    const established = text.match(
      /established(?:\s+in)?\s+(?:Mogadishu\s+in\s+)?(\d{4})/i
    );
    if (established?.[1]) return `${established[1]}-01-01`;

    const foundedIn = text.match(/founded\s+in\s+(\d{4})/i);
    if (foundedIn?.[1]) return `${foundedIn[1]}-01-01`;

    const since = text.match(/since\s+(\d{4})/i);
    if (since?.[1]) return `${since[1]}-01-01`;
  }

  const slug = meta.slug || meta.id;
  if (slug && KNOWN_ESTABLISHED_BY_SLUG[slug]) {
    return KNOWN_ESTABLISHED_BY_SLUG[slug];
  }
  return undefined;
}

/** Home-page founded dates for providers (YYYY-MM-DD). */
const KNOWN_ESTABLISHED_BY_SLUG: Record<string, string> = {
  bawadco: "2013-01-01",
  wabax: "2016-01-01",
  "banadir-water": "2012-01-01",
  beco: "2014-01-01",
  "mogadishu-power-supply": "1994-01-01",
  "blue-sky-energy": "2015-07-30",
};

export function getRegisteredCompanies(): CompanyRecord[] {
  const water: CompanyRecord[] = MOGADISHU_WATER_PROVIDERS.map((p) => {
    const registeredOn = COMPANY_REGISTRATION_DATES[p.id] ?? "2026-01-01";
    const district = extractDistrictFromText(p.address, (p as { location?: string }).location);
    return {
      id: p.id,
      name: p.name,
      acronym: p.acronym ?? p.cardTitle,
      sector: "Water" as const,
      location: p.address,
      region: regionFromAddress(p.address),
      phone: p.phone ?? "—",
      email: p.email ?? "—",
      website: p.website ?? "—",
      registeredOn,
      status: "APPROVED" as const,
      verification: "VERIFIED" as const,
      href: p.href,
      companyCode: companyCodeFor(p.id, registeredOn),
      image: p.image,
      companyAddress: p.address,
      companyDistrict: district,
      companyEmail: p.email,
      companyType: sectorToCompanyType("water"),
      companyEstablishedDate: foundedYearFromMeta(p),
      companyCountry: "Somalia",
    };
  });

  const electricity: CompanyRecord[] = MOGADISHU_ELECTRICITY_PROVIDERS.map(
    (p) => {
      const registeredOn = COMPANY_REGISTRATION_DATES[p.id] ?? "2026-01-01";
      const district = extractDistrictFromText(p.address);
      return {
        id: p.id,
        name: p.name,
        acronym: p.acronym ?? p.cardTitle,
        sector: "Electricity" as const,
        location: p.address,
        region: regionFromAddress(p.address),
        phone: p.phone ?? "—",
        email: p.email ?? "—",
        website: p.website ?? "—",
        registeredOn,
        status: "APPROVED" as const,
        verification: "VERIFIED" as const,
        href: p.href,
        companyCode: companyCodeFor(p.id, registeredOn),
        image: p.image,
        companyAddress: p.address,
        companyDistrict: district,
        companyEmail: p.email,
        companyType: sectorToCompanyType("electricity"),
        companyEstablishedDate: foundedYearFromMeta(p),
        companyCountry: "Somalia",
      };
    }
  );

  return [...water, ...electricity].sort((a, b) =>
    a.registeredOn.localeCompare(b.registeredOn)
  );
}

/** Livestock market entity — public users are associated with this market */
export const LIVESTOCK_MARKET_COMPANY: CompanyRecord = {
  id: "livestock-market",
  name: "Mogadishu Livestock Market",
  acronym: "LIVESTOCK CO",
  sector: "Livestock",
  location: "Mogadishu Livestock Market, Banadir Region, Mogadishu",
  region: "Banadir",
  phone: "—",
  email: "livestock@mmps.so",
  website: "—",
  registeredOn: COMPANY_REGISTRATION_DATES["livestock-market"],
  status: "APPROVED",
  verification: "VERIFIED",
  href: "/livestock",
  companyCode: "CMP-0007-2026",
  image: LIVESTOCK_MARKET_LOGO,
  fullName: "Ahmed Nur Ali",
  companyType: "Livestock Market",
  companyEmail: "livestock@mmps.so",
  companyAddress: "Mogadishu Livestock Market, Banadir Region, Mogadishu",
  companyDistrict: LIVESTOCK_BANADIR_DISTRICT_LABEL,
  companyCountry: "Somalia",
  contactRole: "Managing Director",
};

/** Persist remove so deleted applicants stay gone after refresh (down to 0). */
export async function deleteManagedCompany(
  id: string,
  email?: string,
  snapshot?: {
    name?: string;
    acronym?: string;
    phone?: string;
    sector?: string;
    companyType?: string;
  }
): Promise<boolean> {
  const { hardDeleteCompany, hardDeleteUser, isProtectedPlatformUser } =
    await import("@/lib/delete-user");
  const normalizedEmail = email?.trim().toLowerCase();
  const numericId = Number(id);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(Number.isInteger(numericId) ? [{ id: numericId }] : []),
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        { companySlug: id },
      ],
    },
    select: { id: true, email: true, role: true },
  });
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: { id: true },
  });
  for (const user of users) {
    if (isProtectedPlatformUser({ email: user.email, role: user.role })) continue;
    await hardDeleteUser(user.id);
  }
  for (const company of companies) {
    await hardDeleteCompany(company.id);
  }
  return users.length + companies.length > 0;
}

/** Deleted registration requests history for Super Admin. */
export async function getDeletedRegistrationRequests() {
  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null }, companyName: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return users.map((user) => ({
    id: String(user.id),
    name: user.companyName || user.fullName,
    acronym: acronymFromName(user.companyName || user.fullName),
    email: user.email,
    phone: user.phone || "—",
    sector: sectorFromUserField(user.companySector),
    companyType: user.companyType || undefined,
    deletedAt: user.deletedAt!.toISOString(),
  }));
}

/** Read company access status (including Active / Not Active overrides). */
export async function getCompanyAccessStatus(
  companyIdOrSlug: string
): Promise<CompanyStatus | null> {
  if (!companyIdOrSlug?.trim()) return null;
  const key = companyIdOrSlug.trim();
  const numericId = Number(key);
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(Number.isInteger(numericId) ? [{ id: numericId }] : []),
        { companySlug: key },
      ],
    },
    select: { status: true, accountStatus: true },
  });
  if (user) {
    return user.accountStatus === "SUSPENDED" ? "SUSPENDED" : user.status;
  }
  const company = await prisma.company.findFirst({
    where: { slug: key, deletedAt: null },
    select: { status: true },
  });
  return company?.status === "SUSPENDED"
    ? "SUSPENDED"
    : company
      ? "APPROVED"
      : null;
}

/** Persist approve / reject / suspend status across refresh. */
export async function setManagedCompanyStatus(
  id: string,
  status: CompanyStatus
): Promise<CompanyRecord | null> {
  const numericId = Number(id);
  const userStatus = status === "SUSPENDED" ? "APPROVED" : status;
  const accountStatus = status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await prisma.$transaction([
    prisma.user.updateMany({
      where: {
        deletedAt: null,
        OR: [
          ...(Number.isInteger(numericId) ? [{ id: numericId }] : []),
          { companySlug: id },
        ],
      },
      data: { status: userStatus, accountStatus },
    }),
    prisma.company.updateMany({
      where: { slug: id, deletedAt: null },
      data: { status: accountStatus },
    }),
  ]);
  const companies = await getManagedCompaniesAsync();
  return companies.find((company) => company.id === id || company.href.endsWith(`/${id}`)) ?? null;
}

function sectorFromUserField(value?: string | null): CompanySector {
  switch ((value ?? "").toLowerCase()) {
    case "livestock":
    case "Livestock":
      return "Livestock";
    case "electricity":
    case "Electricity":
      return "Electricity";
    default:
      return "Water";
  }
}

function parseRegistrationDocuments(
  raw?: string | null
): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

function resolveCompanySlug(
  company: CompanyRecord,
  slugHint?: string | null
): string | null {
  if (slugHint?.trim()) return slugHint.trim();
  if (company.id === "livestock-market") return "livestock-market";
  if (providerMetaForSlug(company.id)) return company.id;
  const pendingBase = company.id.replace(/-pending$/, "");
  if (pendingBase !== company.id && providerMetaForSlug(pendingBase)) {
    return pendingBase;
  }
  if (
    company.sector === "Livestock" ||
    company.href === "/livestock" ||
    /livestock/i.test(company.name)
  ) {
    return "livestock-market";
  }
  const sector =
    company.sector === "Electricity"
      ? "electricity"
      : company.sector === "Water"
        ? "water"
        : null;
  if (sector) {
    const byName = resolveProviderSlug(company.name, sector);
    if (byName) return byName;
  }
  const hrefSlug = company.href?.split("/").filter(Boolean).pop();
  if (hrefSlug && providerMetaForSlug(hrefSlug)) return hrefSlug;
  return null;
}

/** Fill company fields from the public home / provider page catalog. */
export function enrichCompanyWithProvider(
  company: CompanyRecord,
  slugHint?: string | null
): CompanyRecord {
  const slug = resolveCompanySlug(company, slugHint);
  const meta = slug ? providerMetaForSlug(slug) : null;
  if (!meta) {
    const districtOnly =
      company.companyDistrict ||
      extractDistrictFromText(company.location, company.companyAddress);
    const established =
      company.companyEstablishedDate ||
      (slug ? KNOWN_ESTABLISHED_BY_SLUG[slug] : undefined);
    const registeredOn =
      (slug && COMPANY_REGISTRATION_DATES[slug]) || company.registeredOn;
    return {
      ...company,
      registeredOn,
      ...(slug === "livestock-market"
        ? { companyDistrict: LIVESTOCK_BANADIR_DISTRICT_LABEL }
        : districtOnly && !company.companyDistrict
          ? { companyDistrict: districtOnly }
          : {}),
      ...(established && !company.companyEstablishedDate
        ? { companyEstablishedDate: established }
        : {}),
    };
  }

  const address = meta.address || company.companyAddress || company.location;
  const district =
    extractDistrictFromText(address, meta.address, company.location) ||
    company.companyDistrict ||
    undefined;
  const sectorKey =
    company.sector === "Electricity"
      ? "electricity"
      : company.sector === "Livestock"
        ? "livestock"
        : "water";
  const established =
    foundedYearFromMeta(meta) ||
    (slug ? KNOWN_ESTABLISHED_BY_SLUG[slug] : undefined) ||
    company.companyEstablishedDate ||
    (company.registeredOn ? `${company.registeredOn.slice(0, 4)}-01-01` : undefined) ||
    "2010-01-01";
  const registeredOn =
    (slug && COMPANY_REGISTRATION_DATES[slug]) || company.registeredOn;

  // Prefer home-page meta when slug resolves (overrides stale demo/DB company email)
  return {
    ...company,
    // Keep company.email as system login email — do not replace with home email
    name: meta.name,
    acronym: meta.acronym || company.acronym,
    image: meta.image || company.image,
    phone: realPhone(company.phone, meta.phone),
    website: meta.website || company.website,
    href: meta.href || company.href,
    location: address,
    companyAddress: address,
    companyDistrict: district,
    registeredOn,
    // Company tab email = home / public company email (always prefer catalog)
    companyEmail: meta.email || company.companyEmail,
    companyType: sectorToCompanyType(sectorKey),
    companyEstablishedDate: established,
    companyCountry: company.companyCountry || "Somalia",
  };
}

function publicUploadPath(fileName: string | null | undefined): string | undefined {
  if (!fileName?.trim()) return undefined;
  const f = fileName.trim();
  if (f.startsWith("http://") || f.startsWith("https://") || f.startsWith("/")) {
    return f;
  }
  if (f.startsWith("uploads/")) return `/${f}`;
  // Company admin logos after approval often live under /uploads/companies
  if (f.includes("companies/")) return f.startsWith("/") ? f : `/${f}`;
  return registrationDocumentUrl(f);
}

function resolveCompanyLogoPath(opts: {
  logoFileName?: string | null;
  profileLogoUrl?: string | null;
  slug?: string | null;
  sector: CompanySector;
}): string | undefined {
  const fromUpload = publicUploadPath(opts.logoFileName);
  if (fromUpload) return fromUpload;
  // Only keep a profile logo URL when it is a real upload path — never stock art.
  const profile = opts.profileLogoUrl?.trim();
  if (
    profile &&
    (profile.startsWith("/uploads/") ||
      profile.startsWith("uploads/") ||
      profile.startsWith("http://") ||
      profile.startsWith("https://"))
  ) {
    // Reject known decorative livestock collage if somehow stored as profile URL.
    if (!profile.includes("/images/livestock/")) return profile;
  }
  if (opts.slug) {
    const meta = providerMetaForSlug(opts.slug);
    if (meta?.image?.trim()) return meta.image.trim();
  }
  // Do NOT invent a company logo for livestock applicants — that made Approvals
  // show "Uploaded" for people who never uploaded a logo.
  return undefined;
}

function companyFromDbUser(user: {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  companySector: string | null;
  companyLocation: string | null;
  companyDistrict: string | null;
  companyLogoFileName: string | null;
  companyRegistrationNumber: string | null;
  companyType: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  companyEstablishedDate: string | null;
  companyCountry: string | null;
  contactRole: string | null;
  registrationDocuments: string | null;
  companySlug: string | null;
  status: CompanyStatus | "PENDING" | "APPROVED" | "REJECTED";
  accountStatus?: "ACTIVE" | "SUSPENDED" | "INACTIVE" | string | null;
  createdAt: Date;
  profileLogoUrl?: string | null;
}): CompanyRecord {
  const sector = sectorFromUserField(user.companySector);
  const registeredOn = user.createdAt.toISOString();
  const id = String(user.id);

  // Prefer canonical slug from DB only. Do not invent "livestock-market" or
  // match catalog providers by name for pending applicants — that stamped
  // seed logos / emails / company codes onto new registrations.
  let slug = user.companySlug?.trim() || null;
  if (!slug && user.status === "APPROVED") {
    slug =
      resolveProviderSlug(user.companyName || "", "water") ||
      resolveProviderSlug(user.companyName || "", "electricity") ||
      null;
  }

  const meta = slug ? providerMetaForSlug(slug) : null;
  const name =
    user.companyName?.trim() ||
    (meta && "name" in meta ? String(meta.name) : "") ||
    user.fullName;
  const acronym =
    (meta && "acronym" in meta && meta.acronym
      ? String(meta.acronym)
      : "") ||
    (meta && "cardTitle" in meta && meta.cardTitle
      ? String(meta.cardTitle)
      : "") ||
    acronymFromName(name);

  const location =
    [user.companyDistrict, user.companyAddress || user.companyLocation]
      .filter(Boolean)
      .join(", ") ||
    (meta && "address" in meta && meta.address ? String(meta.address) : "") ||
    "Mogadishu, Somalia";

  const status: CompanyStatus =
    user.accountStatus === "SUSPENDED"
      ? "SUSPENDED"
      : user.status === "APPROVED"
        ? "APPROVED"
        : user.status === "REJECTED"
          ? "REJECTED"
          : "PENDING";

  const district =
    user.companyDistrict?.trim() ||
    extractDistrictFromText(
      user.companyAddress,
      user.companyLocation,
      meta && "address" in meta ? String(meta.address) : undefined
    ) ||
    (sector === "Livestock" ? LIVESTOCK_BANADIR_DISTRICT_LABEL : undefined);

  const image = resolveCompanyLogoPath({
    logoFileName: user.companyLogoFileName,
    profileLogoUrl: user.profileLogoUrl,
    slug,
    sector,
  });

  const href =
    meta && "href" in meta && meta.href
      ? String(meta.href)
      : sector === "Livestock"
        ? "/livestock"
        : sector === "Electricity"
          ? "/electricity"
          : "/water";

  return {
    id,
    name,
    acronym,
    sector,
    location,
    region: regionFromAddress(location),
    phone: realPhone(
      user.phone,
      meta && "phone" in meta ? String(meta.phone ?? "") : undefined
    ),
    email: user.email,
    website:
      (meta && "website" in meta && meta.website ? String(meta.website) : "") ||
      "—",
    registeredOn,
    status,
    verification:
      status === "APPROVED"
        ? "VERIFIED"
        : status === "PENDING"
          ? "UNDER_REVIEW"
          : "NOT_VERIFIED",
    href,
    companyCode:
      user.companyRegistrationNumber?.trim() ||
      (slug ? companyCodeFor(slug, registeredOn.slice(0, 10)) : companyCodeFor(id, registeredOn.slice(0, 10))),
    image,
    companySlug: slug || undefined,
    fullName: user.fullName,
    companyType: user.companyType?.trim() || undefined,
    companyEmail:
      user.companyEmail?.trim().toLowerCase() ||
      (meta && "email" in meta && meta.email
        ? String(meta.email).toLowerCase()
        : undefined),
    companyAddress:
      user.companyAddress?.trim() ||
      (meta && "address" in meta && meta.address
        ? String(meta.address)
        : undefined),
    companyDistrict: district,
    companyEstablishedDate:
      user.companyEstablishedDate?.trim() ||
      (slug ? KNOWN_ESTABLISHED_BY_SLUG[slug] : undefined),
    companyCountry: user.companyCountry?.trim() || "Somalia",
    contactRole: user.contactRole?.trim() || undefined,
    registrationDocuments: parseRegistrationDocuments(user.registrationDocuments),
  };
}

function acronymFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0]!.slice(0, 6).toUpperCase();
  return parts
    .slice(0, 3)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const managedUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  companyName: true,
  companySector: true,
  companyLocation: true,
  companyDistrict: true,
  companyLogoFileName: true,
  companyRegistrationNumber: true,
  companyType: true,
  companyEmail: true,
  companyAddress: true,
  companyEstablishedDate: true,
  companyCountry: true,
  contactRole: true,
  registrationDocuments: true,
  companySlug: true,
  status: true,
  accountStatus: true,
  role: true,
  createdAt: true,
} as const;

async function mapDbUsersToCompanies(
  users: Array<Parameters<typeof companyFromDbUser>[0] & { companySlug: string | null }>
): Promise<CompanyRecord[]> {
  const { getCompanyProfileOverride } = await import(
    "@/lib/company-profile-store"
  );
  const { registrationMarketIds } = await import("@/lib/subscriptions");

  const enriched = await Promise.all(
    users.map(async (u) => {
      const slug = u.companySlug?.trim() || null;
      let profileLogoUrl: string | null = null;
      if (slug) {
        try {
          const profile = await getCompanyProfileOverride(slug);
          profileLogoUrl =
            (typeof profile?.image === "string" ? profile.image.trim() : "") ||
            null;
        } catch {
          profileLogoUrl = null;
        }
      }
      const record = companyFromDbUser({ ...u, profileLogoUrl });

      // Show every market the broker selected (not only marketId / first name).
      const docs = record.registrationDocuments ?? {};
      const named = docs.market_names?.trim();
      if (named) {
        record.companyAddress = named;
      } else {
        const ids = registrationMarketIds(u.registrationDocuments);
        if (ids.length > 1) {
          try {
            const markets = await prisma.market.findMany({
              where: { id: { in: ids }, deletedAt: null },
              select: { id: true, name: true },
            });
            const byId = new Map(markets.map((m) => [m.id, m.name]));
            const labels = ids
              .map((id) => byId.get(id)?.trim())
              .filter(Boolean) as string[];
            if (labels.length) {
              record.companyAddress = labels.join(", ");
              record.registrationDocuments = {
                ...docs,
                market_names: labels.join(", "),
              };
            }
          } catch {
            /* keep single address */
          }
        }
      }

      return record;
    })
  );

  return enriched.sort((a, b) => b.registeredOn.localeCompare(a.registeredOn));
}

function applicantWhere(status?: "PENDING" | "APPROVED" | "REJECTED") {
  return {
    deletedAt: null,
    role: { not: "SUPER_ADMIN" as const },
    ...(status ? { status } : {}),
    OR: [
      { companyName: { not: null } },
      { role: "REGISTERED" as const },
      { role: "COMPANY_ADMIN" as const },
      { role: "LIVESTOCK_BROKER_USER" as const },
    ],
  };
}

export type RegistrationApprovalStats = {
  registered: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
};

/** Live KPI totals for Pending Approvals — PostgreSQL user registrations. */
export async function getRegistrationApprovalStats(): Promise<RegistrationApprovalStats> {
  try {
    const [pending, approved, rejected, deleted] = await withDbTimeout(
      Promise.all([
        prisma.user.count({
          where: applicantWhere("PENDING"),
        }),
        prisma.user.count({
          where: applicantWhere("APPROVED"),
        }),
        prisma.user.count({
          where: applicantWhere("REJECTED"),
        }),
        prisma.user.count({
          where: { deletedAt: { not: null }, companyName: { not: null } },
        }),
      ]),
      8000
    );
    return {
      pending,
      approved,
      rejected,
      deleted,
      registered: pending + approved + rejected,
    };
  } catch (error) {
    console.error("[getRegistrationApprovalStats]", error);
    return { registered: 0, pending: 0, approved: 0, rejected: 0, deleted: 0 };
  }
}

/** Pending Approvals list — all registration statuses, viewed on this page. */
export async function getManagedCompaniesAsync(): Promise<CompanyRecord[]> {
  try {
    const users = await withDbTimeout(
      prisma.user.findMany({
        where: {
          deletedAt: null,
          status: { in: ["PENDING", "APPROVED", "REJECTED"] },
          role: { not: "SUPER_ADMIN" },
          OR: [
            { companyName: { not: null } },
            { role: "REGISTERED" },
            { role: "COMPANY_ADMIN" },
            { role: "LIVESTOCK_BROKER_USER" },
          ],
        },
        select: managedUserSelect,
        orderBy: { createdAt: "desc" },
      }),
      8000
    );

    const companies = await mapDbUsersToCompanies(users);
    const rejectedIds = companies
      .filter((c) => c.status === "REJECTED" && /^\d+$/.test(c.id))
      .map((c) => Number(c.id));
    if (!rejectedIds.length) return companies;

    const { loadRejectionMapForUserIds } = await import(
      "@/lib/registration-tracking"
    );
    const rejectionMap = await loadRejectionMapForUserIds(rejectedIds);
    return companies.map((c) => {
      const info = /^\d+$/.test(c.id) ? rejectionMap.get(Number(c.id)) : undefined;
      if (!info) return c;
      return {
        ...c,
        rejectionReason: info.reason,
        rejectedAt: info.rejectedAt,
        rejectedByName: info.rejectedByName,
      };
    });
  } catch (error) {
    console.error("[getManagedCompaniesAsync]", error);
    return [];
  }
}

function sectorFromCompanyType(type: string | null | undefined): CompanySector {
  switch ((type || "").toUpperCase()) {
    case "ELECTRICITY":
      return "Electricity";
    case "WATER_SUPPLY":
      return "Water";
    default:
      return "Livestock";
  }
}

function companyRecordFromPrismaCompany(company: {
  id: number;
  name: string;
  slug: string;
  type: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  district: string | null;
  address: string | null;
  registrationNumber: string | null;
  logoFileName: string | null;
  status: string;
  createdAt: Date;
}): CompanyRecord {
  const sector = sectorFromCompanyType(company.type);
  const registeredOn = company.createdAt.toISOString();
  const location =
    [company.district, company.address || company.location]
      .filter(Boolean)
      .join(", ") || "Mogadishu, Somalia";
  const status: CompanyStatus =
    company.status === "SUSPENDED" || company.status === "INACTIVE"
      ? "SUSPENDED"
      : "APPROVED";
  const href =
    sector === "Livestock"
      ? "/livestock"
      : sector === "Electricity"
        ? `/electricity/${company.slug}`
        : `/water/${company.slug}`;

  return {
    id: company.slug || String(company.id),
    name: company.name,
    acronym: acronymFromName(company.name),
    sector,
    location,
    region: regionFromAddress(location),
    phone: realPhone(
      company.phone,
      providerMetaForSlug(company.slug)?.phone
    ),
    email: realEmail(
      company.email,
      providerMetaForSlug(company.slug)?.email
    ),
    website: "—",
    registeredOn,
    status,
    verification: status === "APPROVED" ? "VERIFIED" : "NOT_VERIFIED",
    href,
    companyCode:
      company.registrationNumber?.trim() ||
      companyCodeFor(company.slug || String(company.id), registeredOn.slice(0, 10)),
    image: company.logoFileName
      ? company.logoFileName.startsWith("/")
        ? company.logoFileName
        : `/uploads/${company.logoFileName}`
      : undefined,
    companySlug: company.slug,
    companyDistrict: company.district || undefined,
    companyAddress: company.address || undefined,
    companyEmail: company.email?.trim().toLowerCase() || undefined,
    companyCountry: "Somalia",
  };
}

/**
 * Companies Management — approved / active companies from DB + promoted admins.
 */
export async function getApprovedCompaniesForManagement(): Promise<
  CompanyRecord[]
> {
  const [adminUsers, dbCompanies] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "APPROVED",
        role: {
          in: ["COMPANY_ADMIN", "LIVESTOCK_BROKER_USER"],
        },
      },
      select: managedUserSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const managed = await mapDbUsersToCompanies(adminUsers);

  const byKey = new Map<string, CompanyRecord>();
  for (const row of dbCompanies) {
    const record = companyRecordFromPrismaCompany(row);
    byKey.set(record.companySlug || record.id, record);
  }
  for (const row of managed) {
    const key = row.companySlug || row.id;
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, ...row, id: row.id } : row);
  }

  return [...byKey.values()].sort((a, b) =>
    b.registeredOn.localeCompare(a.registeredOn)
  );
}

/**
 * Pending approvals count for sidebar badge — matches Pending Approvals page
 * (company / broker registrations with PENDING status in PostgreSQL).
 */
export async function getPendingApprovalsCount(): Promise<number> {
  try {
    return await withDbTimeout(
      prisma.user.count({
        where: {
          deletedAt: null,
          status: "PENDING",
          role: { not: "SUPER_ADMIN" },
          OR: [
            { companyName: { not: null } },
            { role: "REGISTERED" },
            { role: "COMPANY_ADMIN" },
            { role: "LIVESTOCK_BROKER_USER" },
          ],
        },
      }),
      8000
    );
  } catch {
    try {
      const companies = await getManagedCompaniesAsync();
      return companies.filter((c) => c.status === "PENDING").length;
    } catch {
      return 0;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pending market prices (Water / Electricity / Livestock)             */
/* ------------------------------------------------------------------ */

export type PendingPriceSector = "Water" | "Electricity" | "Livestock";
export type PendingPriceType = "water" | "electricity" | "livestock";

export interface PendingMarketPrice {
  /** Composite id e.g. W-12 — unique across sectors in the UI */
  id: string;
  /** Prisma row id used by the approvals API */
  recordId: number;
  type: PendingPriceType;
  sector: PendingPriceSector;
  price: number;
  provider: string;
  submittedBy: string;
  submittedById: number;
  date: string;
  item: string;
  unit: string;
  location: string;
  status: "PENDING";
  rejectionReason?: string | null;
}

/** Pending price submissions awaiting Super Admin approve / reject. */
export async function getPendingMarketPrices(): Promise<PendingMarketPrice[]> {
  try {
    const [water, electricity, livestock] = await withDbTimeout(
      Promise.all([
        prisma.waterPrice.findMany({
          where: { status: "PENDING", waterType: UTILITY_SERVICE_TYPE },
          orderBy: { dateRecorded: "desc" },
          include: {
            updatedBy: { select: { id: true, fullName: true, email: true } },
          },
        }),
        prisma.electricityPrice.findMany({
          where: { status: "PENDING", serviceType: UTILITY_SERVICE_TYPE },
          orderBy: { dateRecorded: "desc" },
          include: {
            updatedBy: { select: { id: true, fullName: true, email: true } },
          },
        }),
        prisma.livestockPrice.findMany({
          where: { status: "PENDING", deletedAt: null },
          orderBy: { dateRecorded: "desc" },
          include: {
            updatedBy: { select: { id: true, fullName: true, email: true } },
          },
        }),
      ]),
      8000
    );

    const rows: PendingMarketPrice[] = [
      ...water.map((r) => ({
        id: `W-${r.id}`,
        recordId: r.id,
        type: "water" as const,
        sector: "Water" as const,
        price: Number(r.pricePerUnit),
        provider: r.providerName,
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        submittedById: r.updatedBy.id,
        date: new Date(r.dateRecorded).toISOString(),
        item: r.waterType,
        unit: "per m³",
        location: r.location,
        status: "PENDING" as const,
        rejectionReason: r.rejectionReason,
      })),
      ...electricity.map((r) => ({
        id: `E-${r.id}`,
        recordId: r.id,
        type: "electricity" as const,
        sector: "Electricity" as const,
        price: Number(r.pricePerKwh),
        provider: r.providerName,
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        submittedById: r.updatedBy.id,
        date: new Date(r.dateRecorded).toISOString(),
        item: r.serviceType,
        unit: "per kWh",
        location: r.location,
        status: "PENDING" as const,
        rejectionReason: r.rejectionReason,
      })),
      ...livestock.map((r) => ({
        id: `L-${r.id}`,
        recordId: r.id,
        type: "livestock" as const,
        sector: "Livestock" as const,
        price: Number(r.price),
        provider: r.marketLocation,
        submittedBy: r.updatedBy.fullName || r.updatedBy.email,
        submittedById: r.updatedBy.id,
        date: new Date(r.dateRecorded).toISOString(),
        item: r.animalType,
        unit: "per head",
        location: r.marketLocation,
        status: "PENDING" as const,
        rejectionReason: r.rejectionReason,
      })),
    ];

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Notifications — real Super Admin system alerts                      */
/* ------------------------------------------------------------------ */

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  sector: string;
  type?: string;
  senderId?: number | null;
  read: boolean;
  createdAt: string; // ISO
  recipient?: string;
  href?: string;
}

export async function getSystemNotifications(
  limit = 20
): Promise<AdminNotification[]> {
  return (await listSystemNotifications(limit)).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    sector: n.sector,
    type: n.type,
    senderId: n.senderId,
    read: n.read,
    createdAt: n.createdAt,
    href: n.href,
  }));
}

export async function getUnreadNotificationsCount(): Promise<number> {
  return await countUnreadNotifications();
}

/* ------------------------------------------------------------------ */
/* Recent prices (all sectors, serializable)                           */
/* ------------------------------------------------------------------ */

export interface PriceRow {
  id: string;
  sector: "Livestock" | "Water" | "Electricity";
  item: string;
  provider: string;
  unit: string;
  price: number;
  dateRecorded: string; // ISO
  region: string;
}

export interface MarketPriceStats {
  totalUpdates: number;
  waterCompanies: number;
  electricityCompanies: number;
  livestockCategories: number;
}

export async function getMarketPriceStats(): Promise<MarketPriceStats> {
  try {
    const [
      livestockCount,
      waterCount,
      electricityCount,
      waterProviders,
      electricityProviders,
      livestockTypes,
    ] = await withDbTimeout(
      Promise.all([
        prisma.livestockPrice.count(),
        prisma.waterPrice.count(),
        prisma.electricityPrice.count(),
        prisma.waterPrice.findMany({
          distinct: ["providerName"],
          select: { providerName: true },
        }),
        prisma.electricityPrice.findMany({
          distinct: ["providerName"],
          select: { providerName: true },
        }),
        prisma.livestockPrice.findMany({
          distinct: ["animalType"],
          select: { animalType: true },
        }),
      ])
    );

    return {
      totalUpdates: livestockCount + waterCount + electricityCount,
      waterCompanies: waterProviders.length,
      electricityCompanies: electricityProviders.length,
      livestockCategories: livestockTypes.length,
    };
  } catch {
    return {
      totalUpdates: 0,
      waterCompanies: 0,
      electricityCompanies: 0,
      livestockCategories: 0,
    };
  }
}

export async function getAllRecentPrices(limitPerSector = 40): Promise<PriceRow[]> {
  try {
    const livestock = await withDbTimeout(
      prisma.livestockPrice.findMany({
        where: { status: "APPROVED", deletedAt: null },
        orderBy: { dateRecorded: "desc" },
        take: limitPerSector,
      }),
      8000
    );

    return livestock.map((r) => ({
      id: `L-${r.id}`,
      sector: "Livestock" as const,
      item: r.animalType,
      provider: r.marketLocation,
      unit: "per head",
      price: Number(r.price),
      dateRecorded: new Date(r.dateRecorded).toISOString(),
      region: r.marketLocation,
    }));
  } catch {
    return [];
  }
}
