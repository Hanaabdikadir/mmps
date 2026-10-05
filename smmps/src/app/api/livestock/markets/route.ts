import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { checkPermission, isLivestockBroker, isSuperAdmin } from "@/lib/auth";
import { ensureLivestockCatalog, ensureMarketCode, formatMarketCode } from "@/lib/livestock-catalog";
import { SECTION_BROKER_EMAILS } from "@/lib/livestock-manager-broker";
import { revalidateLivestockPublic } from "@/lib/livestock-price-persist";
import type { AccountStatus } from "@prisma/client";

const MARKET_INCLUDE = {
  livestockCategories: {
    include: {
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameSomali: true,
          animalTypes: {
            where: { status: "ACTIVE" },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, nameSomali: true, slug: true },
          },
        },
      },
    },
  },
  livestockBrokerLinks: {
    where: { broker: { deletedAt: null } },
    include: {
      broker: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          code: true,
          status: true,
          profilePicture: true,
          users: {
            where: { deletedAt: null },
            select: {
              fullName: true,
              email: true,
              phone: true,
              profilePicture: true,
            },
            take: 8,
          },
        },
      },
    },
  },
  _count: {
    select: {
      livestockPrices: true,
      brokers: true,
    },
  },
} as const;

function isPlaceholderMarketName(name?: string | null) {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    n === "livestock market" ||
    n === "banadir livestock market" ||
    n === "mogadishu livestock market"
  );
}

function isSectionLeadEmail(email?: string | null) {
  return (SECTION_BROKER_EMAILS as readonly string[]).includes(
    (email || "").trim().toLowerCase()
  );
}

type LinkedBroker = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  profilePicture?: string | null;
  users?: {
    fullName: string;
    email: string;
    phone?: string | null;
    profilePicture?: string | null;
  }[];
};

function serializeAssignedBroker(broker: LinkedBroker) {
  const person =
    (broker.users || []).find((user) => !isSectionLeadEmail(user.email) && user.fullName.trim()) ||
    (broker.users || [])[0];
  const name = (
    person?.fullName.trim() ||
    String(broker.name || "").replace(/\s*[—–-]\s*.*market section.*$/i, "").trim() ||
    broker.name
  );
  return {
    id: broker.id,
    name,
    email: person?.email || broker.email || null,
    phone: person?.phone || broker.phone || null,
    status: broker.status,
    profilePicture: person?.profilePicture || broker.profilePicture || null,
  };
}

function serializeMarket<
  T extends {
    name?: string | null;
    livestockCategories?: { category: unknown }[];
    livestockBrokerLinks?: { broker: LinkedBroker }[];
  },
>(market: T) {
  return {
    ...market,
    categories: market.livestockCategories?.map((row) => row.category) ?? [],
    assignedBrokers: market.livestockBrokerLinks?.map((row) => serializeAssignedBroker(row.broker)) ?? [],
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const canRead =
    isSuperAdmin(auth.user) ||
    isLivestockBroker(auth.user) ||
    checkPermission(auth.user, "MANAGE_MARKETS") ||
    checkPermission(auth.user, "ADD_LIVESTOCK_PRICE") ||
    checkPermission(auth.user, "MANAGE_LIVESTOCK_BROKERS");
  if (!canRead) return jsonError("Forbidden", 403);

  try {
    await ensureLivestockCatalog();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status") as AccountStatus | null;

    const markets = await prisma.market.findMany({
      where: {
        deletedAt: null,
        marketType: "LIVESTOCK",
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { location: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: MARKET_INCLUDE,
      orderBy: { name: "asc" },
    });

    for (const market of markets) {
      if (!market.code) await ensureMarketCode(market.id);
    }

    return jsonOk({
      markets: markets
        .map((m) => serializeMarket(m))
        .filter((m) => !isPlaceholderMarketName(m.name)),
    });
  } catch (error) {
    console.error("[api/livestock/markets GET]", error);
    return jsonError("Could not load livestock markets", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("Market name is required");

  const market = await prisma.market.create({
    data: {
      name: String(body.name).trim(),
      location: body.location ? String(body.location).trim() : null,
      description: body.description ? String(body.description) : null,
      marketType: "LIVESTOCK",
      status: (body.status as AccountStatus) || "ACTIVE",
    },
  });

  await prisma.market.update({
    where: { id: market.id },
    data: { code: body.code ? String(body.code).trim() : formatMarketCode(market.id) },
  });

  const fresh = await prisma.market.findUnique({
    where: { id: market.id },
    include: MARKET_INCLUDE,
  });

  revalidateLivestockPublic();
  return jsonOk({ market: fresh ? serializeMarket(fresh) : market }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("Market id is required");

  const existing = await prisma.market.findFirst({
    where: { id, deletedAt: null, marketType: "LIVESTOCK" },
  });
  if (!existing) return jsonError("Livestock market not found", 404);

  const market = await prisma.market.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.location !== undefined
        ? { location: body.location ? String(body.location).trim() : null }
        : {}),
      ...(body.description != null ? { description: String(body.description) } : {}),
      ...(body.status != null ? { status: body.status as AccountStatus } : {}),
      ...(body.code != null ? { code: String(body.code).trim() || existing.code } : {}),
    },
  });

  const fresh = await prisma.market.findUnique({
    where: { id },
    include: MARKET_INCLUDE,
  });

  revalidateLivestockPublic();
  return jsonOk({ market: fresh ? serializeMarket(fresh) : market });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("Market id is required");

  const existing = await prisma.market.findFirst({
    where: { id, deletedAt: null, marketType: "LIVESTOCK" },
  });
  if (!existing) return jsonError("Livestock market not found", 404);

  await prisma.market.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  revalidateLivestockPublic();
  return jsonOk({ ok: true });
}
