import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-sm hover:shadow active:scale-[0.985] active:translate-y-px",
  secondary:
    "bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-sm active:scale-[0.985]",
  outline:
    "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-emerald-50 active:scale-[0.985]",
  ghost:
    "text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.985]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
