import { ElectricitySectionTitle } from "@/components/home/HomeSectionTitles";
import { ElectricityProvidersShowcase } from "@/components/electricity/ElectricityProvidersShowcase";

/** Server Component wrapper — keeps server-only imports out of the client bundle. */
export function HomeElectricityProvidersSection() {
  return (
    <section>
      <ElectricitySectionTitle />
      <ElectricityProvidersShowcase includeExtras={false} />
    </section>
  );
}
