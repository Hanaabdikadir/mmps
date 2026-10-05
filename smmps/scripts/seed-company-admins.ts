/**
 * Seed real DB company admin accounts for the 7 providers.
 * Run: npx tsx scripts/seed-company-admins.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COMPANIES = [
  {
    fullName: "Ahmed Nur Ali",
    email: "admin@livestock.so",
    companyEmail: "livestock@mmps.so",
    companyName: "Mogadishu Livestock Market",
    companySector: "Livestock",
    companySlug: "livestock-market",
    companyDistrict: "All Banadir districts",
    companyAddress: "Mogadishu Livestock Market, Banadir Region, Mogadishu",
    phone: null,
    createdAt: new Date("2026-06-01T15:52:00"),
  },
  {
    fullName: "Yusuf Hussein Jimale",
    email: "admin@bawadco.so",
    companyEmail: "info@bawadco.so",
    companyName: "Banadir Water Development Company",
    companySector: "Water",
    companySlug: "bawadco",
    companyDistrict: "Howlwadaag",
    companyAddress: "Howlwadaag District, Banadir Region, Mogadishu, Somalia",
    phone: "+252 613 491 008",
    createdAt: new Date("2026-07-15T13:52:00"),
  },
  {
    fullName: "Mohamed Ahmed Nur",
    email: "admin@wabax.so",
    companyEmail: "admin@wabax.so",
    companyName: "WABAX Water Supply Co.",
    companySector: "Water",
    companySlug: "wabax",
    companyDistrict: "Daynile",
    companyAddress: "Afgoye–Mogadishu Road, Mogadishu, Somalia",
    phone: "+252 61 999 0049",
    createdAt: new Date("2026-07-14T10:52:00"),
  },
  {
    fullName: "Abdirizak Mohamed Hassan",
    email: "admin@hawdco.so",
    companyEmail: "info@hawdco.so",
    companyName: "Towfiiq",
    companySector: "Water",
    companySlug: "banadir-water",
    companyDistrict: "Hodan",
    companyAddress: "Sinai Street, Mogadishu, Somalia",
    phone: "+252 610 795 571",
    createdAt: new Date("2026-07-12T06:52:00"),
  },
  {
    fullName: "Mohamed Abdi Ibrahim",
    email: "admin@beco.so",
    companyEmail: "info@beco.so",
    companyName: "BECO",
    companySector: "Electricity",
    companySlug: "beco",
    companyDistrict: "Hodan",
    companyAddress: "Tarabuun Street, Hodan District, Mogadishu, Somalia",
    phone: "+252 619 111 114",
    createdAt: new Date("2026-07-10T13:52:00"),
  },
  {
    fullName: "Ismail Abdi Omar",
    email: "admin@mps.so",
    companyEmail: "info@muqdishopower.com",
    companyName: "Mogadishu Power Supply",
    companySector: "Electricity",
    companySlug: "mogadishu-power-supply",
    companyDistrict: "Howlwadaag",
    companyAddress: "Bakaro Market, Howlwadaag District, Mogadishu, Somalia",
    phone: "+252 621 000 111",
    createdAt: new Date("2026-07-08T09:52:00"),
  },
  {
    fullName: "Abdirahman Hassan Yusuf",
    email: "admin@blueskyenergy.so",
    companyEmail: "info@blueskyenergy.so",
    companyName: "Blue Sky Energy",
    companySector: "Electricity",
    companySlug: "blue-sky-energy",
    companyDistrict: "Abdiaziz",
    companyAddress:
      "Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia",
    phone: "+252 62 899 9645",
    createdAt: new Date("2026-07-05T14:52:00"),
  },
] as const;

const PASSWORD = "company123";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  for (const c of COMPANIES) {
    await prisma.user.upsert({
      where: { email: c.email },
      create: {
        fullName: c.fullName,
        email: c.email,
        password: hash,
        role: "COMPANY_ADMIN",
        status: "APPROVED",
        companyName: c.companyName,
        companySector: c.companySector,
        companySlug: c.companySlug,
        companyDistrict: c.companyDistrict,
        companyAddress: c.companyAddress,
        companyEmail: c.companyEmail,
        phone: c.phone,
        createdAt: c.createdAt,
      },
      update: {
        fullName: c.fullName,
        password: hash,
        role: "COMPANY_ADMIN",
        status: "APPROVED",
        companyName: c.companyName,
        companySector: c.companySector,
        companySlug: c.companySlug,
        companyDistrict: c.companyDistrict,
        companyAddress: c.companyAddress,
        companyEmail: c.companyEmail,
        phone: c.phone,
        createdAt: c.createdAt,
      },
    });
    console.log(`OK ${c.email} → ${c.companySlug} (${c.createdAt.toISOString()})`);
  }
  console.log(`\nAll company admins ready. Password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
