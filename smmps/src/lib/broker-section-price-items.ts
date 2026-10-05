import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-guard";
import {
  isAllowedPriceCategory,
  parseFieldCategory,
  parseUsd,
  livestockPriceError,
  tabSeason,
  canonicalTypeName,
  isRetiredLivestockType,
  RETIRED_LIVESTOCK_TYPE_ERROR,
  type NamedPriceField,
} from "@/lib/livestock-section-prices";
import type { AnimalType, LivestockPrice, Prisma } from "@prisma/client";
import { resolveLivestockPriceLinks } from "@/lib/livestock-price-persist";
import {
  normalizeAgeClass,
  normalizeOriginPlace,
  sameAgeClass,
  sameOriginPlace,
} from "@/lib/livestock-listing-meta";

type PersistResult =
  | { ok: true; saved: LivestockPrice[]; fields: NamedPriceField[] }
  | { ok: false; response: Response };

function rowSeason(category: string | null | undefined) {
  const other = parseFieldCategory(category);
  if (other) return tabSeason(other.season);
  return String(category || "").toLowerCase().includes("sugunto")
    ? "sugunto"
    : "birimo";
}

export async function persistBrokerNamedPriceFields(input: {
  items: unknown[];
  brokerLocked: boolean;
  queueForApproval?: boolean;
  animalType: AnimalType;
  location: string;
  marketId?: number | null;
  brokerId?: number | null;
  userId: number;
  ownerWhere: Prisma.LivestockPriceWhereInput;
}): Promise<PersistResult> {
  const saved: LivestockPrice[] = [];
  const fields: NamedPriceField[] = [];
  const queueForApproval = input.queueForApproval !== false;

  for (const raw of input.items) {
    const item = (raw ?? {}) as {
      id?: unknown;
      category?: unknown;
      season?: unknown;
      name?: unknown;
      price?: unknown;
      ageClass?: unknown;
      originPlace?: unknown;
    };
    const category = String(item.category || "").toUpperCase();
    const season = String(item.season || "").toLowerCase();
    if (!isAllowedPriceCategory(category)) continue;
    const parsed = parseFieldCategory(category);
    if (!parsed) continue;
    if (season && tabSeason(season) !== tabSeason(parsed.season)) continue;

    let typeName = String(item.name || "").trim().slice(0, 80);
    const editId = Number(item.id) || 0;
    const existing =
      editId > 0
        ? await prisma.livestockPrice.findFirst({
            where: {
              ...input.ownerWhere,
              id: editId,
              deletedAt: null,
            },
          })
        : null;

    if (input.brokerLocked) {
      typeName =
        canonicalTypeName(existing?.description || typeName) || typeName;
    }
    if (isRetiredLivestockType(typeName, existing?.description, category)) {
      return { ok: false, response: jsonError(RETIRED_LIVESTOCK_TYPE_ERROR) };
    }
    if (!typeName) continue;
    const price = parseUsd(String(item.price ?? ""));
    const priceErr = livestockPriceError(price);
    if (priceErr && price > 0) return { ok: false, response: jsonError(priceErr) };
    const ageClass = normalizeAgeClass(String(item.ageClass || ""));
    const originPlace = normalizeOriginPlace(String(item.originPlace || ""));
    if (price > 0 && !ageClass) {
      return {
        ok: false,
        response: jsonError("Qor daada xoolaha."),
      };
    }
    if (price > 0 && !originPlace) {
      return {
        ok: false,
        response: jsonError("Qor meesha xoolaha laga keenay."),
      };
    }

    const links = await resolveLivestockPriceLinks({
      animalType: input.animalType,
      category,
      typeName,
      description: typeName,
      season: parsed.season,
      brokerId: input.brokerId,
      marketId: input.marketId,
      marketLocation: input.location,
    });

    const persistPrice = price > 0 ? price : Number(existing?.price) || 0;
    if (persistPrice > 0 && ageClass && originPlace) {
      const wantName = canonicalTypeName(typeName).toLowerCase();
      const seasonKey = tabSeason(parsed.season);
      const listed = await prisma.livestockPrice.findMany({
        where: {
          ...input.ownerWhere,
          deletedAt: null,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: {
          id: true,
          category: true,
          description: true,
          ageClass: true,
          originPlace: true,
        },
        take: 400,
      });
      const duplicate = listed.some((row) => {
        if (existing && row.id === existing.id) return false;
        const rowName = canonicalTypeName(row.description).toLowerCase();
        if (!wantName || !rowName || rowName !== wantName) return false;
        if (rowSeason(row.category) !== seasonKey) return false;
        const sameListing =
          sameAgeClass(row.ageClass, ageClass) &&
          sameOriginPlace(row.originPlace, originPlace);
        if (!sameListing) return false;
        if (
          existing &&
          sameAgeClass(existing.ageClass, ageClass) &&
          sameOriginPlace(existing.originPlace, originPlace)
        ) {
          return false;
        }
        return true;
      });
      if (duplicate) {
        return {
          ok: false,
          response: jsonError(
            "Noocan daada iyo meesha isku mid ah horay ayuu u jiraa. Dooro daa ama meel ka duwan."
          ),
        };
      }
    }

    const nextStatus: "PENDING" | "APPROVED" =
      queueForApproval && persistPrice > 0
        ? "PENDING"
        : persistPrice > 0
          ? "APPROVED"
          : "PENDING";

    const listingData = {
      animalType: links.animalType,
      category,
      description: typeName,
      livestockTypeId: links.livestockTypeId ?? existing?.livestockTypeId,
      livestockCategoryId: links.livestockCategoryId ?? existing?.livestockCategoryId,
      marketId: links.marketId ?? existing?.marketId,
      price: persistPrice,
      currency: "USD" as const,
      marketLocation:
        links.marketLocation || existing?.marketLocation || input.location,
      brokerId: input.brokerId ?? null,
      updatedById: input.userId,
      dateRecorded: new Date(),
      status: nextStatus,
      ageClass,
      originPlace: originPlace || null,
    };

    const canUpdateExisting =
      Boolean(existing) &&
      (existing?.status === "PENDING" ||
        existing?.status === "REJECTED" ||
        !queueForApproval);

    const record = canUpdateExisting && existing
      ? await prisma.livestockPrice.update({
          where: { id: existing.id },
          data: {
            price: persistPrice,
            status: existing.status === "REJECTED" ? "PENDING" : nextStatus,
            rejectionReason: null,
            updatedById: input.userId,
            ageClass,
            originPlace: originPlace || null,
            ...(persistPrice > 0 && Number(existing.price) !== persistPrice
              ? { dateRecorded: new Date() }
              : {}),
          },
        })
      : await prisma.livestockPrice.create({
          data: listingData,
        });

    saved.push(record);
    fields.push({
      id: record.id,
      category,
      name: typeName,
      price: persistPrice,
      season: tabSeason(parsed.season),
      ageClass,
      originPlace: originPlace || null,
    });
  }

  return { ok: true, saved, fields };
}
