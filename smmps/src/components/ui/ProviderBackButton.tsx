"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

export function ProviderBackButton() {
  const router = useRouter();
  const { t } = useLang();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-1 self-start inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:shadow active:scale-95"
      aria-label="Go back"
    >
      <ArrowLeft className="h-3 w-3" strokeWidth={2.5} />
      {t("Back", "Dib u noqo")}
    </button>
  );
}
