import { cn } from "@/lib/utils";

interface WaterSectionTitleProps {
  number: string;
  title: string;
  subtitle?: string;
  accent?: string;
}

export function WaterSectionTitle({
  number,
  title,
  subtitle,
  accent = "from-blue-600 to-amber-500",
}: WaterSectionTitleProps) {
  const hasSubtitle = Boolean(subtitle?.trim());

  return (
    <div
      className={cn(
        "mb-6 flex gap-4",
        hasSubtitle ? "items-start" : "items-center"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base font-black leading-none tracking-tight text-white shadow-md shadow-emerald-900/20",
          accent
        )}
      >
        {number}
      </div>
      <div className={cn(!hasSubtitle && "flex min-h-12 items-center")}>
        <div>
          <h2 className="text-xl font-black leading-none tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {hasSubtitle ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
