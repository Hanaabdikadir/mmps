import { notFound } from "next/navigation";
import { LivestockTypeListings } from "@/components/livestock/LivestockTypeListings";
import {
  LIVESTOCK_CATEGORY_PAGES,
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import { canonicalTypeName } from "@/lib/livestock-section-prices";
import { listPublicLivestockCatalog } from "@/lib/livestock-catalog";

export const dynamic = "force-dynamic";

function parseSeason(raw: string): "birimo" | "sugunto" | null {
  const v = raw.toLowerCase();
  if (v === "birimo") return "birimo";
  if (v === "sugunto") return "sugunto";
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; season: string; type: string }>;
}) {
  const { category: slug, type } = await params;
  if (isLivestockCategorySlug(slug)) {
    const meta = LIVESTOCK_CATEGORY_PAGES[slug];
    return { title: `${decodeURIComponent(type)} — ${meta.somali}` };
  }
  return { title: `${decodeURIComponent(type)} — Livestock` };
}

export default async function LivestockTypePage({
  params,
}: {
  params: Promise<{ category: string; season: string; type: string }>;
}) {
  const { category: slug, season: seasonRaw, type: typeRaw } = await params;
  const season = parseSeason(seasonRaw);
  if (!season) notFound();

  const catalog = await listPublicLivestockCatalog();
  const live = catalog.find((row) => row.slug === slug);
  if (!live) notFound();

  const decoded = decodeURIComponent(typeRaw);
  const typeName = canonicalTypeName(decoded) || decoded.trim();
  if (!typeName) notFound();
  const typeOk = live.types.some((row) => {
    const so = canonicalTypeName(row.nameSo);
    const en = canonicalTypeName(row.nameEn);
    return so === typeName || en === typeName || row.nameSo === decoded || row.nameEn === decoded;
  });
  if (!typeOk) notFound();

  return (
    <div className="livestock-type-page w-full bg-white">
      <LivestockTypeListings
        category={slug}
        season={season}
        typeName={typeName}
      />
    </div>
  );
}
