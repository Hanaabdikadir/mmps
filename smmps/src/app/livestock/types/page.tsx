import { LivestockNoocyadaTable } from "@/components/livestock/LivestockNoocyadaTable";
import { LivestockTypesHero } from "@/components/livestock/LivestockTypesHero";
import { getCompanyProfileOverride } from "@/lib/company-profile-store";

export const metadata = {
  title: "Noocyada Xoolaha — Livestock Types",
  description:
    "Geelka, Lo'da and Arriga livestock types (Noocyada Xoolaha) used in Mogadishu markets.",
};

/** One-screen layout at 100% zoom — no vertical page scroll */
export default async function LivestockTypesPage() {
  const profile = await getCompanyProfileOverride("livestock-market");
  const titleOverride = profile?.typesTitle?.trim() || undefined;
  const subtitleOverride = profile?.typesSubtitle?.trim() || undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f5faf7] min-[720px]:overflow-hidden">
      <LivestockTypesHero
        titleOverride={titleOverride}
        subtitleOverride={subtitleOverride}
      />

      <div className="mx-auto flex w-full max-w-7xl shrink-0 flex-col overflow-hidden px-3 py-3 min-[360px]:px-4 sm:px-6 min-[720px]:h-[520px] min-[720px]:max-h-[520px]">
        <LivestockNoocyadaTable compact showHeader={false} />
      </div>
    </div>
  );
}
