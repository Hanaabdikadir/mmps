import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogoRow = { id: number; logo_file_name: string | null };

export async function getMarketLogoMap(ids: number[]): Promise<Map<number, string | null>> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  const map = new Map<number, string | null>();
  if (!unique.length) return map;
  const rows = await prisma.$queryRaw<LogoRow[]>(
    Prisma.sql`SELECT id, logo_file_name FROM markets WHERE id IN (${Prisma.join(unique)})`
  );
  for (const row of rows) {
    map.set(Number(row.id), row.logo_file_name);
  }
  return map;
}

export async function setMarketLogoFileName(id: number, fileName: string) {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE markets SET logo_file_name = ${fileName} WHERE id = ${id}`
  );
}

export function withLogo<T extends { id: number }>(
  row: T,
  logos: Map<number, string | null>
): T & { logoFileName: string | null } {
  return { ...row, logoFileName: logos.get(row.id) ?? null };
}
