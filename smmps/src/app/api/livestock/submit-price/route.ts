import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission, isLivestockBroker } from "@/lib/auth";
import { notifyRole } from "@/lib/notifications";
import { consumeAdvertisement, requireActiveSubscription } from "@/lib/subscriptions";
import { LIVESTOCK_CURRENCIES, LIVESTOCK_UNITS } from "@/lib/livestock-catalog";
import { livestockPriceError, fieldCategoryFromTypeName, seasonFromCategoryLabel, isRetiredLivestockType, RETIRED_LIVESTOCK_TYPE_ERROR } from "@/lib/livestock-section-prices";
import { assertBrokerCanSubmit } from "@/lib/livestock-scope";
import {
  dismissDuplicatePendingLivestockPrices,
  findLatestLivestockPriceMatch,
  isUnchangedApprovedPrice,
  resolveLivestockPriceLinks,
  revalidateLivestockPublic,
} from "@/lib/livestock-price-persist";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!isLivestockBroker(auth.user)) {
    return jsonError("Only livestock brokers can submit market prices", 403);
  }

  const canAdd = checkPermission(auth.user, "ADD_LIVESTOCK_PRICE");
  if (!canAdd) return jsonError("Forbidden", 403);

  const sub = await requireActiveSubscription({ brokerId: auth.user.brokerId });
  if (!sub.ok) return jsonError(sub.reason, 402);

  const body = await request.json().catch(() => null);
  const marketId = Number(body?.marketId);
  const categoryId = Number(body?.categoryId);
  const livestockTypeId = Number(body?.livestockTypeId);
  const price = Number(body?.price);
  const currency = String(body?.currency || "USD").toUpperCase();
  const unit = String(body?.unit || "head").trim();
  const dateRaw = body?.date ? new Date(body.date) : new Date();

  if (!marketId || !categoryId || !livestockTypeId) {
    return jsonError("Market, category, and animal type are required");
  }
  if (!Number.isFinite(price) || price <= 0) {
    return jsonError("Enter a valid price greater than zero");
  }
  const cap = livestockPriceError(price);
  if (cap) return jsonError(cap);
  if (!LIVESTOCK_CURRENCIES.includes(currency as (typeof LIVESTOCK_CURRENCIES)[number])) {
    return jsonError("Unsupported currency");
  }
  if (!LIVESTOCK_UNITS.includes(unit as (typeof LIVESTOCK_UNITS)[number])) {
    return jsonError("Unsupported unit");
  }
  if (Number.isNaN(dateRaw.getTime())) {
    return jsonError("Enter a valid date");
  }

  const allowed = await assertBrokerCanSubmit({
    user: auth.user,
    marketId,
    categoryId,
    livestockTypeId,
  });
  if (!allowed.ok) return jsonError(allowed.error, allowed.status);

  const [market, category, livestockType] = await Promise.all([
    prisma.market.findFirst({ where: { id: marketId, deletedAt: null } }),
    prisma.livestockCategory.findUnique({ where: { id: categoryId } }),
    prisma.livestockAnimalType.findUnique({ where: { id: livestockTypeId } }),
  ]);
  if (!market || market.status !== "ACTIVE") return jsonError("Market is not available");
  if (!category || category.status !== "ACTIVE") return jsonError("Category is not available");
  if (!livestockType || livestockType.status !== "ACTIVE") {
    return jsonError("Animal type is not available");
  }
  if (
    isRetiredLivestockType(
      livestockType.slug,
      livestockType.name,
      livestockType.nameSomali
    )
  ) {
    return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
  }

  const typeName = livestockType.nameSomali || livestockType.name;
  const seasonKey = seasonFromCategoryLabel(String(body?.season || "Birimo"));
  const categoryKey = fieldCategoryFromTypeName(seasonKey, typeName);

  const links = await resolveLivestockPriceLinks({
    animalType: livestockType.legacyAnimalType,
    category: categoryKey,
    season: seasonKey,
    typeName,
    description: typeName,
    livestockTypeId: livestockType.id,
    livestockCategoryId: category.id,
    marketId: market.id,
    marketLocation: market.name,
    brokerId: auth.user.brokerId,
  });

  const latest = await findLatestLivestockPriceMatch({
    brokerId: auth.user.brokerId,
    updatedById: auth.user.id,
    category: links.category,
    livestockTypeId: links.livestockTypeId,
    marketId: links.marketId,
    description: typeName,
  });
  if (isUnchangedApprovedPrice(latest, price, typeName)) {
    return jsonError("Isku qiimo lama gelin karo. Dooro lacag ka duwan.");
  }

  const creating = latest?.status !== "PENDING" && latest?.status !== "DRAFT";
  if (creating && auth.user.brokerId) {
    const ads = await consumeAdvertisement({ brokerId: auth.user.brokerId });
    if (!ads.ok) return jsonError(ads.reason, 402);
  }

  const record =
    !creating
      ? await prisma.livestockPrice.update({
          where: { id: latest.id },
          data: {
            animalType: links.animalType,
            category: links.category,
            livestockCategoryId: links.livestockCategoryId,
            livestockTypeId: links.livestockTypeId,
            marketLocation: links.marketLocation || market.name,
            marketId: links.marketId || market.id,
            brokerId: auth.user.brokerId,
            price,
            currency,
            unit,
            description: links.description,
            dateRecorded: dateRaw,
            updatedById: auth.user.id,
            status: "PENDING",
            rejectionReason: null,
          },
          include: {
            market: { select: { id: true, name: true } },
            livestockCategory: { select: { id: true, name: true } },
            livestockType: { select: { id: true, name: true } },
          },
        })
      : await prisma.livestockPrice.create({
    data: {
      animalType: links.animalType,
      category: links.category,
      livestockCategoryId: links.livestockCategoryId,
      livestockTypeId: links.livestockTypeId,
      marketLocation: links.marketLocation || market.name,
      marketId: links.marketId || market.id,
      brokerId: auth.user.brokerId,
      price,
      currency,
      unit,
      description: links.description,
      dateRecorded: dateRaw,
      updatedById: auth.user.id,
      status: "PENDING",
    },
    include: {
      market: { select: { id: true, name: true } },
      livestockCategory: { select: { id: true, name: true } },
      livestockType: { select: { id: true, name: true } },
    },
  });

  await notifyRole(["SUPER_ADMIN"], {
    title: "New livestock price submitted",
    message: `${auth.user.fullName} submitted ${livestockType.name} at ${market.name} for ${price} ${currency}.`,
    type: "PRICE_SUBMITTED",
    sector: "livestock",
    senderId: auth.user.id,
  });

  revalidateLivestockPublic();
  return jsonOk({ price: record }, 201);
}
