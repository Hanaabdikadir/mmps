"use client";

import { useState, type ReactNode } from "react";
import { WaterProviderCardBanner } from "@/components/water/WaterProviderCardBanner";
import { cn } from "@/lib/utils";

/** Card header: company logo, or brand icon if the image fails / is missing. */
export function HomeProviderCardLogo({
  image,
  name,
  imageWidth,
  imageHeight,
  imageBg,
  imageFocus,
  cardImageCrop,
  imageBlendMultiply,
  headerBg,
  fallback,
  priority,
}: {
  image?: string;
  name: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBg?: string;
  imageFocus?: string;
  cardImageCrop?: "logo" | "banner";
  imageBlendMultiply?: boolean;
  headerBg: string;
  /** Pre-rendered on the server (e.g. Lucide icon JSX) — do not pass icon components. */
  fallback: ReactNode;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image?.trim()) && !failed;

  if (showImage && image) {
    return (
      <div className="absolute inset-0">
        <WaterProviderCardBanner
          src={image}
          alt={name}
          width={imageWidth ?? 400}
          height={imageHeight ?? 160}
          bgClassName={imageBg ?? "bg-white"}
          imageFocus={imageFocus}
          crop={cardImageCrop ?? "banner"}
          priority={priority}
          blendMultiply={imageBlendMultiply}
          onLoadError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
        headerBg
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm transition group-hover:scale-110">
        {fallback}
      </div>
    </div>
  );
}
