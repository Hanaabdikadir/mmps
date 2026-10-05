import Image from "next/image";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";import { cn } from "@/lib/utils";

export interface HeroLogoBadgeProps {
  image?: string;
  imageAlt?: string;
  imageBg?: string;
  imageObjectFit?: "contain" | "cover";
  imageObjectPosition?: string;
  icon?: LucideIcon;
  gradient?: string;
  shadowClass?: string;
  iconStrokeWidth?: number;
  priority?: boolean;
  className?: string;
  imageBlendMultiply?: boolean;
  iconColor?: string;
  innerClassName?: string;
  iconBounce?: boolean;
}

export function HeroLogoBadge({
  image,
  imageAlt = "",
  imageBg = "bg-white",
  imageObjectFit = "contain",
  imageObjectPosition,
  icon: Icon,
  gradient = "from-emerald-500 to-amber-500",
  shadowClass = "shadow-emerald-900/30",
  iconStrokeWidth = 2,
  priority = false,
  className,
  imageBlendMultiply = false,
  iconColor = "text-white",
  innerClassName,
  iconBounce = false,
}: HeroLogoBadgeProps) {
  if (image) {
    return (
      <div
        className={cn(
          "animate-float relative flex h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl shadow-xl",
          imageBlendMultiply ? "p-0 ring-0" : "p-2 ring-1 ring-white/25",
          imageBg,
          shadowClass,
          className
        )}
      >
        <Image
          src={image}
          alt={imageAlt}
          width={96}
          height={96}
          unoptimized={image.startsWith("/")}
          className={cn(
            "h-full w-full object-center",
            imageObjectFit === "cover" ? "object-cover" : "object-contain",
            imageBlendMultiply && "mix-blend-multiply"
          )}
          style={
            imageObjectPosition ? { objectPosition: imageObjectPosition } : undefined
          }
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl",
        iconBounce ? "animate-hero-stat-bounce motion-reduce:animate-none" : "animate-float",
        gradient,
        shadowClass,
        className
      )}
      style={
        iconBounce
          ? ({
              ["--hero-stat-enter-delay" as string]: "0ms",
              ["--hero-stat-bounce-delay" as string]: "0s",
            } as CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm",
          innerClassName ?? "bg-white/20",
          iconBounce && "animate-icon-bounce motion-reduce:animate-none"
        )}
      >
        {Icon ? (
          <Icon
            className={cn("h-7 w-7", iconColor)}
            strokeWidth={iconStrokeWidth}
          />
        ) : null}
      </div>
    </div>
  );
}
