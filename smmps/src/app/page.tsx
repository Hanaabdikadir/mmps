import { HomeHero } from "@/components/home/HomeHero";
import { HomeSectorsSection } from "@/components/home/HomeSections";
import { SYSTEM_NAME, SYSTEM_SHORT } from "@/lib/home-content";
import type { PublicMarketSector } from "@/lib/market-availability";

export const metadata = {
  title: `${SYSTEM_SHORT} — ${SYSTEM_NAME}`,
  description:
    "Real-time Xoolaha, Korontada, and Biyaha market prices in Mogadishu.",
};

const DEFAULT_MARKETS: Record<PublicMarketSector, boolean> = {
  livestock: true,
  water: true,
  electricity: true,
};

export default function HomePage() {
  return (
    <div className="livestock-mesh min-h-screen">
      <HomeHero activeSectors={DEFAULT_MARKETS} />

      <div className="page-shell mx-auto max-w-7xl space-y-10 px-3 py-8 min-[360px]:px-4 sm:space-y-14 sm:px-6 sm:py-12">
        <HomeSectorsSection activeSectors={DEFAULT_MARKETS} />
      </div>
    </div>
  );
}
