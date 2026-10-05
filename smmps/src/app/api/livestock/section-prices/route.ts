import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api-guard";
import {
  animalTypesFromCategory,
  categorySlugFromAnimal,
  hiddenTypeKeysFromDeletedRows,
  mapPublicBoardPriceRows,
  overlaySectionPrices,
  typeNamedFields,
} from "@/lib/livestock-section-prices";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugParam = (searchParams.get("slug") || "").trim().toLowerCase();
  const animalParam = searchParams.get("animalType") || "CATTLE";
  const slug = slugParam || categorySlugFromAnimal(animalParam);
  const animalTypes = animalTypesFromCategory(slug);

  const marketId = Number(searchParams.get("marketId") || "");
  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      status: "APPROVED",
      price: { gt: 0 },
      ...(Number.isFinite(marketId) && marketId > 0 ? { marketId } : {}),
      OR: [
        { animalType: { in: animalTypes } },
        { livestockCategory: { slug } },
        { livestockType: { category: { slug } } },
      ],
      AND: [
        {
          OR: [
            { brokerId: null },
            { broker: { is: { deletedAt: null, status: "ACTIVE" } } },
          ],
        },
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
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const mapped = mapPublicBoardPriceRows(rows);

  const hiddenRows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: { not: null },
      animalType: { in: animalTypes },
    },
    select: { category: true, description: true },
    take: 400,
  });
  const fields = typeNamedFields(mapped);
  const hiddenNames = hiddenTypeKeysFromDeletedRows(hiddenRows, fields);

  return jsonOk({
    slug,
    animalType: animalTypes[0],
    prices: overlaySectionPrices(slug as "geel" | "loda" | "arri", mapped),
    fields,
    hiddenNames,
  });
}
