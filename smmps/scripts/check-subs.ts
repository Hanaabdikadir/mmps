import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const text = readFileSync(resolve(__dirname, "../.env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    process.env.DATABASE_URL = value;
  }
}
loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    orderBy: { updatedAt: "desc" },
    take: 8,
    include: {
      plan: true,
      company: { select: { id: true, name: true, slug: true, profileData: true } },
    },
  });
  for (const s of subs) {
    const profile = s.company?.profileData as { yearlyRateHistory?: Record<string, number> } | null;
    console.log(JSON.stringify({
      id: s.id,
      company: s.company?.slug,
      name: s.company?.name,
      status: s.status,
      start: s.startDate.toISOString(),
      end: s.expiryDate.toISOString(),
      plan: s.plan.name,
      price: s.plan.price.toString(),
      days: s.plan.durationDays,
      history: profile?.yearlyRateHistory ?? null,
    }));
  }
  const company = await prisma.company.findFirst({ where: { slug: "al-casaa" }, select: { id: true } });
  const linked = await prisma.user.findMany({
    where: { companySlug: "al-casaa" },
    select: { id: true, email: true, companyId: true, companySlug: true },
  });
  const users = await prisma.user.findMany({
    where: { companySlug: "al-casaa" },
    select: { email: true, companyId: true, registrationDocuments: true },
  });
  console.log("COMPANY", company?.id, "LINKED", JSON.stringify(linked));
  if (company?.id) {
    const updated = await prisma.user.updateMany({
      where: { companySlug: "al-casaa", companyId: null },
      data: { companyId: company.id },
    });
    console.log("LINKED_NOW", updated.count);
  }
  for (const u of users) {
    console.log("USER", u.email, u.companyId, String(u.registrationDocuments).slice(0, 400));
  }
}

main().finally(() => prisma.$disconnect());
