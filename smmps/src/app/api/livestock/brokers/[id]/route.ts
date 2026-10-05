import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { isLivestockBroker } from "@/lib/auth";
import { ensureLivestockCatalog, ensureBrokerCode } from "@/lib/livestock-catalog";
import { BROKER_DETAIL_INCLUDE, serializeBroker } from "@/lib/livestock-assignments";
import { roleHasPermission } from "@/lib/rbac-db";
import {
  brokerTypePriceBoard,
  categorySlugFromBroker,
  overlayCatalogTypeBoard,
  typeNamedFields,
  animalTypesFromCategory,
  livestockEditorGroupKey,
  pickLatestEditorRows,
} from "@/lib/livestock-section-prices";
import type { LivestockCategorySlug } from "@/lib/livestock-data";
import { isLivestockCategorySlug } from "@/lib/livestock-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    await ensureLivestockCatalog();

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!id) return jsonError("Invalid broker id");

    const canManage = await roleHasPermission(
      auth.user.role,
      "MANAGE_LIVESTOCK_BROKERS"
    );

    if (!canManage) {
      if (!isLivestockBroker(auth.user) || auth.user.brokerId !== id) {
        return jsonError("Forbidden", 403);
      }
    }

    const broker = await prisma.livestockBroker.findFirst({
      where: { id, deletedAt: null },
      include: BROKER_DETAIL_INCLUDE,
    });
    if (!broker) return jsonError("Broker not found", 404);

    if (!broker.code) await ensureBrokerCode(broker.id);

    const view = new URL(request.url).searchParams.get("view");
    if (view === "profile") {
      return jsonOk({ broker: serializeBroker(broker) });
    }

    const recentPrices = await prisma.livestockPrice.findMany({
      where: { brokerId: id, deletedAt: null },
      include: {
        market: { select: { id: true, name: true } },
        livestockCategory: { select: { id: true, name: true } },
        livestockType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    const fromCatalog = broker.authorizedCategories
      .map((row) => row.category.slug)
      .find((slug): slug is LivestockCategorySlug =>
        isLivestockCategorySlug(slug)
      );
    const slug: LivestockCategorySlug =
      fromCatalog ||
      categorySlugFromBroker({
        livestockFocus: broker.livestockFocus,
        name: broker.name,
      });

    const liveRows = await prisma.livestockPrice.findMany({
      where: {
        deletedAt: null,
        status: "APPROVED",
        brokerId: id,
        animalType: { in: animalTypesFromCategory(slug) },
      },
      include: {
        livestockType: { select: { name: true, nameSomali: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const latestLive = pickLatestEditorRows(liveRows, livestockEditorGroupKey);
    const liveFields = typeNamedFields(
      latestLive.map((p) => ({
        category: p.category,
        description: p.description,
        price: Number(p.price),
        livestockTypeName:
          p.livestockType?.nameSomali || p.livestockType?.name || null,
      }))
    );

    return jsonOk({
      broker: serializeBroker(broker),
      categorySlug: slug,
      typeBoard:
        liveFields.length > 0
          ? overlayCatalogTypeBoard(slug, liveFields, "birimo")
          : brokerTypePriceBoard(slug),
      recentPrices: recentPrices.map((p) => ({
        id: p.id,
        price: Number(p.price),
        currency: p.currency,
        unit: p.unit,
        status: p.status,
        dateRecorded: p.dateRecorded,
        createdAt: p.createdAt,
        market: p.market,
        category: p.livestockCategory,
        animalType: p.livestockType,
        fallbackCategory: p.category,
        animalTypeEnum: p.animalType,
        description: p.description,
      })),
    });
  } catch (error) {
    console.error("[api/livestock/brokers/[id] GET]", error);
    return jsonError("Could not load broker", 500);
  }
}
