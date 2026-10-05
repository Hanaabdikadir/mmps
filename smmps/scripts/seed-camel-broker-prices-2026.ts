/**
 * Seed camel (geel) Birimo + Sugunto prices:
 * Birimo: Awr ~1125 · Hal ~1325 · Qurbac ~425 · Qalin ~575 · Baarqab ~2150
 * Sugunto: Labka ~$1,200 · Dhedig/young ~$800
 * 4 listings per type per season per broker. Dates: 2 Jan → 26 Sep 2026.
 *
 * Run: npx tsx scripts/seed-camel-broker-prices-2026.ts
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const START = new Date(Date.UTC(2026, 0, 2, 10, 0, 0));
const END = new Date(Date.UTC(2026, 8, 26, 10, 0, 0));

const TYPE_BASE_BIRIMO: Record<string, number> = {
  awr: 1125,
  hal: 1325,
  qurbac: 425,
  qalin: 575,
  baarqab: 2150,
};

/** Sugunto = same listing’s Birimo minus $50. */
const SUGUNTO_UNDER_BIRIMO = 50;

const TYPE_SLUGS = ["awr", "hal", "qurbac", "qalin", "baarqab"] as const;
const SEASONS = ["birimo", "sugunto"] as const;

const ORIGINS = ["Gedo", "Bay", "Bakool", "Hiiraan"] as const;
const AGES = ["1jir", "1.5jir", "2jir", "3jir"] as const;

const ORIGIN_DELTA: Record<(typeof ORIGINS)[number], number> = {
  Gedo: 40,
  Bay: 10,
  Bakool: 25,
  Hiiraan: -15,
};

const AGE_DELTA: Record<(typeof AGES)[number], number> = {
  "1jir": -30,
  "1.5jir": -10,
  "2jir": 15,
  "3jir": 35,
};

const BROKER_PLANS: Array<{
  match: (focus: string) => boolean;
  rotate: number;
  offset: number;
}> = [
  {
    match: (f) => f.includes("camel") && !f.includes("cattle") && !f.includes("goat"),
    rotate: 0,
    offset: 0,
  },
  {
    match: (f) => f.includes("camel") && f.includes("cattle") && f.includes("goat"),
    rotate: 1,
    offset: -40,
  },
  {
    match: (f) => f.includes("camel") && f.includes("cattle") && !f.includes("goat"),
    rotate: 2,
    offset: 50,
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function spreadDates(count: number): Date[] {
  if (count <= 0) return [];
  if (count === 1) return [new Date(END)];
  const span = END.getTime() - START.getTime();
  return Array.from({ length: count }, (_, i) => {
    const t = START.getTime() + Math.round((span * i) / (count - 1));
    return new Date(t);
  });
}

function isCamelBroker(focus: string | null | undefined): boolean {
  const f = String(focus || "").toLowerCase();
  return f.includes("camel") || f.includes("geel");
}

function planForBroker(focus: string, index: number) {
  const hit = BROKER_PLANS.find((p) => p.match(focus.toLowerCase()));
  if (hit) return hit;
  return { rotate: index % 4, offset: (index % 5) * 20 - 40 };
}

function listingsFor(rotate: number): Array<{ origin: string; age: string }> {
  return ORIGINS.map((origin, i) => ({
    origin,
    age: AGES[(i + rotate) % AGES.length]!,
  }));
}

async function main() {
  const geel = await prisma.livestockCategory.findFirst({
    where: { slug: "geel", status: "ACTIVE" },
    include: {
      animalTypes: {
        where: { status: "ACTIVE", slug: { in: [...TYPE_SLUGS] } },
        select: { id: true, slug: true, name: true, nameSomali: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!geel) throw new Error("Active geel category not found");

  const typeBySlug = new Map<string, (typeof geel.animalTypes)[number]>();
  for (const t of geel.animalTypes) {
    if (!typeBySlug.has(t.slug)) typeBySlug.set(t.slug, t);
  }
  for (const slug of TYPE_SLUGS) {
    if (!typeBySlug.has(slug)) throw new Error(`Missing camel animal type: ${slug}`);
  }

  const brokers = (
    await prisma.livestockBroker.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      include: {
        market: { select: { id: true, name: true } },
        users: {
          where: { deletedAt: null },
          select: { id: true, email: true },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
    })
  ).filter((b) => isCamelBroker(b.livestockFocus));

  if (!brokers.length) throw new Error("No active camel brokers found");

  const approver =
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", deletedAt: null },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    }));
  if (!approver) throw new Error("No approver user found");

  const brokerIds = brokers.map((b) => b.id);
  const deleted = await prisma.livestockPrice.deleteMany({
    where: { animalType: "CAMEL", brokerId: { in: brokerIds } },
  });

  const perBroker = TYPE_SLUGS.length * ORIGINS.length * SEASONS.length;
  const dates = spreadDates(Math.max(perBroker * brokers.length, 4));

  const rows: Prisma.LivestockPriceCreateManyInput[] = [];
  let dateIndex = 0;
  const summary: Array<{
    brokerId: number;
    name: string;
    offset: number;
    counts: Record<string, number>;
  }> = [];

  brokers.forEach((broker, bi) => {
    const userId = broker.users[0]?.id ?? approver.id;
    const marketId = broker.marketId ?? broker.market?.id ?? null;
    const marketLocation =
      broker.market?.name?.trim() ||
      broker.location?.trim() ||
      "Banadir Livestock Market";
    const plan = planForBroker(broker.livestockFocus || "", bi);
    const listings = listingsFor(plan.rotate);
    const counts: Record<string, number> = {};

    for (const slug of TYPE_SLUGS) {
      const typeRow = typeBySlug.get(slug)!;
      const base = TYPE_BASE_BIRIMO[slug]!;
      const seen = new Set<string>();
      let nBirimo = 0;
      let nSugunto = 0;

      for (const listing of listings) {
        const uniq = `${slug}|${listing.age}|${listing.origin}`.toLowerCase();
        if (seen.has(uniq)) continue;
        seen.add(uniq);

        const birimo = clamp(
          base +
            plan.offset +
            (ORIGIN_DELTA[listing.origin as (typeof ORIGINS)[number]] ?? 0) +
            AGE_DELTA[listing.age as (typeof AGES)[number]],
          300,
          2700
        );
        const sugunto = Math.max(1, birimo - SUGUNTO_UNDER_BIRIMO);

        for (const season of SEASONS) {
          const price = season === "birimo" ? birimo : sugunto;
          const date = dates[dateIndex % dates.length]!;
          dateIndex += 1;
          if (season === "birimo") nBirimo += 1;
          else nSugunto += 1;

          rows.push({
            animalType: "CAMEL",
            category: `FIELD_${season.toUpperCase()}_${slug.toUpperCase()}`,
            livestockCategoryId: geel.id,
            livestockTypeId: typeRow.id,
            marketLocation,
            marketId,
            brokerId: broker.id,
            price: new Prisma.Decimal(price.toFixed(2)),
            currency: "USD",
            unit: "head",
            description: typeRow.nameSomali || typeRow.name || slug,
            dateRecorded: date,
            updatedById: userId,
            status: "APPROVED",
            approvedById: approver.id,
            approvedAt: date,
            ageClass: listing.age,
            originPlace: listing.origin,
          });
        }
      }
      counts[`birimo_${slug}`] = nBirimo;
      counts[`sugunto_${slug}`] = nSugunto;
    }

    summary.push({
      brokerId: broker.id,
      name: broker.name,
      offset: plan.offset,
      counts,
    });
  });

  let created = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const res = await prisma.livestockPrice.createMany({
      data: rows.slice(i, i + 200),
    });
    created += res.count;
  }

  console.log(
    JSON.stringify(
      {
        rule: "Geel Birimo + Sugunto (Sugunto = Birimo − $50)",
        birimo: TYPE_BASE_BIRIMO,
        suguntoUnderBirimo: SUGUNTO_UNDER_BIRIMO,
        deletedPrior: deleted.count,
        created,
        perBroker,
        brokers: summary,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
