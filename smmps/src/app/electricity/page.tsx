import { ElectricityHero } from "@/components/electricity/ElectricityHero";
import { ElectricityProvidersTitle } from "@/components/electricity/ElectricityProvidersTitle";
import { ElectricityProvidersShowcase } from "@/components/electricity/ElectricityProvidersShowcase";
import { listPublicElectricityProviders } from "@/lib/company-scope-server";
import { getElectricityPrices } from "@/lib/electricity-service";
import { UTILITY_SERVICE_TYPE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Electricity Market",
  description:
    "Mogadishu electricity prices — major providers and live professional rates in Banadir Region.",
};

export default async function ElectricityPage() {
  const { records } = await getElectricityPrices(UTILITY_SERVICE_TYPE, {
    approvedOnly: true,
  });
  const providers = await listPublicElectricityProviders({ includeExtras: true });

  return (
    <div className="livestock-mesh min-h-screen">
      <ElectricityHero
        totalRecords={records.length}
        providerCount={providers.length}
      />

      <div className="page-shell mx-auto max-w-7xl space-y-10 px-3 py-8 min-[360px]:px-4 sm:space-y-14 sm:px-6 sm:py-12">
        <div id="providers" className="scroll-mt-36">
          <ElectricityProvidersTitle />
          <ElectricityProvidersShowcase />
        </div>
      </div>
    </div>
  );
}
