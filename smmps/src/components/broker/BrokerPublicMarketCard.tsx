"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function BrokerPublicMarketCard({
  lang,
  title,
}: {
  markets?: { id: number; name: string }[];
  selectedId?: number | null;
  href?: string;
  lang: "en" | "so";
  title?: string;
}) {
  const heading =
    title?.trim() ||
    (lang === "so" ? "Suuqa Xoolaha" : "Livestock Market");

  return (
    <Link
      href="/livestock"
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-[11.5rem] flex-col rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-white p-5 ring-1 ring-amber-100 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-amber-300"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {lang === "so" ? "Bogga dadweynaha" : "Public page"}
        </p>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
          <ExternalLink className="h-5 w-5" strokeWidth={2.25} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-black leading-tight tracking-tight text-amber-800">
        {heading}
      </p>
    </Link>
  );
}
