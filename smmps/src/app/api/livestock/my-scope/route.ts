import { prisma } from "@/lib/prisma";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-guard";
import { isLivestockBroker } from "@/lib/auth";
import { ensureLivestockCatalog, backfillLivestockAssignments } from "@/lib/livestock-catalog";
import { getBrokerScope } from "@/lib/livestock-scope";
import { adminMarketImageUrl } from "@/lib/market-logo-url";

async function reportBrandForUser(user: {
  id: number;
  fullName: string;
  brokerId?: number | null;
}) {
  const me = await prisma.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: {
      fullName: true,
      companyName: true,
      profilePicture: true,
      companyLogoFileName: true,
    },
  });
  let brokerName: string | null = null;
  let brokerPhoto: string | null = null;
  let marketLogo: string | null = null;
  let brokerAddress: string | null = null;
  if (user.brokerId) {
    const broker = await prisma.livestockBroker.findFirst({
      where: { id: user.brokerId, deletedAt: null },
      select: {
        name: true,
        location: true,
        profilePicture: true,
        market: { select: { name: true, logoFileName: true, location: true } },
        assignedMarkets: {
          include: {
            market: { select: { name: true, logoFileName: true, deletedAt: true } },
          },
        },
      },
    });
    brokerName = broker?.name?.trim() || broker?.market?.name?.trim() || null;
    brokerAddress = broker?.location?.trim() || broker?.market?.location?.trim() || null;
    brokerPhoto = broker?.profilePicture?.trim() || null;
    marketLogo =
      broker?.market?.logoFileName?.trim() ||
      broker?.assignedMarkets.find((row) => row.market && !row.market.deletedAt)
        ?.market?.logoFileName?.trim() ||
      null;
  }
  const file =
    brokerPhoto ||
    me?.profilePicture?.trim() ||
    me?.companyLogoFileName?.trim() ||
    marketLogo ||
    null;
  return {
    name:
      brokerName ||
      me?.companyName?.trim() ||
      me?.fullName?.trim() ||
      user.fullName,
    logoUrl: file ? adminMarketImageUrl(file, "") || null : null,
    address: brokerAddress,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureLivestockCatalog();
  await backfillLivestockAssignments();

  if (!isLivestockBroker(auth.user) || !auth.user.brokerId) {
    return jsonError("Broker profile required", 403);
  }

  const [scope, brand] = await Promise.all([
    getBrokerScope(auth.user.brokerId),
    reportBrandForUser(auth.user),
  ]);
  if (!scope) return jsonError("Broker profile not found", 404);

  return jsonOk({
    scope,
    reportBrand: brand,
    account: {
      email: auth.user.email,
      fullName: auth.user.fullName,
    },
  });
}
