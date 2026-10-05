"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WaterProviderCardBannerProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  bgClassName?: string;
  imageFocus?: string;
  crop?: "logo" | "banner";
  priority?: boolean;
  blendMultiply?: boolean;
  onLoadError?: () => void;
}

export function WaterProviderCardBanner({
  src,
  alt,
  width,
  height,
  bgClassName = "bg-white",
  imageFocus = "50% 50%",
  priority = false,
  blendMultiply = false,
  onLoadError,
}: WaterProviderCardBannerProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  function fail() {
    setError(true);
    onLoadError?.();
  }

  if (error) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden px-3 py-2.5 sm:px-4",
        bgClassName
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized={src.startsWith("/")}
        quality={100}
        sizes="(max-width: 768px) 90vw, 480px"
        className={cn(
          "h-auto max-h-[8.25rem] w-auto max-w-[92%] object-contain object-center sm:max-h-[9rem]",
          blendMultiply && "mix-blend-multiply"
        )}
        style={{ objectPosition: imageFocus }}
        priority={priority}
        onError={fail}
      />
    </div>
  );
}
