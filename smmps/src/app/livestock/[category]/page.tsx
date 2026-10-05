import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LivestockCategoryHero } from "@/components/livestock/LivestockCategoryHero";
import { LivestockBirimoSuguntoPanel } from "@/components/livestock/LivestockBirimoSuguntoPanel";
import {
  LIVESTOCK_CATEGORY_PAGES,
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import { getSectionHeroByCategory } from "@/lib/livestock-section-hero";
import { listPublicLivestockCatalog } from "@/lib/livestock-catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const catalog = await listPublicLivestockCatalog();
  const live = catalog.find((row) => row.slug === slug);
  if (live) {
    return {
      title: `${live.nameSo || live.nameEn} — Livestock`,
      description: live.nameEn,
    };
  }
  if (isLivestockCategorySlug(slug)) {
    const meta = LIVESTOCK_CATEGORY_PAGES[slug];
    return {
      title: `${meta.somali} — Livestock`,
      description: meta.descriptionEn,
    };
  }
  return { title: "Livestock" };
}

export default async function LivestockCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ market?: string }>;
}) {
  const { category: slug } = await params;
  const { market } = await searchParams;
  const catalog = await listPublicLivestockCatalog();
  const live = catalog.find((row) => row.slug === slug);
  if (!live) notFound();

  const hero = await getSectionHeroByCategory(slug);
  const meta = isLivestockCategorySlug(slug)
    ? LIVESTOCK_CATEGORY_PAGES[slug]
    : null;
  const categoryName =
    live.nameEn || meta?.english || live.nameSo || meta?.somali || slug;
  const marketId = Number(market);
  const marketRow =
    Number.isFinite(marketId) && marketId > 0
      ? await prisma.market.findFirst({
          where: { id: marketId, deletedAt: null },
          select: { name: true },
        })
      : null;
  const marketLabel = marketRow?.name || "";

  return (
    <div className="livestock-category-page livestock-mesh">
      <LivestockCategoryHero
        category={slug}
        title={live.nameSo || live.nameEn || hero.title}
        titleEn={live.nameEn || meta?.english || hero.title}
        titleSo={live.nameSo || meta?.somali || hero.title}
        description={hero.description}
        image={hero.featuredImage || live.imageUrl}
        marketLabel={marketLabel}
      />

      <div className="page-shell mx-auto w-full max-w-[92rem] px-2 pt-5 pb-0 min-[360px]:px-3 sm:px-4 sm:pt-6 lg:px-6">
        <div id="prices" className="scroll-mt-28 w-full">
          <Suspense
            fallback={
              <div className="grid min-h-[30vh] w-full place-items-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              </div>
            }
          >
            <LivestockBirimoSuguntoPanel
              category={slug}
              categoryName={categoryName}
              initialCatalogTypes={live.types}
              initialCategoryLabelSo={live.nameSo}
              initialCategoryLabelEn={live.nameEn}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
