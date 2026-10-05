import { listPublicWaterProviders } from "@/lib/company-scope-server";
import { HomeProviderCards } from "@/components/home/HomeProviderCards";
import { PROVIDER_PILL_SO, WATER_CARD_LABEL_EN, WATER_CARD_TITLE_EN, WATER_CARD_TITLE_SO } from "@/lib/home-content";

function pillSo(en: string): string {
  if (PROVIDER_PILL_SO[en]) return PROVIDER_PILL_SO[en];
  const key = Object.keys(PROVIDER_PILL_SO).find(
    (k) => k.toLowerCase() === en.toLowerCase()
  );
  return key ? PROVIDER_PILL_SO[key] : en;
}

export async function WaterProvidersSection({
  includeExtras = true,
}: {
  /** Sector hubs include newly approved companies; home should pass false. */
  includeExtras?: boolean;
}) {
  const providers = (await listPublicWaterProviders({ includeExtras })).map((p) => {
    const waterSource =
      "waterSource" in p && typeof p.waterSource === "string"
        ? p.waterSource.trim()
        : "";
    const supplyType =
      "supplyType" in p && typeof (p as { supplyType?: string }).supplyType === "string"
        ? (p as { supplyType?: string }).supplyType!.trim()
        : "";
    const pillEn =
      p.pillLabel?.trim() ||
      waterSource ||
      supplyType ||
      "Underground Borehole Water";
    const titleKey =
      p.id in WATER_CARD_TITLE_EN || p.id in WATER_CARD_TITLE_SO
        ? p.id
        : p.slug;
    const shortTitle = p.cardTitle?.trim() || p.acronym?.trim() || p.name;
    const displayTitle = WATER_CARD_TITLE_EN[titleKey] || shortTitle;
    const somaliName =
      "somali" in p && typeof p.somali === "string" ? p.somali.trim() : "";
    const displayTitleSo =
      WATER_CARD_TITLE_SO[titleKey] ||
      somaliName ||
      shortTitle;
    const displayLabel =
      WATER_CARD_LABEL_EN[titleKey] || p.cardLabel?.trim() || p.name;
    const displayLabelSo = displayTitleSo;

    return {
      id: p.id,
      href: p.href,
      name: p.name,
      cardLabel: displayLabel,
      cardLabelSo: displayLabelSo,
      cardTitle: displayTitle,
      cardTitleSo: displayTitleSo,
      pillLabel: pillEn,
      pillLabelSo: pillSo(pillEn),
      image: p.image,
      imageWidth: p.imageWidth,
      imageHeight: p.imageHeight,
      imageBg: p.imageBg ?? "bg-white",
      imageFocus: p.imageFocus,
      cardImageCrop: p.cardImageCrop ?? "banner",
      imageBlendMultiply: p.imageBlendMultiply,
      headerBg: p.headerBg,
      cardBodyTint: p.cardBodyTint,
      accentText: p.accentText,
      accentBg: p.accentBg,
      cardBorder: p.cardBorder,
      cardDivider: p.cardDivider,
      viewBtnText: p.viewBtnText,
    };
  });

  return (
    <HomeProviderCards
      sectionId="providers"
      sectionClassName="water-section scroll-mt-36"
      providers={providers}
    />
  );
}
