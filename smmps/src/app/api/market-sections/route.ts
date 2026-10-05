import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import type { AccountStatus } from "@prisma/client";
import { shouldRenameMarketSection, isDeliveredWaterSection } from "@/lib/market-section-labels";

export async function GET(request: Request) {
  const auth = await requirePermission("MANAGE_MARKET_SECTIONS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");
  const q = searchParams.get("q")?.trim();

  const sections = await prisma.marketSection.findMany({
    where: {
      deletedAt: null,
      ...(marketId ? { marketId: Number(marketId) } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { market: { select: { id: true, name: true, marketType: true } } },
    orderBy: { createdAt: "desc" },
  });

  const visible = [];
  for (const row of sections) {
    if (isDeliveredWaterSection(row.name, row.market.marketType)) {
      await prisma.marketSection.update({
        where: { id: row.id },
        data: { deletedAt: new Date(), status: "INACTIVE" },
      });
      continue;
    }
    const next = shouldRenameMarketSection(row.name, row.market.marketType);
    if (next) {
      await prisma.marketSection.update({
        where: { id: row.id },
        data: { name: next },
      });
      row.name = next;
    }
    visible.push(row);
  }

  return jsonOk({ sections: visible });
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_MARKET_SECTIONS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const marketId = Number(body?.marketId);
  const name = String(body?.name || "").trim();
  if (!marketId || !name) return jsonError("marketId and name are required");

  const market = await prisma.market.findFirst({ where: { id: marketId, deletedAt: null } });
  if (!market) return jsonError("Market not found", 404);

  if (isDeliveredWaterSection(name, market.marketType)) {
    return jsonError("Water sections are household and commercial only — not tanker delivery", 400);
  }

  const section = await prisma.marketSection.create({
    data: {
      marketId,
      name,
      description: body.description ? String(body.description) : null,
      status: (body.status as AccountStatus) || "ACTIVE",
    },
  });

  return jsonOk({ section }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_MARKET_SECTIONS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");

  const existing = await prisma.marketSection.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return jsonError("Section not found", 404);

  const nextName =
    body.name != null ? String(body.name).trim() : existing.name;
  const nextMarketId =
    body.marketId != null ? Number(body.marketId) : existing.marketId;
  const nextMarket = await prisma.market.findFirst({
    where: { id: nextMarketId, deletedAt: null },
    select: { marketType: true },
  });
  if (
    nextMarket &&
    isDeliveredWaterSection(nextName, nextMarket.marketType)
  ) {
    return jsonError(
      "Water sections are household and commercial only — not tanker delivery",
      400
    );
  }

  const section = await prisma.marketSection.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.description != null ? { description: String(body.description) } : {}),
      ...(body.status != null ? { status: body.status as AccountStatus } : {}),
      ...(body.marketId != null ? { marketId: Number(body.marketId) } : {}),
    },
  });

  return jsonOk({ section });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_MARKET_SECTIONS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  await prisma.marketSection.update({
    where: { id },
    data: { companies: { set: [] } },
  });
  await prisma.marketPrice.updateMany({
    where: { sectionId: id },
    data: { sectionId: null },
  });
  await prisma.marketSection.delete({ where: { id } });

  return jsonOk({ ok: true });
}
