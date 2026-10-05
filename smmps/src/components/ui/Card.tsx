import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--card-border)] bg-[var(--card)]",
        "shadow-[var(--shadow)]",
        hover && "transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
