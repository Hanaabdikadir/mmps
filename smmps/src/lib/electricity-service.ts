import { prisma } from "./prisma";
import { DB_TIMEOUT_MS } from "./db-timeout";
import type { ElectricityPriceRecord } from "./market-price-types";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timed out")), ms)
    ),
  ]);
}

export async function getElectricityPrices(
  serviceType?: string,
  options?: { approvedOnly?: boolean; take?: number }
): Promise<{ records: ElectricityPriceRecord[]; fromDatabase: boolean }> {
  try {
    const approvedOnly = options?.approvedOnly !== false;
    const prices = await withTimeout(
      prisma.electricityPrice.findMany({
        where: {
          ...(serviceType && {
            serviceType: serviceType as ElectricityPriceRecord["serviceType"],
          }),
          ...(approvedOnly ? { status: "APPROVED" } : {}),
        },
        orderBy: { dateRecorded: "desc" },
        take: options?.take ?? 200,
      }),
      DB_TIMEOUT_MS
    );

    return {
      fromDatabase: true,
      records: prices.map((p) => ({
        id: p.id,
        providerName: p.providerName,
        serviceType: p.serviceType,
        location: p.location,
        pricePerKwh: Number(p.pricePerKwh),
        dateRecorded: p.dateRecorded,
      })),
    };
  } catch {
    return { fromDatabase: false, records: [] };
  }
}
