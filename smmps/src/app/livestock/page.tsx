import { LivestockHero } from "@/components/livestock/LivestockHero";
import { LivestockOverviewStats } from "@/components/livestock/LivestockOverviewStats";
import { LivestockPriceNav } from "@/components/livestock/LivestockPriceNav";
import { LivestockProvidersSection } from "@/components/livestock/LivestockProvidersSection";
import { listPublicLivestockCatalog } from "@/lib/livestock-catalog";

export const metadata = {
  title: "Livestock Market",
  description:
    "Mogadishu livestock market prices — Geelka, Lo'da & Arriga. Compare verified rates across Banadir.",
};

export const dynamic = "force-dynamic";

export default async function LivestockPage() {
  const categories = await listPublicLivestockCatalog();

  return (
    <div className="min-h-screen bg-[#f5faf7]">
      <LivestockHero />

      <LivestockOverviewStats />

      <div className="page-shell mx-auto max-w-7xl space-y-14 px-3 py-10 min-[360px]:px-4 sm:space-y-16 sm:px-6 sm:py-14">
        <LivestockPriceNav categories={categories} />

        <LivestockProvidersSection />
      </div>
    </div>
  );
}
