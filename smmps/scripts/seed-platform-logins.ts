/**
 * Restore platform login accounts (Super Admin + livestock brokers).
 * Run: npm run db:seed-logins
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORM_USERS = [
  {
    email: "superadmin@mmps.so",
    password: "superadmin123",
    fullName: "Super Admin",
    role: "SUPER_ADMIN" as const,
  },
  {
    email: "admin@mmps.so",
    password: "admin123",
    fullName: "System Admin",
    role: "SUPER_ADMIN" as const,
  },
] as const;

async function main() {
  const hash12 = await bcrypt.hash("broker123", 12);

  for (const account of PLATFORM_USERS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    await prisma.user.upsert({
      where: { email: account.email },
      create: {
        fullName: account.fullName,
        email: account.email,
        password: passwordHash,
        role: account.role,
        status: "APPROVED",
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      update: {
        fullName: account.fullName,
        password: passwordHash,
        role: account.role,
        status: "APPROVED",
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
    });
    console.log(`Ready: ${account.fullName} <${account.email}> · ${account.password}`);
  }

  // Livestock section brokers — linked to Dayniile market by default
  const { getRegistrationLivestockMarkets } = await import(
    "@/lib/livestock-registration-markets"
  );
  const registrationMarkets = await getRegistrationLivestockMarkets();
  const market = registrationMarkets[0];
  if (!market) {
    throw new Error("No registration livestock markets configured");
  }

  const sections = [
    {
      name: "Camel",
      heroTitle: "Geelka",
      email: "camel@livestock.so",
      fullName: "Camel",
      phone: "+252 61 700 1001",
      focus: "Camel Market Section",
    },
    {
      name: "Cattle",
      heroTitle: "Loda",
      email: "cattle@livestock.so",
      fullName: "Cattle",
      phone: "+252 61 700 1002",
      focus: "Cattle Market Section",
    },
    {
      name: "Goat",
      heroTitle: "Arriga",
      email: "goat@livestock.so",
      fullName: "Goat",
      phone: "+252 61 700 1003",
      focus: "Goat Market Section",
    },
  ] as const;

  for (const s of sections) {
    const broker = await prisma.livestockBroker.upsert({
      where: { email: s.email },
      create: {
        name: s.name,
        heroTitle: s.heroTitle,
        email: s.email,
        phone: s.phone,
        location: "Mogadishu, Banadir, Somalia",
        livestockFocus: s.focus,
        marketId: market.id,
        status: "ACTIVE",
      },
      update: {
        name: s.name,
        heroTitle: s.heroTitle,
        phone: s.phone,
        location: "Mogadishu, Banadir, Somalia",
        livestockFocus: s.focus,
        marketId: market.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    await prisma.user.upsert({
      where: { email: s.email },
      create: {
        fullName: s.fullName,
        email: s.email,
        password: hash12,
        role: "LIVESTOCK_BROKER_USER",
        status: "APPROVED",
        accountStatus: "ACTIVE",
        phone: s.phone,
        companyName: s.name,
        companyType: s.focus,
        companySector: "livestock",
        brokerId: broker.id,
        deletedAt: null,
      },
      update: {
        fullName: s.fullName,
        password: hash12,
        role: "LIVESTOCK_BROKER_USER",
        status: "APPROVED",
        accountStatus: "ACTIVE",
        brokerId: broker.id,
        deletedAt: null,
      },
    });

    console.log(`Ready: ${s.fullName} <${s.email}> · broker123`);
  }

  await prisma.user.updateMany({
    where: { email: "broker@livestock.so" },
    data: {
      accountStatus: "INACTIVE",
      deletedAt: new Date(),
      contactRole: "Retired — Super Admin handles approvals",
    },
  });
  console.log("Retired: Livestock Manager <broker@livestock.so>");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
