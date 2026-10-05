import { cn } from "@/lib/utils";

export type ElectricitySignatureVariant = "beco" | "mps" | "blue-sky";

interface SignatureMarkProps {
  variant: ElectricitySignatureVariant;
  className?: string;
}

const SIGNATURE_IMAGES: Record<
  ElectricitySignatureVariant,
  { src: string; width: number; height: number }
> = {
  beco: {
    src: "/images/signatures/abdirahman.png",
    width: 304,
    height: 168,
  },
  mps: {
    src: "/images/signatures/j-hassan.png",
    width: 304,
    height: 168,
  },
  "blue-sky": {
    src: "/images/signatures/mohamud.png",
    width: 304,
    height: 168,
  },
};

export function ElectricityProviderSignature({
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

export function signatureVariantFromSlug(
  slug: string
): ElectricitySignatureVariant {
  if (slug === "mogadishu-power-supply") return "mps";
  if (slug === "blue-sky-energy") return "blue-sky";
  return "beco";
}
