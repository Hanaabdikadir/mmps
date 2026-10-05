import { listPublicLivestockCompanies } from "@/lib/company-scope-server";
import { HomeProviderCards } from "@/components/home/HomeProviderCards";
import { LivestockProvidersTitle } from "@/components/livestock/LivestockProvidersTitle";
import { PROVIDER_PILL_SO } from "@/lib/home-content";

/** Newly approved livestock companies — shown on /livestock only, never on home. */
export async function LivestockProvidersSection() {
  const providers = (await listPublicLivestockCompanies()).map((p) => {
    const pillEn = p.pillLabel;
    return {
      id: p.id,
      href: p.href,
      name: p.name,
      cardLabel: p.cardLabel,
      cardTitle: p.cardTitle,
      cardTitleSo: p.somali || p.cardTitle,
      pillLabel: pillEn,
      pillLabelSo: PROVIDER_PILL_SO[pillEn] || pillEn,
      image: p.image,
      imageWidth: p.imageWidth,
      imageHeight: p.imageHeight,
      imageBg: p.imageBg ?? "bg-white",
      cardImageCrop: p.cardImageCrop ?? "banner",
      headerBg: p.headerBg,
      cardBodyTint: p.cardBodyTint,
      accentText: p.accentText,
      accentBg: p.accentBg,
      cardBorder: p.cardBorder,
      cardDivider: p.cardDivider,
    };
  });

  if (providers.length === 0) return null;

  return (
    <section id="companies" className="scroll-mt-36">
      <LivestockProvidersTitle />
      <HomeProviderCards
        sectionClassName="livestock-section"
        providers={providers}
      />
    </section>
  );
}
