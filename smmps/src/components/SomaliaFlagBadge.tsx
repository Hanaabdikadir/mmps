import { cn } from "@/lib/utils";

/** Somalia — light blue field, white star (approx. official proportions). */
export function SomaliaFlagBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 16" className="h-4 w-6" role="img" aria-label="Somalia">
        <rect width="24" height="16" fill="#4189DD" />
        <path
          fill="#FFFFFF"
          d="M12 3.2l1.05 3.23h3.4l-2.75 2 1.05 3.23L12 9.66 9.25 11.66l1.05-3.23-2.75-2h3.4z"
        />
      </svg>
    </span>
  );
}
