import { revalidatePath } from "next/cache";
import type { AccountStatus, MarketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import { hardDeleteMarket } from "@/lib/delete-market";
import { REGISTRATION_COMPANY_LOGO_FIELD } from "@/lib/registration-requirements";
import {
  RegistrationUploadError,
  saveRegistrationCompanyLogo,
} from "@/lib/registration-upload";
import { getMarketLogoMap, setMarketLogoFileName, withLogo } from "@/lib/market-logo-db";
import { ensureCompanyMarketsLinked } from "@/lib/company-default-market";

function revalidatePublicMarkets() {
  revalidatePath("/register");
  revalidatePath("/");
  revalidatePath("/water");
  revalidatePath("/electricity");
}

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

async function logoFromForm(form: FormData): Promise<string | null> {
  const entry = form.get(REGISTRATION_COMPANY_LOGO_FIELD);
  if (!(entry instanceof File) || entry.size === 0) return null;
  return saveRegistrationCompanyLogo(entry);
}

export async function GET(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status") as AccountStatus | null;
  const marketType = searchParams.get("type") as MarketType | null;

  await ensureCompanyMarketsLinked();

  const markets = await prisma.market.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(marketType ? { marketType } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              {
                companies: {
                  some: {
                    deletedAt: null,
                    status: "ACTIVE",
                    name: { contains: q, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { sections: true, companies: true, brokers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      type: { in: ["WATER_SUPPLY", "ELECTRICITY"] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      marketId: true,
      location: true,
      logoFileName: true,
    },
    orderBy: { name: "asc" },
  });

  const waterMarkets = markets.filter((m) => m.marketType === "WATER");
  const electricityMarkets = markets.filter((m) => m.marketType === "ELECTRICITY");

  const logos = await getMarketLogoMap(markets.map((m) => m.id));
  return jsonOk({
    markets: markets.map((m) => {
      const sectorType =
        m.marketType === "WATER"
          ? "WATER_SUPPLY"
          : m.marketType === "ELECTRICITY"
            ? "ELECTRICITY"
            : null;
      const peers =
        m.marketType === "WATER"
          ? waterMarkets
          : m.marketType === "ELECTRICITY"
            ? electricityMarkets
            : [];
      const sector = sectorType
        ? companies.filter((c) => c.type === sectorType)
        : [];
      const listed =
        sectorType && peers.length <= 1
          ? sector
          : sectorType
            ? sector.filter((c) => c.marketId === m.id)
            : companies.filter((c) => c.marketId === m.id);
      return {
        ...withLogo(m, logos),
        companies: listed.map(({ marketId: _marketId, ...company }) => company),
        _count: { ...m._count, companies: listed.length },
      };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const contentType = request.headers.get("content-type") || "";
  let name = "";
  let location = "";
  let description = "";
  let marketType: MarketType = "WATER";
  let status: AccountStatus = "ACTIVE";
  let logoFileName: string | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = str(form, "name").trim();
      location = str(form, "location").trim();
      description = str(form, "description").trim();
      marketType = (str(form, "marketType") as MarketType) || "WATER";
      status = (str(form, "status") as AccountStatus) || "ACTIVE";
      logoFileName = await logoFromForm(form);
    } else {
      const body = await request.json().catch(() => null);
      name = String(body?.name || "").trim();
      location = body?.location ? String(body.location).trim() : "";
      description = body?.description ? String(body.description).trim() : "";
      marketType = (body?.marketType as MarketType) || "WATER";
      status = (body?.status as AccountStatus) || "ACTIVE";
    }
  } catch (error) {
    if (error instanceof RegistrationUploadError) {
      return jsonError(error.message);
    }
    throw error;
  }

  if (!name) return jsonError("Market name is required");
  if (marketType !== "WATER" && marketType !== "ELECTRICITY") {
    return jsonError(
      "This page is for water and electricity markets only. Add livestock markets under Livestock Markets."
    );
  }
  if (!logoFileName) {
    return jsonError("Please upload a company logo.");
  }

  const market = await prisma.market.create({
    data: {
      name,
      location: location || null,
      marketType,
      description: description || null,
      status,
    },
  });
  await setMarketLogoFileName(market.id, logoFileName);

  revalidatePublicMarkets();
  return jsonOk({ market: { ...market, logoFileName } }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const contentType = request.headers.get("content-type") || "";
  let id = 0;
  let name: string | undefined;
  let location: string | undefined;
  let description: string | undefined;
  let marketType: MarketType | undefined;
  let status: AccountStatus | undefined;
  let logoFileName: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      id = Number(str(form, "id"));
      const n = str(form, "name").trim();
      if (n) name = n;
      if (form.has("location")) location = str(form, "location").trim();
      if (form.has("description")) description = str(form, "description");
      const mt = str(form, "marketType");
      if (mt) marketType = mt as MarketType;
      const st = str(form, "status");
      if (st) status = st as AccountStatus;
      const uploaded = await logoFromForm(form);
      if (uploaded) logoFileName = uploaded;
    } else {
      const body = await request.json().catch(() => null);
      id = Number(body?.id);
      if (body?.name != null) name = String(body.name).trim();
      if (body?.location != null) location = String(body.location).trim();
      if (body?.description != null) description = String(body.description);
      if (body?.marketType != null) marketType = body.marketType as MarketType;
      if (body?.status != null) status = body.status as AccountStatus;
    }
  } catch (error) {
    if (error instanceof RegistrationUploadError) {
      return jsonError(error.message);
    }
    throw error;
  }

  if (!id) return jsonError("Market id is required");

  const existing = await prisma.market.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return jsonError("Market not found", 404);

  const market = await prisma.market.update({
    where: { id },
    data: {
      ...(name != null ? { name } : {}),
      ...(location != null ? { location } : {}),
      ...(marketType === "WATER" || marketType === "ELECTRICITY"
        ? { marketType }
        : {}),
      ...(description != null ? { description } : {}),
      ...(status != null ? { status } : {}),
    },
  });
  if (logoFileName != null) {
    await setMarketLogoFileName(id, logoFileName);
  }

  revalidatePublicMarkets();
  return jsonOk({ market: { ...market, logoFileName: logoFileName ?? null } });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_MARKETS");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("Market id is required");

  const existing = await prisma.market.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!existing) return jsonError("Market not found", 404);

  try {
    const result = await hardDeleteMarket(id);
    revalidatePublicMarkets();
    return jsonOk({ ok: true, deleted: true, ...result });
  } catch (error) {
    console.error("[api/markets DELETE]", error);
    return jsonError("Could not delete market and related data", 500);
  }
}
