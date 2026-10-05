import { Beef, Droplets, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: "livestock" | "water" | "electricity" | "updates" | "trend";
  color: "emerald" | "blue" | "amber" | "violet";
}

const icons = {
  livestock: Beef,
  water: Droplets,
  electricity: Zap,
  updates: RefreshCw,
  trend: TrendingUp,
};

const styles = {
  emerald: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-amber-50",
    icon: "bg-gradient-to-br from-blue-600 to-blue-600",
    value: "text-blue-800",
    title: "text-blue-700/80",
  },
  blue: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50",
    icon: "bg-gradient-to-br from-blue-500 to-cyan-600",
    value: "text-blue-800",
    title: "text-blue-700/80",
  },
  amber: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50",
    icon: "bg-gradient-to-br from-amber-500 to-orange-500",
    value: "text-amber-800",
    title: "text-amber-700/80",
  },
  violet: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50",
    icon: "bg-gradient-to-br from-violet-500 to-purple-600",
    value: "text-violet-800",
    title: "text-violet-700/80",
  },
};

export function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const Icon = icons[icon];
  const s = styles[color];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
        s.card
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/40 transition-transform group-hover:scale-110" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className={cn("text-sm font-medium", s.title)}>{title}</p>
          <p className={cn("mt-2 text-3xl font-bold tracking-tight", s.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs opacity-60">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md",
            s.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const avgStyles = {
  emerald: "text-blue-700",
  blue: "text-blue-600",
  amber: "text-amber-600",
};

export function AvgPriceCard({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number | null;
  color: "emerald" | "blue" | "amber";
}) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-white p-5 shadow-[var(--shadow)]">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        30-Day Average
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-700">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", avgStyles[color])}>
        {amount != null ? formatCurrency(Number(amount)) : "—"}
      </p>
    </div>
  );
}
