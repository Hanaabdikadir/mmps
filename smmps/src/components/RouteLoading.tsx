export function RouteLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-blue-100/80 animate-pulse" />
        <span className="relative h-8 w-8 animate-spin rounded-full border-[2.5px] border-blue-200 border-t-blue-700" />
      </div>
      <p className="text-[13px] font-semibold tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
