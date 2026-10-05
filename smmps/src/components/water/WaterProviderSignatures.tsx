import { cn } from "@/lib/utils";

export type WaterSignatureVariant = "bawadco" | "hawdco" | "wabax";

interface SignatureMarkProps {
  variant: WaterSignatureVariant;
  className?: string;
}

const SIGNATURE_IMAGES: Record<
  WaterSignatureVariant,
  { src: string; width: number; height: number }
> = {
  bawadco: {
    src: "/images/signatures/abdirahman.png",
    width: 304,
    height: 168,
  },
  hawdco: {
    src: "/images/signatures/j-hassan.png",
    width: 304,
    height: 168,
  },
  wabax: {
    src: "/images/signatures/mohamud.png",
    width: 304,
    height: 168,
  },
};

export function WaterProviderSignature({
  variant,
  className,
}: SignatureMarkProps) {
  const image = SIGNATURE_IMAGES[variant];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      width={image.width}
      height={image.height}
      className={cn("h-14 w-auto object-contain object-right", className)}
      aria-hidden
    />
  );
}

export function waterSignatureVariantFromSlug(slug: string): WaterSignatureVariant {
  if (slug === "banadir-water") return "hawdco";
  if (slug === "wabax") return "wabax";
  return "bawadco";
}
