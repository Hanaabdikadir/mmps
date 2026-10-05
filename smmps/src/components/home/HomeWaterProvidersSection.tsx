import { WaterSectionTitle } from "@/components/home/HomeSectionTitles";
import { WaterProvidersSection } from "@/components/water/WaterProvidersSection";

/** Server Component wrapper — keeps server-only imports out of the client bundle. */
export function HomeWaterProvidersSection() {
  return (
    <section>
      <WaterSectionTitle />
      <WaterProvidersSection includeExtras={false} />
    </section>
  );
}
