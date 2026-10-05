import Image from "next/image";
import { Info } from "lucide-react";
import type { WaterProviderMeta } from "@/lib/water-data";
import { WATER_PROVIDER_CARD_THEMES } from "@/lib/water-data";
import { cn } from "@/lib/utils";

const BULLET_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-teal-500",
  "bg-green-600",
] as const;

export function WaterProviderInfoCard({ provider }: { provider: WaterProviderMeta }) {
  const brief =
    provider.infoBrief?.trim() ||
    provider.description?.trim() ||
    `${provider.name} supplies water in Mogadishu and publishes live rates on MMPS.`;
  const title = provider.infoTitle?.trim() || "Company Info";

  const blendLogo =
    !provider.imageBg || provider.imageBg === "bg-white";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md",
        WATER_PROVIDER_CARD_THEMES.info.border
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-2",
          WATER_PROVIDER_CARD_THEMES.info.headerBg
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50">
          <Info className="h-4 w-4 text-emerald-700" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-tight text-white">
            {title}
          </h2>
          <p className="text-[10px] text-white/80">
            Macluumaad · {provider.acronym ?? provider.somali}
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-3 text-center">
          {provider.image ? (
            <div className="flex h-24 w-full max-w-[280px] shrink-0 items-center justify-center">
              <Image
                src={provider.image}
                alt={provider.name}
                width={provider.imageWidth ?? 280}
                height={provider.imageHeight ?? 96}
                unoptimized={provider.image.startsWith("/")}
                className={cn(
                  "h-24 w-full object-contain object-center",
                  blendLogo && "mix-blend-multiply"
                )}
              />
            </div>
          ) : null}
          <p className="line-clamp-5 max-w-sm text-sm leading-relaxed text-gray-600">
            {brief}
          </p>
        </div>
        {provider.infoPoints && provider.infoPoints.length > 0 ? (
          <ul className="max-h-[11rem] shrink-0 space-y-1.5 overflow-y-auto border-t border-gray-100 px-4 py-2.5">
            {provider.infoPoints.map((point, index) => (
              <li
                key={point}
                className="flex items-start gap-2 text-xs leading-snug text-gray-600"
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    BULLET_COLORS[index % BULLET_COLORS.length]
                  )}
                />
                {point}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
