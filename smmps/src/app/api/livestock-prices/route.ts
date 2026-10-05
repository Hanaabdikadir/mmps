import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  jsonOk,
  jsonError,
} from "@/lib/api-guard";
import {
  checkPermission,
  isLivestockBroker,
  isSuperAdmin,
} from "@/lib/auth";
import { notifyMany, notifyRole } from "@/lib/notifications";
import { requireActiveSubscription } from "@/lib/subscriptions";
import type { AnimalType, PriceStatus } from "@prisma/client";
import {
  dismissDuplicatePendingLivestockPrices,
  findLatestLivestockPriceMatch,
  isUnchangedApprovedPrice,
  resolveLivestockPriceLinks,
  revalidateLivestockPublic,
  supersedeMatchingApprovedLivestockPrices,
} from "@/lib/livestock-price-persist";
import { livestockPriceError, isRetiredLivestockType, RETIRED_LIVESTOCK_TYPE_ERROR } from "@/lib/livestock-section-prices";
import { normalizeAgeClass } from "@/lib/livestock-listing-meta";

const LIVESTOCK_TYPES: AnimalType[] = ["CAMEL", "CATTLE", "GOAT", "SHEEP"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PriceStatus | null;
  const animalType = searchParams.get("animalType") as AnimalType | null;
  const mine = searchParams.get("mine") === "1";
  const official = searchParams.get("official") === "1";
  const q = searchParams.get("q")?.trim();

  const and: Record<string, unknown>[] = [
    { deletedAt: null },
    { animalType: { in: LIVESTOCK_TYPES } },
    { price: { gt: 0 } },
  ];

  if (official) {
    and.push({ status: "APPROVED" });
  } else if (status) {
    and.push({ status });
  } else if (mine) {
    and.push({ status: "APPROVED" });
  }

  if (animalType && LIVESTOCK_TYPES.includes(animalType)) {
    and.push({ animalType });
  }

  const canReviewQueue =
    isSuperAdmin(auth.user) || checkPermission(auth.user, "APPROVE_LIVESTOCK_PRICE");

  if (!canReviewQueue) {
    if (isLivestockBroker(auth.user) || mine) {
      and.push(
        status === "REJECTED" && auth.user.brokerId
          ? {
              OR: [
                { updatedById: auth.user.id },
                { brokerId: auth.user.brokerId },
              ],
            }
          : { updatedById: auth.user.id }
      );
    } else {
      and.push({ status: "APPROVED" });
    }
  }

  if (q) {
    and.push({
      OR: [
        { marketLocation: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  try {
  const prices = await prisma.livestockPrice.findMany({
    where: { AND: and },
    include: {
      updatedBy: { select: { id: true, fullName: true, email: true } },
      broker: { select: { id: true, name: true } },
      market: { select: { id: true, name: true, location: true } },
      livestockType: { select: { id: true, name: true, nameSomali: true } },
      livestockCategory: { select: { id: true, name: true, slug: true } },
      approvedBy: { select: { id: true, fullName: true } },
      rejectedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const visible = prices.filter(
    (p) =>
      !isRetiredLivestockType(
        p.description,
        p.livestockType?.name,
        p.livestockType?.nameSomali
      )
  );

  return jsonOk({ prices: visible });
  } catch (err) {
    console.error("[livestock-prices GET]", err);
    return jsonError("Could not load prices", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const canAdd =
    isSuperAdmin(auth.user) ||
    isLivestockBroker(auth.user) ||
    checkPermission(auth.user, "ADD_LIVESTOCK_PRICE") ||
    checkPermission(auth.user, "ADD_MARKET_PRICE");
  if (!canAdd) return jsonError("Forbidden", 403);

  if (isLivestockBroker(auth.user)) {
    const sub = await requireActiveSubscription({ brokerId: auth.user.brokerId });
    if (!sub.ok) return jsonError(sub.reason, 402);
  }

  const body = await request.json().catch(() => null);
  let animalType = String(body?.animalType || "").toUpperCase() as AnimalType;
  if (!LIVESTOCK_TYPES.includes(animalType)) {
    return jsonError("Invalid livestock type. Use Camel, Cattle, or Goat.");
  }

  if (isLivestockBroker(auth.user) && auth.user.brokerId) {
    const { getBrokerScope } = await import("@/lib/livestock-scope");
    const scope = await getBrokerScope(auth.user.brokerId);
    if (scope && scope.categoryIds.length && !scope.usedFallback) {
      const allowedSpecies = new Set(scope.animalTypes.map((t) => t.legacyAnimalType));
      for (const category of scope.categories) allowedSpecies.add(category.species);
      if (!allowedSpecies.has(animalType)) {
        return jsonError("You are not authorized for this livestock category", 403);
      }
      if (body.marketId != null && !scope.marketIds.includes(Number(body.marketId))) {
        return jsonError("You are not assigned to this market", 403);
      }
    } else {
      const broker = await prisma.livestockBroker.findUnique({
        where: { id: auth.user.brokerId },
        select: { livestockFocus: true, name: true },
      });
      const { animalTypeFromLivestockSection } = await import(
        "@/lib/promote-broker"
      );
      const locked =
        animalTypeFromLivestockSection(broker?.livestockFocus) ||
        animalTypeFromLivestockSection(broker?.name);
      if (locked) animalType = locked;
    }
  }

  const price = Number(body?.price);
  if (!Number.isFinite(price) || price <= 0) return jsonError("Enter a price greater than 0");
  const cap = livestockPriceError(price);
  if (cap) return jsonError(cap);
  const marketLocation = String(body?.marketLocation || body?.location || "").trim();
  if (!marketLocation && body?.marketId == null) return jsonError("Market/location is required");

  const brokerId =
    auth.user.brokerId ??
    (body?.brokerId != null && body.brokerId !== ""
      ? Number(body.brokerId)
      : null);
  if (
    !isSuperAdmin(auth.user) &&
    (!brokerId || !Number.isFinite(brokerId) || brokerId <= 0)
  ) {
    return jsonError("Broker is required — select a livestock broker.");
  }
  if (brokerId && Number.isFinite(brokerId) && brokerId > 0) {
    const brokerExists = await prisma.livestockBroker.findFirst({
      where: { id: brokerId, deletedAt: null },
      select: { id: true },
    });
    if (!brokerExists) return jsonError("Selected broker was not found.", 404);
  }

  const savedBrokerId =
    brokerId && Number.isFinite(Number(brokerId)) && Number(brokerId) > 0
      ? Number(brokerId)
      : null;

  const links = await resolveLivestockPriceLinks({
    animalType,
    category: body?.category != null ? String(body.category) : null,
    description: body?.description != null ? String(body.description) : null,
    typeName: body?.typeName != null ? String(body.typeName) : null,
    season: body?.season != null ? String(body.season) : null,
    livestockTypeId: body?.livestockTypeId != null ? Number(body.livestockTypeId) : null,
    livestockCategoryId: body?.livestockCategoryId != null ? Number(body.livestockCategoryId) : null,
    marketId: body?.marketId != null ? Number(body.marketId) : null,
    marketLocation,
    brokerId: savedBrokerId,
  });
  if (!links.marketLocation) return jsonError("Market/location is required");
  if (
    isRetiredLivestockType(
      links.description,
      body?.typeName,
      body?.description
    )
  ) {
    return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
  }

  const latest = await findLatestLivestockPriceMatch({
    brokerId: savedBrokerId,
    updatedById: auth.user.id,
    category: links.category,
    livestockTypeId: links.livestockTypeId,
    marketId: links.marketId,
    description: links.description,
  });
  if (isUnchangedApprovedPrice(latest, price, links.description)) {
    return jsonError("Isku qiimo lama gelin karo. Dooro lacag ka duwan.");
  }

  const record =
    latest?.status === "PENDING" || latest?.status === "DRAFT"
      ? await prisma.livestockPrice.update({
          where: { id: latest.id },
          data: {
            animalType: links.animalType,
            category: links.category,
            livestockCategoryId: links.livestockCategoryId,
            livestockTypeId: links.livestockTypeId,
            marketLocation: links.marketLocation,
            marketId: links.marketId,
            brokerId: savedBrokerId,
            price,
            currency: String(body.currency || "USD"),
            description: links.description,
            dateRecorded: body.date ? new Date(body.date) : new Date(),
            updatedById: auth.user.id,
            status: "PENDING",
            rejectionReason: null,
          },
        })
      : await prisma.livestockPrice.create({
    data: {
      animalType: links.animalType,
      category: links.category,
      livestockCategoryId: links.livestockCategoryId,
      livestockTypeId: links.livestockTypeId,
      marketLocation: links.marketLocation,
      marketId: links.marketId,
      brokerId: savedBrokerId,
      price,
      currency: String(body.currency || "USD"),
      description: links.description,
      dateRecorded: body.date ? new Date(body.date) : new Date(),
      updatedById: auth.user.id,
      status: "PENDING",
    },
  });

  await notifyRole(["SUPER_ADMIN"], {
    title: "New livestock price submitted",
    message: `${auth.user.fullName} submitted ${links.animalType} price ${price} at ${links.marketLocation} for approval.`,
    type: "PRICE_SUBMITTED",
    sector: "livestock",
    senderId: auth.user.id,
  });

  return jsonOk({ price: record }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  const existing = await prisma.livestockPrice.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return jsonError("Price not found", 404);

  const action = body?.action as string | undefined;

  if (action === "approve" || action === "reject") {
    if (
      !checkPermission(auth.user, "APPROVE_LIVESTOCK_PRICE") &&
      !checkPermission(auth.user, "APPROVE_MARKET_PRICE")
    ) {
      return jsonError("Forbidden", 403);
    }

    if (existing.status === "APPROVED" && action === "approve") {
      return jsonOk({ price: existing, skipped: true });
    }
    if (action === "reject" && !String(body?.reason || "").trim()) {
      return jsonError("Rejection reason is required");
    }

    // Livestock price approve/reject: Super Admin only.
    if (!isSuperAdmin(auth.user)) {
      return jsonError(
        "Only Super Admin can approve livestock prices.",
        403
      );
    }

    const updated =
      action === "approve"
        ? await prisma.livestockPrice.update({
            where: { id },
            data: {
              status: "APPROVED",
              approvedById: auth.user.id,
              approvedAt: new Date(),
              rejectionReason: null,
              rejectedById: null,
              rejectedAt: null,
            },
          })
        : await prisma.livestockPrice.update({
            where: { id },
            data: {
              status: "REJECTED",
              rejectionReason: String(body.reason).trim(),
              rejectedById: auth.user.id,
              rejectedAt: new Date(),
            },
          });

    if (action === "approve") {
      await dismissDuplicatePendingLivestockPrices({
        keepId: id,
        brokerId: existing.brokerId,
        category: existing.category,
        marketId: existing.marketId,
      });
      await supersedeMatchingApprovedLivestockPrices({
        keepId: id,
        brokerId: existing.brokerId,
        category: existing.category,
        livestockTypeId: existing.livestockTypeId,
        description: existing.description,
        ageClass: existing.ageClass,
        originPlace: existing.originPlace,
      });
    }

    await prisma.priceApproval.create({
      data: {
        action: action === "approve" ? "APPROVE" : "REJECT",
        comment: action === "reject" ? String(body.reason).trim() : body.comment || null,
        reviewedById: auth.user.id,
        livestockPriceId: id,
      },
    });

    const typeLabel =
      existing.description?.trim() ||
      existing.category ||
      String(existing.animalType);
    const reason = String(body.reason || "").trim();
    let recipientIds = [existing.updatedById];
    if (existing.brokerId) {
      const brokerUsers = await prisma.user.findMany({
        where: { brokerId: existing.brokerId, deletedAt: null },
        select: { id: true },
      });
      recipientIds = brokerUsers.map((u) => u.id);
    }
    await notifyMany(recipientIds, {
      title: action === "approve" ? "Livestock price approved" : "Qiimaha waa la diiday",
      message:
        action === "approve"
          ? `${typeLabel} waa la aqbalay oo public ayaa laga arki karaa.`
          : `${typeLabel}: ${reason}. Tag Notifications, sax qiimaha, dib u gudbi.`,
      type: action === "approve" ? "PRICE_APPROVED" : "PRICE_REJECTED",
      sector: "livestock",
      senderId: auth.user.id,
    });

    revalidateLivestockPublic();
    return jsonOk({ price: updated });
  }

  // edit pending/rejected by owner (brokers may only have ADD, not EDIT)
  const canEdit =
    isSuperAdmin(auth.user) ||
    isLivestockBroker(auth.user) ||
    checkPermission(auth.user, "EDIT_LIVESTOCK_PRICE") ||
    checkPermission(auth.user, "EDIT_MARKET_PRICE") ||
    checkPermission(auth.user, "ADD_LIVESTOCK_PRICE");
  if (!canEdit) return jsonError("Forbidden", 403);

  const owns =
    existing.updatedById === auth.user.id ||
    Boolean(auth.user.brokerId && existing.brokerId === auth.user.brokerId);
  let sameBroker = owns;
  if (!sameBroker && auth.user.brokerId && existing.updatedById) {
    const author = await prisma.user.findUnique({
      where: { id: existing.updatedById },
      select: { brokerId: true },
    });
    sameBroker = author?.brokerId === auth.user.brokerId;
  }
  if (!isSuperAdmin(auth.user) && !sameBroker && existing.updatedById !== auth.user.id) {
    return jsonError("Forbidden", 403);
  }
  if (existing.status === "APPROVED") {
    if (isSuperAdmin(auth.user) || !isLivestockBroker(auth.user)) {
      return jsonError("Approved prices cannot be edited or sent back to the queue.");
    }
    const nextPrice =
      body.price != null ? Number(body.price) : Number(existing.price);
    const cap = livestockPriceError(nextPrice);
    if (cap) return jsonError(cap);
    if (!(nextPrice > 0)) return jsonError("Enter a price greater than 0");

    const links = await resolveLivestockPriceLinks({
      animalType:
        body.animalType != null ? String(body.animalType) : existing.animalType,
      category:
        body.category != null ? String(body.category) : existing.category,
      description:
        existing.description ||
        (body.description != null ? String(body.description) : null),
      typeName: body.typeName != null ? String(body.typeName) : null,
      season: body.season != null ? String(body.season) : null,
      livestockTypeId:
        body.livestockTypeId != null
          ? Number(body.livestockTypeId)
          : existing.livestockTypeId,
      livestockCategoryId:
        body.livestockCategoryId != null
          ? Number(body.livestockCategoryId)
          : existing.livestockCategoryId,
      marketId:
        body.marketId != null ? Number(body.marketId) : existing.marketId,
      marketLocation: String(
        body.marketLocation || body.location || existing.marketLocation
      ),
      brokerId: existing.brokerId,
    });

    if (isRetiredLivestockType(links.description, body?.typeName, existing.description)) {
      return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
    }

    if (existing.brokerId && isLivestockBroker(auth.user)) {
      const earlier = await prisma.livestockPrice.findMany({
        where: {
          deletedAt: null,
          brokerId: existing.brokerId,
          category: links.category,
          ...(links.livestockTypeId
            ? { livestockTypeId: links.livestockTypeId }
            : { description: links.description || existing.description || "" }),
          ...(links.marketId ? { marketId: links.marketId } : {}),
        },
        select: { id: true, price: true },
      });
      const used = earlier.some(
        (row) => row.id !== existing.id && Number(row.price) === nextPrice
      );
      const unchanged = Number(existing.price) === nextPrice;
      if (used || unchanged) {
        return jsonError(
          "Qiimahan hore ayaad gelisay. Markaad bedesho, mar kale lama celin karo."
        );
      }
    }

    const pendingMatch = await prisma.livestockPrice.findFirst({
      where: {
        deletedAt: null,
        status: "PENDING",
        brokerId: existing.brokerId,
        id: { not: existing.id },
        ...(existing.livestockTypeId
          ? { livestockTypeId: existing.livestockTypeId }
          : { description: existing.description }),
        category: links.category,
      },
      orderBy: { createdAt: "desc" },
    });

    const queued = pendingMatch
      ? await prisma.livestockPrice.update({
          where: { id: pendingMatch.id },
          data: {
            animalType: links.animalType,
            category: links.category,
            livestockCategoryId: links.livestockCategoryId,
            livestockTypeId: links.livestockTypeId,
            marketLocation: links.marketLocation,
            marketId: links.marketId,
            price: nextPrice,
            currency: String(body.currency || existing.currency || "USD"),
            description: links.description || existing.description,
            dateRecorded: body.date ? new Date(body.date) : new Date(),
            updatedById: auth.user.id,
            status: "PENDING",
            rejectionReason: null,
            ageClass:
              body.ageClass != null
                ? normalizeAgeClass(String(body.ageClass)) || null
                : existing.ageClass,
            originPlace: existing.originPlace,
          },
        })
      : await prisma.livestockPrice.create({
          data: {
            animalType: links.animalType,
            category: links.category,
            livestockCategoryId: links.livestockCategoryId,
            livestockTypeId: links.livestockTypeId,
            marketLocation: links.marketLocation,
            marketId: links.marketId,
            brokerId: existing.brokerId,
            price: nextPrice,
            currency: String(body.currency || existing.currency || "USD"),
            description: links.description || existing.description,
            dateRecorded: body.date ? new Date(body.date) : new Date(),
            updatedById: auth.user.id,
            status: "PENDING",
            ageClass:
              body.ageClass != null
                ? normalizeAgeClass(String(body.ageClass)) || null
                : existing.ageClass,
            originPlace: existing.originPlace,
          },
        });

    await notifyRole(["SUPER_ADMIN"], {
      title: "Livestock price edit submitted",
      message: `${auth.user.fullName} edited a live price and sent it for approval.`,
      type: "PRICE_SUBMITTED",
      sector: "livestock",
      senderId: auth.user.id,
    });
    return jsonOk({ price: queued, queued: true });
  }

  const links = await resolveLivestockPriceLinks({
    animalType: body.animalType != null ? String(body.animalType) : existing.animalType,
    category: body.category != null ? String(body.category) : existing.category,
    description: body.description != null ? String(body.description) : existing.description,
    typeName: body.typeName != null ? String(body.typeName) : null,
    season: body.season != null ? String(body.season) : null,
    livestockTypeId:
      body.livestockTypeId != null ? Number(body.livestockTypeId) : existing.livestockTypeId,
    livestockCategoryId:
      body.livestockCategoryId != null
        ? Number(body.livestockCategoryId)
        : existing.livestockCategoryId,
    marketId: body.marketId != null ? Number(body.marketId) : existing.marketId,
    marketLocation: String(body.marketLocation || body.location || existing.marketLocation),
    brokerId: existing.brokerId,
  });

  if (isRetiredLivestockType(links.description, body?.typeName, existing.description)) {
    return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
  }

  if (body.price != null) {
    const nextPrice = Number(body.price);
    const cap = livestockPriceError(nextPrice);
    if (cap) return jsonError(cap);
    if (existing.brokerId && isLivestockBroker(auth.user)) {
      const earlier = await prisma.livestockPrice.findMany({
        where: {
          deletedAt: null,
          brokerId: existing.brokerId,
          category: links.category,
          ...(links.livestockTypeId
            ? { livestockTypeId: links.livestockTypeId }
            : { description: links.description || existing.description || "" }),
          ...(links.marketId ? { marketId: links.marketId } : {}),
        },
        select: { id: true, price: true },
      });
      const used = earlier.some(
        (row) => row.id !== existing.id && Number(row.price) === nextPrice
      );
      if (used || Number(existing.price) === nextPrice) {
        return jsonError(
          "Qiimahan hore ayaad gelisay. Markaad bedesho, mar kale lama celin karo."
        );
      }
    }
  }

  const updated = await prisma.livestockPrice.update({
    where: { id },
    data: {
      animalType: links.animalType,
      category: links.category,
      livestockCategoryId: links.livestockCategoryId,
      livestockTypeId: links.livestockTypeId,
      marketLocation: links.marketLocation,
      marketId: links.marketId,
      ...(body.price != null ? { price: Number(body.price) } : {}),
      ...(body.currency != null ? { currency: String(body.currency) } : {}),
      description: links.description,
      ...(body.date != null ? { dateRecorded: new Date(body.date) } : {}),
      status: "PENDING",
      rejectionReason: null,
      ...(body.ageClass != null
        ? { ageClass: normalizeAgeClass(String(body.ageClass)) || null }
        : {}),
    },
  });

  return jsonOk({ price: updated });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  const existing = await prisma.livestockPrice.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return jsonError("Not found", 404);

  const owns =
    existing.updatedById === auth.user.id ||
    (auth.user.brokerId && existing.brokerId === auth.user.brokerId);
  if (!isSuperAdmin(auth.user) && !owns) return jsonError("Forbidden", 403);

  await prisma.priceApproval.deleteMany({ where: { livestockPriceId: id } });
  await prisma.livestockPrice.delete({ where: { id } });

  revalidateLivestockPublic();
  return jsonOk({ ok: true });
}
