import { prisma } from "@/lib/prisma";
import type { AnimalType } from "@prisma/client";
import {
  livestockSpeciesLabel,
  type LivestockMarketSection,
  isLivestockMarketSection,
  parseLivestockTypeChoices,
  serializeLivestockTypeChoices,
} from "@/lib/register-flow";
import { assignBrokerFromRegistration } from "@/lib/livestock-assignments";
import { SECTION_BROKER_EMAILS } from "@/lib/livestock-manager-broker";
import { ensureBrokerCode } from "@/lib/livestock-catalog";
import {
  ensureAccountSubscription,
  registrationMarketIds,
  registrationPaidAmount,
  registrationPayMonths,
  registrationPlanId,
} from "@/lib/subscriptions";

export function animalTypeFromLivestockSection(
  section: string | null | undefined
): AnimalType | null {
  const species = livestockSpeciesLabel(section);
  if (species === "Camel") return "CAMEL";
  if (species === "Cattle") return "CATTLE";
  if (species === "Goat") return "GOAT";
  return null;
}

export function normalizeLivestockSection(
  value: string | null | undefined
): LivestockMarketSection | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (isLivestockMarketSection(raw)) return raw;
  const species = livestockSpeciesLabel(raw);
  if (species === "Camel") return "Camel Market Section";
  if (species === "Cattle") return "Cattle Market Section";
  if (species === "Goat") return "Goat Market Section";
  return null;
}

/** Find active Camel / Cattle / Goat broker row for a market section. */
export async function findBrokerForSection(
  section: string | null | undefined,
  marketId?: number | null
) {
  const normalized = normalizeLivestockSection(section);
  if (!normalized) return null;

  const animal = animalTypeFromLivestockSection(normalized);
  const brokers = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(marketId ? { marketId } : {}),
    },
    orderBy: { id: "asc" },
  });

  const exact = brokers.find(
    (b) =>
      normalizeLivestockSection(b.livestockFocus) === normalized ||
      normalizeLivestockSection(b.name) === normalized ||
      b.name.trim().toLowerCase() === animal?.toLowerCase()
  );
  if (exact) return exact;

  return (
    brokers.find((b) => animalTypeFromLivestockSection(b.livestockFocus) === animal) ||
    null
  );
}

async function ensureBrokerSubscription(
  brokerId: number,
  opts?: {
    planId?: number | null;
    accessDays?: number | null;
    paidMonths?: number | null;
    paidAmount?: number | null;
  }
) {
  return ensureAccountSubscription({ brokerId, ...opts });
}

/**
 * After Super Admin approves a Camel/Cattle/Goat register applicant:
 * create (or reuse) that person's own livestock broker profile, assign the
 * market and category they registered with, then unlock broker login.
 */
export async function promoteApprovedBroker(opts: {
  userId?: number | null;
  email?: string | null;
}): Promise<{ brokerId: number | null; section: string | null }> {
  const email = opts.email?.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: opts.userId
      ? { OR: [{ id: opts.userId }, ...(email ? [{ email }] : [])] }
      : email
        ? { email }
        : { id: -1 },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      profilePicture: true,
      companyName: true,
      companyLocation: true,
      role: true,
      companySector: true,
      companyType: true,
      contactRole: true,
      brokerId: true,
      marketId: true,
      registrationDocuments: true,
    },
  });

  if (!user) return { brokerId: null, section: null };

  const typeChoices = parseLivestockTypeChoices(user.companyType);
  const sector = (user.companySector || "").toLowerCase();
  const isLivestock =
    sector.includes("livestock") ||
    typeChoices.length > 0 ||
    Boolean(
      normalizeLivestockSection(user.companyType) ||
        normalizeLivestockSection(user.contactRole) ||
        normalizeLivestockSection(user.companyName)
    );
  if (!isLivestock) return { brokerId: null, section: null };

  const section =
    typeChoices.length > 0
      ? serializeLivestockTypeChoices(typeChoices)
      : normalizeLivestockSection(user.companyType) ||
        normalizeLivestockSection(user.contactRole) ||
        normalizeLivestockSection(user.companyName) ||
        "Goat Market Section";

  const applicantEmail = user.email.toLowerCase();
  const isSectionLead = (SECTION_BROKER_EMAILS as readonly string[]).includes(
    applicantEmail
  );

  let brokerId = user.brokerId;

  if (isSectionLead) {
    const sectionBroker = await findBrokerForSection(section, user.marketId);
    brokerId = sectionBroker?.id ?? brokerId;
  } else {
    const existingByEmail = await prisma.livestockBroker.findFirst({
      where: { email: applicantEmail, deletedAt: null },
      select: { id: true },
    });

    let linkedToSectionLead = false;
    if (!existingByEmail && brokerId) {
      const linked = await prisma.livestockBroker.findFirst({
        where: { id: brokerId, deletedAt: null },
        select: { email: true },
      });
      linkedToSectionLead = Boolean(
        linked?.email &&
          (SECTION_BROKER_EMAILS as readonly string[]).includes(
            linked.email.toLowerCase()
          )
      );
    }

    if (existingByEmail) {
      brokerId = existingByEmail.id;
    } else if (!brokerId || linkedToSectionLead) {
      const created = await prisma.livestockBroker.create({
        data: {
          name: user.fullName.trim() || user.companyName?.trim() || "Livestock Broker",
          email: applicantEmail,
          phone: user.phone,
          location: user.companyLocation,
          profilePicture: user.profilePicture,
          livestockFocus: section,
          marketId: user.marketId,
          status: "ACTIVE",
          approvalStatus: "APPROVED",
        },
      });
      brokerId = created.id;
    }

    if (brokerId) {
      await prisma.livestockBroker.update({
        where: { id: brokerId },
        data: {
          name: user.fullName.trim() || user.companyName?.trim() || "Livestock Broker",
          phone: user.phone,
          location: user.companyLocation,
          profilePicture: user.profilePicture,
          livestockFocus: section,
          marketId: user.marketId,
          status: "ACTIVE",
          approvalStatus: "APPROVED",
        },
      });
    }
  }

  if (!brokerId) {
    const created = await prisma.livestockBroker.create({
      data: {
        name: user.fullName.trim() || user.companyName?.trim() || "Livestock Broker",
        email: applicantEmail,
        phone: user.phone,
        location: user.companyLocation,
        profilePicture: user.profilePicture,
        livestockFocus: section,
        marketId: user.marketId,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
      },
    });
    brokerId = created.id;
  }

  try {
    const marketIds = [
      ...new Set(
        [
          user.marketId,
          ...registrationMarketIds(user.registrationDocuments),
        ].filter((id): id is number => Number.isFinite(id as number) && (id as number) > 0)
      ),
    ];
    await assignBrokerFromRegistration({
      brokerId,
      marketId: marketIds[0] ?? user.marketId,
      marketIds,
      livestockSection: section,
    });
    await ensureBrokerCode(brokerId);
    const paidMonths = registrationPayMonths(user.registrationDocuments);
    const paidAmount = registrationPaidAmount(user.registrationDocuments);
    await ensureBrokerSubscription(brokerId, {
      planId: registrationPlanId(user.registrationDocuments),
      accessDays: paidMonths ? paidMonths * 30 : null,
      paidMonths,
      paidAmount,
    });
  } catch (err) {
    console.error("[promoteApprovedBroker] broker assignment failed", err);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "APPROVED",
      accountStatus: "ACTIVE",
      role: "LIVESTOCK_BROKER_USER",
      brokerId,
      companyType: section,
      companySector: "livestock",
      deletedAt: null,
    },
  });

  return { brokerId, section };
}

/** Link any approved livestock registrants still missing brokerId. */
export async function syncUnlinkedLivestockBrokers() {
  const pending = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "APPROVED",
      brokerId: null,
      OR: [
        { companySector: { contains: "livestock", mode: "insensitive" } },
        { companyType: { contains: "Camel", mode: "insensitive" } },
        { companyType: { contains: "Cattle", mode: "insensitive" } },
        { companyType: { contains: "Goat", mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true },
    take: 200,
  });

  let linked = 0;
  for (const row of pending) {
    const result = await promoteApprovedBroker({
      userId: row.id,
      email: row.email,
    });
    if (result.brokerId) linked += 1;
  }
  return linked;
}
