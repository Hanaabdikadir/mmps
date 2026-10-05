import { prisma } from "./prisma";
import { DB_TIMEOUT_MS } from "./db-timeout";
import type { LivestockPriceRecord } from "./livestock-fallback";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timed out")), ms)
    ),
  ]);
}

export async function getLivestockPrices(
  animalType?: string
): Promise<{ records: LivestockPriceRecord[]; fromDatabase: boolean }> {
  try {
    const prices = await withTimeout(
      prisma.livestockPrice.findMany({
        where: {
          deletedAt: null,
          status: "APPROVED",
          ...(animalType && {
            animalType: animalType as
              | "CAMEL"
              | "CATTLE"
              | "GOAT"
              | "SHEEP"
              | "POULTRY",
          }),
        },
        orderBy: { dateRecorded: "desc" },
        take: 200,
      }),
      DB_TIMEOUT_MS
    );

    return {
      fromDatabase: true,
      records: prices.map((p) => ({
        id: p.id,
        animalType: p.animalType,
        price: Number(p.price),
        dateRecorded: p.dateRecorded,
      })),
    };
  } catch {
    return { fromDatabase: false, records: [] };
  }
}
