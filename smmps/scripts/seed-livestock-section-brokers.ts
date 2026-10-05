/**
 * Create three livestock section brokers (Camel, Cattle, Goat) + admin users.
 * Soft-retires the old multi-focus Banadir broker row if present.
 * Run: npx tsx scripts/seed-livestock-section-brokers.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "broker123";

const SECTIONS = [
  {
    section: "Camel Market Section",
    name: "Camel",
    heroTitle: "Geelka",
    email: "camel@livestock.so",
    fullName: "Camel",
    phone: "+252 61 700 1001",
    focus: "Camel Market Section",
  },
  {
    section: "Cattle Market Section",
    name: "Cattle",
    heroTitle: "Loda",
    email: "cattle@livestock.so",
    fullName: "Cattle",
    phone: "+252 61 700 1002",
    focus: "Cattle Market Section",
  },
  {
    section: "Goat Market Section",
    name: "Goat",
    heroTitle: "Arriga",
    email: "goat@livestock.so",
    fullName: "Goat",
    phone: "+252 61 700 1003",
    focus: "Goat Market Section",
  },
] as const;

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  const market =
    (await prisma.market.findFirst({
      where: { deletedAt: null, marketType: "LIVESTOCK" },
      orderBy: { id: "asc" },
    })) ||
    (await prisma.market.create({
      data: {
        name: "Banadir Livestock Market",
        location: "Mogadishu",
        marketType: "LIVESTOCK",
        status: "ACTIVE",
      },
    }));

  // Soft-retire legacy combined multi-focus broker rows (not the manager login)
  const legacy = await prisma.livestockBroker.findMany({
    where: {
      deletedAt: null,
      OR: [
        { livestockFocus: { contains: "," } },
        {
          AND: [
            { name: { contains: "Banadir Livestock", mode: "insensitive" } },
            { livestockFocus: { contains: "CAMEL", mode: "insensitive" } },
            { livestockFocus: { contains: "CATTLE", mode: "insensitive" } },
          ],
        },
      ],
    },
  });

  for (const row of legacy) {
    await prisma.livestockBroker.update({
      where: { id: row.id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
    console.log(`Retired legacy broker #${row.id} ${row.name}`);
  }

  for (const s of SECTIONS) {
    let broker = await prisma.livestockBroker.findFirst({
      where: { email: s.email },
    });

    if (broker) {
      broker = await prisma.livestockBroker.update({
        where: { id: broker.id },
        data: {
          name: s.name,
          heroTitle: s.heroTitle,
          phone: s.phone,
          location: "Mogadishu, Banadir, Somalia",
          livestockFocus: s.focus,
          description: null,
          marketId: market.id,
          status: "ACTIVE",
          deletedAt: null,
        },
      });
    } else {
      broker = await prisma.livestockBroker.create({
        data: {
          name: s.name,
          heroTitle: s.heroTitle,
          email: s.email,
          phone: s.phone,
          location: "Mogadishu, Banadir, Somalia",
          livestockFocus: s.focus,
          description: null,
          marketId: market.id,
          status: "ACTIVE",
        },
      });
    }

    await prisma.user.upsert({
      where: { email: s.email },
      create: {
        fullName: s.fullName,
        email: s.email,
        password: hash,
        role: "LIVESTOCK_BROKER_USER",
        status: "APPROVED",
        accountStatus: "ACTIVE",
        phone: s.phone,
        companyName: s.name,
        companyType: s.focus,
        companySector: "livestock",
        companyDistrict: "Hodan",
        companyAddress: `${s.section}, Mogadishu`,
        companyEmail: s.email,
        companyLocation: `${s.section}, Mogadishu`,
        companyCountry: "Somalia",
        contactRole: s.section,
        brokerId: broker.id,
        deletedAt: null,
      },
      update: {
        fullName: s.fullName,
        password: hash,
        role: "LIVESTOCK_BROKER_USER",
        status: "APPROVED",
        accountStatus: "ACTIVE",
        phone: s.phone,
        companyName: s.name,
        companyType: s.focus,
        companySector: "livestock",
        companyDistrict: "Hodan",
        companyAddress: `${s.section}, Mogadishu`,
        companyEmail: s.email,
        companyLocation: `${s.section}, Mogadishu`,
        contactRole: s.section,
        brokerId: broker.id,
        deletedAt: null,
      },
    });

    // Ensure they can submit prices
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { active: true },
      orderBy: { id: "asc" },
    });
    if (plan) {
      const existingSub = await prisma.subscription.findFirst({
        where: {
          brokerId: broker.id,
          status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        },
      });
      if (!existingSub) {
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        await prisma.subscription.create({
          data: {
            brokerId: broker.id,
            planId: plan.id,
            startDate: start,
            expiryDate: end,
            status: "ACTIVE",
          },
        });
      }
    }

    console.log(`Ready: ${s.name} <${s.email}> · ${s.focus}`);
  }

  // Retire Livestock Manager portal — Super Admin owns approvals.
  await prisma.user.updateMany({
    where: { email: "broker@livestock.so" },
    data: {
      accountStatus: "INACTIVE",
      deletedAt: new Date(),
      contactRole: "Retired — Super Admin handles approvals",
    },
  });
  console.log("Retired: Livestock Manager <broker@livestock.so> (use Super Admin)");

  console.log(`\nSection logins: camel / cattle / goat @livestock.so`);
  console.log(`Password for all: ${PASSWORD}`);
  console.log(`Approvals: Super Admin → Livestock Prices + Pending Approvals`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
