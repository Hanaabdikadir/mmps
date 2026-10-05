/**
 * Persist real provider phones/emails onto User + Company rows.
 * Run: npx tsx scripts/sync-company-phones.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  try {
    const text = readFileSync(resolve(__dirname, "../.env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^DATABASE_URL=(.*)$/);
      if (!match) continue;
      let value = match[1].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env.DATABASE_URL = value;
      return;
    }
  } catch {
    // Prisma will throw a clear error if DATABASE_URL is still missing.
  }
}

loadDatabaseUrl();

const prisma = new PrismaClient();

const CONTACTS: Array<{
  slug: string;
  phone: string | null;
  companyEmail: string;
}> = [
  {
    slug: "bawadco",
    phone: "+252 613 491 008",
    companyEmail: "info@bawadco.so",
  },
  {
    slug: "wabax",
    phone: "+252 61 999 0049",
    companyEmail: "admin@wabax.so",
  },
  {
    slug: "banadir-water",
    phone: "+252 610 795 571",
    companyEmail: "info@towfiiq.so",
  },
  {
    slug: "beco",
    phone: "+252 619 111 114",
    companyEmail: "info@beco.so",
  },
  {
    slug: "mogadishu-power-supply",
    phone: "+252 621 000 111",
    companyEmail: "info@muqdishopower.com",
  },
  {
    slug: "blue-sky-energy",
    phone: "+252 62 899 9645",
    companyEmail: "info@blueskyenergy.so",
  },
  {
    slug: "livestock-market",
    phone: null,
    companyEmail: "livestock@mmps.so",
  },
];

function isPlaceholderPhone(value?: string | null): boolean {
  const raw = (value ?? "").trim();
  if (!raw || raw === "—" || raw === "-") return true;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return true;
  return /^0+$/.test(digits.slice(-7));
}

async function main() {
  for (const contact of CONTACTS) {
    const users = await prisma.user.findMany({
      where: { companySlug: contact.slug, deletedAt: null },
      select: { id: true, email: true, phone: true, companyEmail: true },
    });

    for (const user of users) {
      const nextPhone = isPlaceholderPhone(user.phone) ? contact.phone : user.phone;
      const nextEmail =
        user.companyEmail?.trim() || contact.companyEmail;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone: nextPhone,
          companyEmail: nextEmail.toLowerCase(),
        },
      });
      console.log(
        `user ${user.email} → phone=${nextPhone ?? "—"} email=${nextEmail}`
      );
    }

    const company = await prisma.company.findUnique({
      where: { slug: contact.slug },
      select: { id: true, phone: true, email: true },
    });
    if (company) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          phone: isPlaceholderPhone(company.phone) ? contact.phone : company.phone,
          email: company.email?.trim() || contact.companyEmail,
        },
      });
      console.log(`company ${contact.slug} updated`);
    }
  }

  const leftover = await prisma.user.findMany({
    where: { phone: "+252 61 000 0000", deletedAt: null },
    select: { id: true, email: true },
  });
  for (const user of leftover) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: null },
    });
    console.log(`cleared placeholder phone for ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
