import Link from "next/link";
import { Ban } from "lucide-react";

/** Shown when Super Admin has suspended a sector market. */
export function MarketSuspendedNotice({
  sectorEn,
  sectorSo,
}: {
  sectorEn: string;
  sectorSo: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-[#f5faf7] px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-white px-6 py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Ban className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
          {sectorEn} market is temporarily closed
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Suuqa {sectorSo} waa xiran yahay hadda. Fadlan soo noqo marka uu
          dib u furmo.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          This sector was suspended by the system administrator. It will
          reopen when the market is set back to Active.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
