import { NextResponse } from "next/server";
import {
  getCurrentUser,
  isApproved,
  isScopedCompanyAdmin,
  isSuperAdmin,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import { providerMetaForSlug } from "@/lib/company-scope-server";
import { getWaterPrices } from "@/lib/water-service";
import { getElectricityPrices } from "@/lib/electricity-service";
import { companySectorForSlug } from "@/lib/company-scope-server";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";
import { buildProviderNeedles, matchesProvider } from "@/lib/provider-match";
import { getCompanyProfileOverride } from "@/lib/company-profile-store";

export async function GET() {
  const user = await getCurrentUser();
  if (
    !user ||
    !isApproved(user) ||
    (!isScopedCompanyAdmin(user) && !isSuperAdmin(user))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const slug = resolveCompanyAdminSlug(user);
  if (!slug) {
    return NextResponse.json({ error: "No company assigned" }, { status: 400 });
  }

  const meta = await providerMetaForSlug(slug);
  const sector = await companySectorForSlug(slug);
  const profile = await getCompanyProfileOverride(slug).catch(() => null);
  const needles = buildProviderNeedles({
    slug,
    name: meta && "name" in meta ? String(meta.name) : null,
    acronym: meta && "acronym" in meta ? String(meta.acronym ?? "") : null,
    cardTitle:
      meta && "cardTitle" in meta ? String(meta.cardTitle ?? "") : null,
    cardLabel:
      meta && "cardLabel" in meta ? String(meta.cardLabel ?? "") : null,
    tagline: meta && "tagline" in meta ? String(meta.tagline ?? "") : null,
    providerLabel: profile?.providerLabel
      ? String(profile.providerLabel)
      : null,
  });

  const match = (providerName: string) => matchesProvider(providerName, needles);

  try {
    if (sector === "water") {
      const { records } = await getWaterPrices(UTILITY_SERVICE_TYPE);
      const matched = records.filter((r) => match(r.providerName));
      const prices = matched.map((r) => ({
        id: r.id,
        type: r.waterType,
        price: Number(r.pricePerUnit),
        dateRecorded: r.dateRecorded,
        providerName: r.providerName,
      }));
      return NextResponse.json({
        sector,
        prices: prices.slice(0, 100),
        total: prices.length,
      });
    }

    if (sector === "electricity") {
      const { records } = await getElectricityPrices(UTILITY_SERVICE_TYPE);
      const matched = records.filter((r) => match(r.providerName));
      const prices = matched.map((r) => ({
        id: r.id,
        type: r.serviceType,
        price: Number(r.pricePerKwh),
        dateRecorded: r.dateRecorded,
        providerName: r.providerName,
      }));
      return NextResponse.json({
        sector,
        prices: prices.slice(0, 100),
        total: prices.length,
      });
    }

    return NextResponse.json({ sector, prices: [], total: 0 });
  } catch {
    return NextResponse.json({ sector, prices: [], total: 0 });
  }
}
