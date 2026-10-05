import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Fail fast when PostgreSQL is unavailable so requests do not hang. */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (/connect_timeout=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connect_timeout=5&pool_timeout=5`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: databaseUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
