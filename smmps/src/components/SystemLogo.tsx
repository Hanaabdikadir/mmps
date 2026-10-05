import Image from "next/image";
import { cn } from "@/lib/utils";

/** Official MMPS brand mark */
export const SYSTEM_LOGO_SRC = "/images/brand/mmps-logo.png";

type LogoSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<LogoSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10 sm:h-11 sm:w-11",
  lg: "h-12 w-12 sm:h-14 sm:w-14",
  xl: "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
};

interface SystemLogoProps {
  size?: LogoSize;
  className?: string;
  /** Soft float for hero */
  animate?: boolean;
  priority?: boolean;
}

/**
 * Official MMPS logo — market chart with water, electricity, and livestock marks.
 */
export function SystemLogo({
  size = "md",
  className,
  animate = false,
  priority = false,
}: SystemLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden",
        SIZE[size],
        animate && "animate-float",
        className
      )}
    >
      <Image
        src={SYSTEM_LOGO_SRC}
        alt="MMPS"
        fill
        sizes="(max-width: 768px) 64px, 80px"
        className="object-contain object-center"
        priority={priority}
        unoptimized
      />
    </span>
  );
}
