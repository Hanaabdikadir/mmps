import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api-guard";
import {
  animalTypesFromCategory,
  canonicalTypeName,
  categorySlugFromAnimal,
  isLegacyGenderCategory,
  normalizeBoardRow,
  sameLivestockTypeName,
  seasonFromCategoryLabel,
  isRetiredLivestockType,
} from "@/lib/livestock-section-prices";
import { professionalLivestockMarketLabel } from "@/lib/livestock-registration-markets";
import { isLivestockCategorySlug } from "@/lib/livestock-data";
import { getLivestockTypePhotoMaps } from "@/lib/livestock-type-photo-store";

export const dynamic = "force-dynamic";

type ContactPerson = {
  phone?: string | null;
  email?: string | null;
  users?: { phone?: string | null; email?: string | null }[];
};

function firstMarketLabel(...values: (string | null | undefined)[]) {
  for (const value of values) {
    const labeled = professionalLivestockMarketLabel(value);
    if (labeled) return labeled;
  }
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (
      lower === "mogadishu" ||
      lower === "livestock market" ||
      lower === "banadir livestock market" ||
      lower === "mogadishu livestock market"
    ) {
      continue;
    }
    return trimmed;
  }
  return "";
}

function firstValue(...values: (string | null | undefined)[]) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function isLeadEmail(email?: string | null) {
  return (email || "").toLowerCase().endsWith("@livestock.so");
}

function isGenericBrokerLabel(value?: string | null) {
  const n = (value || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!n) return true;
  return (
    n === "camel" ||
    n === "cattle" ||
    n === "goat" ||
    n === "geel" ||
    n === "lo'" ||
    n === "lo" ||
    n === "ari" ||
    n === "livestock" ||
    n === "livestock broker" ||
    n === "broker"
  );
}

function listingBrokerName(row: {
  broker?: {
    name?: string | null;
    email?: string | null;
    users?: { fullName?: string | null; email?: string | null }[];
  } | null;
  updatedBy?: { fullName?: string | null; email?: string | null } | null;
}): string | null {
  const people = [
    ...(row.broker?.users || []),
    row.updatedBy
      ? { fullName: row.updatedBy.fullName, email: row.updatedBy.email }
      : null,
  ].filter(Boolean) as { fullName?: string | null; email?: string | null }[];

  const person = people.find(
    (u) => u.fullName?.trim() && !isLeadEmail(u.email) && !isGenericBrokerLabel(u.fullName)
  );
  if (person?.fullName?.trim()) return person.fullName.trim();

  const brokerName = row.broker?.name?.trim();
  if (brokerName && !isGenericBrokerLabel(brokerName) && !isLeadEmail(row.broker?.email)) {
    return brokerName;
  }

  const fallback = people.find((u) => u.fullName?.trim())?.fullName?.trim();
  return fallback || brokerName || null;
}

function contactFrom(person?: ContactPerson | null) {
  const users = person?.users || [];
  return {
    phone: firstValue(person?.phone, ...users.map((u) => u.phone)),
    email: firstValue(person?.email, ...users.map((u) => u.email)),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const animalParam = searchParams.get("animalType") || "";
  const typeParam = canonicalTypeName(searchParams.get("type") || "");
  const seasonParam = (searchParams.get("season") || "birimo").toLowerCase();
  const season = seasonParam === "sugunto" ? "sugunto" : "birimo";

  if (!typeParam) {
    return jsonError("type is required", 400);
  }
  if (isRetiredLivestockType(typeParam, searchParams.get("type"))) {
    const slug = isLivestockCategorySlug(animalParam)
      ? animalParam
      : categorySlugFromAnimal(animalParam);
    return jsonOk({ slug, typeName: typeParam, season, listings: [] });
  }

  const slug = isLivestockCategorySlug(animalParam)
    ? animalParam
    : categorySlugFromAnimal(animalParam);
  const animalTypes = animalTypesFromCategory(slug);

  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      status: "APPROVED",
      animalType: { in: animalTypes },
      OR: [
        { brokerId: null },
        { broker: { is: { deletedAt: null, status: "ACTIVE" } } },
      ],
      AND: [
        {
          OR: [
            { marketId: null },
            { market: { is: { deletedAt: null, status: "ACTIVE" } } },
          ],
        },
      ],
    },
    include: {
      livestockType: { select: { name: true, nameSomali: true } },
      market: {
        select: {
          name: true,
          location: true,
          livestockBrokerLinks: {
            where: { broker: { deletedAt: null, status: "ACTIVE" } },
            include: {
              broker: {
                select: {
                  phone: true,
                  email: true,
                  users: {
                    where: { deletedAt: null, accountStatus: "ACTIVE" },
                    select: { phone: true, email: true, fullName: true },
                    take: 8,
                  },
                },
              },
            },
          },
        },
      },
      broker: {
        select: {
          id: true,
          marketId: true,
          name: true,
          code: true,
          phone: true,
          email: true,
          location: true,
          market: { select: { name: true, location: true } },
          assignedMarkets: {
            take: 4,
            include: { market: { select: { name: true, location: true } } },
          },
          users: {
            where: { deletedAt: null, accountStatus: "ACTIVE" },
            select: {
              phone: true,
              email: true,
              fullName: true,
              companyLocation: true,
              companyAddress: true,
              market: { select: { name: true, location: true } },
            },
            take: 8,
          },
        },
      },
      updatedBy: {
        select: {
          phone: true,
          email: true,
          fullName: true,
          brokerId: true,
          companyLocation: true,
          companyAddress: true,
          market: { select: { name: true, location: true } },
          broker: {
            select: {
              id: true,
              marketId: true,
              name: true,
              email: true,
              phone: true,
              location: true,
              market: { select: { name: true, location: true } },
              assignedMarkets: {
                take: 4,
                include: { market: { select: { name: true, location: true } } },
              },
              users: {
                where: { deletedAt: null, accountStatus: "ACTIVE" },
                select: {
                  phone: true,
                  email: true,
                  fullName: true,
                  companyLocation: true,
                  companyAddress: true,
                  market: { select: { name: true } },
                },
                take: 8,
              },
            },
          },
        },
      },
    },
    orderBy: { dateRecorded: "desc" },
    take: 2000,
  });

  const listingPhotos = await getLivestockTypePhotoMaps(slug, season, "listing");
  const typeKey = typeParam;

  const listings = rows
    .map((row) => {
      const normalized = normalizeBoardRow({
        category: row.category,
        description: row.description,
        price: Number(row.price),
        livestockTypeName:
          row.livestockType?.nameSomali || row.livestockType?.name || null,
      });
      if (!normalized) return null;
      if (isLegacyGenderCategory(normalized.category)) return null;
      const name = canonicalTypeName(normalized.description);
      if (!sameLivestockTypeName(name, typeParam)) return null;
      const rowSeason = seasonFromCategoryLabel(row.category);
      if (rowSeason !== season) return null;
      if (!(Number(row.price) > 0)) return null;
      const linkedBroker = row.broker ?? row.updatedBy?.broker ?? null;
      // Multi-market plans (3mo / 6mo / 1yr): show every approved price for the
      // market it was entered on — do not hide non-primary markets.
      const assignedNames =
        linkedBroker?.assignedMarkets?.flatMap((link) => [
          link.market?.name,
          link.market?.location,
        ]) || [];
      const userMarketNames =
        linkedBroker?.users?.flatMap((u) => [
          u.market?.name,
          u.companyLocation,
          u.companyAddress,
        ]) || [];
      const market = firstMarketLabel(
        row.market?.name,
        row.market?.location,
        row.marketLocation,
        linkedBroker?.market?.name,
        linkedBroker?.market?.location,
        ...assignedNames,
        linkedBroker?.location,
        row.updatedBy?.broker?.market?.name,
        row.updatedBy?.broker?.market?.location,
        ...(row.updatedBy?.broker?.assignedMarkets?.flatMap((link) => [
          link.market?.name,
          link.market?.location,
        ]) || []),
        row.updatedBy?.market?.name,
        row.updatedBy?.market?.location,
        row.updatedBy?.companyAddress,
        row.updatedBy?.companyLocation,
        ...userMarketNames
      );
      const marketBrokers = row.market?.livestockBrokerLinks?.map((link) => link.broker) || [];
      const phone = firstValue(
        contactFrom(row.broker).phone,
        ...marketBrokers.map((broker) => contactFrom(broker).phone),
        row.updatedBy?.phone
      );
      const email = firstValue(
        contactFrom(row.broker).email,
        ...marketBrokers.map((broker) => contactFrom(broker).email),
        row.updatedBy?.email
      );
      const enteredBy = listingBrokerName({
        broker: row.broker ?? row.updatedBy?.broker ?? null,
        updatedBy: row.updatedBy,
      });
      const brokerId =
        row.broker?.id ?? row.updatedBy?.brokerId ?? row.updatedBy?.broker?.id ?? null;
      const typeId = row.livestockTypeId;
      const ownedPhotos = brokerId != null ? listingPhotos.photosByBroker[String(brokerId)] : null;
      const uniquePhotoKeys = [
        typeId ? `${name}__${typeId}` : "",
        typeId ? `${canonicalTypeName(row.livestockType?.name)}__${typeId}` : "",
        name,
        typeKey,
      ].filter(Boolean);
      const listingPhoto = uniquePhotoKeys.map((k) => ownedPhotos?.[k]).find(Boolean) || "";
      const photoUrl = listingPhoto || null;
      return {
        id: row.id,
        typeName: name,
        season: rowSeason,
        category: String(row.category || ""),
        price: Number(row.price),
        currency: row.currency,
        market,
        marketLocation: row.market?.location || null,
        enteredBy,
        brokerId,
        brokerCode: row.broker?.code || null,
        photoUrl,
        ageClass: row.ageClass,
        originPlace: row.originPlace,
        phone,
        email,
        dateRecorded: row.dateRecorded.toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const publicListings = listings.sort((a, b) => {
      const origin = String(a.originPlace || "").localeCompare(String(b.originPlace || ""));
      if (origin !== 0) return origin;
      const age = String(a.ageClass || "").localeCompare(String(b.ageClass || ""));
      if (age !== 0) return age;
      const market = (a.market || "").localeCompare(b.market || "");
      if (market !== 0) return market;
      if (a.price !== b.price) return a.price - b.price;
      return b.dateRecorded.localeCompare(a.dateRecorded);
    });

  return jsonOk({
    slug,
    typeName: typeParam,
    season,
    listings: publicListings,
  });
}
