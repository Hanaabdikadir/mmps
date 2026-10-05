import { WaterHero } from "@/components/water/WaterHero";
import { WaterProvidersTitle } from "@/components/water/WaterProvidersTitle";
import { WaterProvidersSection } from "@/components/water/WaterProvidersSection";
import { listPublicWaterProviders } from "@/lib/company-scope-server";
import { getWaterPrices } from "@/lib/water-service";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Water Supply",
  description:
    "Mogadishu water supply prices — major providers, underground borehole networks, and live records in Banadir Region.",
};

export default async function WaterPage() {
  const { records } = await getWaterPrices(UTILITY_SERVICE_TYPE, {
    approvedOnly: true,
  });
  const providers = await listPublicWaterProviders({ includeExtras: true });

  return (
    <div className="livestock-mesh min-h-screen">
      <WaterHero
        totalRecords={records.length}
        providerCount={providers.length}
      />

      <div className="page-shell mx-auto max-w-7xl space-y-10 px-3 py-8 min-[360px]:px-4 sm:space-y-14 sm:px-6 sm:py-12">
        <div id="providers" className="scroll-mt-36">
          <WaterProvidersTitle />
          <WaterProvidersSection />
        </div>
      </div>
    </div>
  );
}
