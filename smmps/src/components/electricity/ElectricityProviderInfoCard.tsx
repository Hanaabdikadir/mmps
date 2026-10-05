import Image from "next/image";
import { Info } from "lucide-react";
import type { ElectricityProviderMeta } from "@/lib/electricity-data";
import { ELECTRICITY_PROVIDER_CARD_THEMES } from "@/lib/electricity-data";
import { cn } from "@/lib/utils";

const BULLET_COLORS = [
  "bg-amber-500",
  "bg-amber-400",
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-blue-600",
] as const;

export function ElectricityProviderInfoCard({
  provider,
}: {
  provider: ElectricityProviderMeta;
}) {
  if (!provider.infoBrief) return null;

  const blendLogo =
    !provider.imageBg || provider.imageBg === "bg-white";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md",
        ELECTRICITY_PROVIDER_CARD_THEMES.info.border
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-2",
          ELECTRICITY_PROVIDER_CARD_THEMES.info.headerBg
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50">
          <Info className="h-4 w-4 text-amber-600" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-sm font-black leading-tight text-white">
            {provider.infoTitle ?? "Company Info"}
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
            {provider.infoBrief}
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
