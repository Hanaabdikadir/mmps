import { listPublicElectricityProviders } from "@/lib/company-scope-server";
import { HomeProviderCards } from "@/components/home/HomeProviderCards";
import {
  ELECTRICITY_CARD_TITLE_EN,
  ELECTRICITY_CARD_TITLE_SO,
  PROVIDER_PILL_SO,
} from "@/lib/home-content";

function pillSo(en: string): string {
  if (PROVIDER_PILL_SO[en]) return PROVIDER_PILL_SO[en];
  const key = Object.keys(PROVIDER_PILL_SO).find(
    (k) => k.toLowerCase() === en.toLowerCase()
  );
  return key ? PROVIDER_PILL_SO[key] : en;
}

export async function ElectricityProvidersShowcase({
  includeExtras = true,
}: {
  /** Sector hubs include newly approved companies; home should pass false. */
  includeExtras?: boolean;
}) {
  const providers = (await listPublicElectricityProviders({ includeExtras })).map(
    (p) => {
      const supplyType =
        "supplyType" in p && typeof p.supplyType === "string"
          ? p.supplyType.trim()
          : "";
      const pillEn =
        p.pillLabel?.trim() ||
        supplyType ||
        "Grid Electricity & Solar Power";
      const titleKey =
        p.id in ELECTRICITY_CARD_TITLE_SO || p.id in ELECTRICITY_CARD_TITLE_EN
          ? p.id
          : p.slug;

      const cardLabelSo =
        ELECTRICITY_CARD_TITLE_SO[titleKey] ||
        (("somali" in p && typeof p.somali === "string" && p.somali) ||
          p.cardTitle);

      return {
        id: p.id,
        href: p.href,
        name: p.name,
        cardLabel: p.cardLabel,
        cardLabelSo,
        cardTitle: ELECTRICITY_CARD_TITLE_EN[titleKey] || p.cardTitle,
        cardTitleSo:
          ELECTRICITY_CARD_TITLE_SO[titleKey] ||
          (("somali" in p && p.somali) || p.cardTitle),
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
    }
  );

  return (
    <HomeProviderCards
      sectionId="providers"
      sectionClassName="electricity-section scroll-mt-36"
      providers={providers}
    />
  );
}
