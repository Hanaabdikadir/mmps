"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LivestockCategoryPhotoProps {
  src: string;
  alt: string;
  focus?: string;
  fit?: "cover" | "contain";
  /** Natural size (no fill) — photo keeps its shape, fully visible */
  layout?: "fill" | "natural";
  priority?: boolean;
  className?: string;
  /** Match livestock page hero sharpness */
  quality?: number;
  sizes?: string;
}

export function LivestockCategoryPhoto({
  src,
  alt,
  focus = "50% 50%",
  fit = "cover",
  layout = "fill",
  priority = false,
  className,
  quality = 90,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 55vw, 640px",
}: LivestockCategoryPhotoProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-amber-100 text-5xl",
          className
        )}
        aria-label={alt}
      >
        🐾
      </div>
    );
  }

  const local = src.startsWith("/");

  if (layout === "natural") {
    return (
      <Image
        key={src}
        src={src}
        alt={alt}
        width={1400}
        height={1050}
        unoptimized={local}
        quality={quality}
        sizes={sizes}
        className={cn("h-auto w-full object-contain", className)}
        style={{ objectPosition: focus || "50% 50%" }}
        priority={priority}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill
      unoptimized={local}
      quality={quality}
      sizes={sizes}
      className={cn(
        "absolute inset-0 h-full w-full bg-[#f7f4ee]",
        fit === "contain" ? "object-contain" : "object-cover",
        className
      )}
      style={{
        objectFit: fit === "contain" ? "contain" : "cover",
        objectPosition: focus || "50% 50%",
        backgroundColor: "#f7f4ee",
      }}
      priority={priority}
      onError={() => setError(true)}
    />
  );
}
