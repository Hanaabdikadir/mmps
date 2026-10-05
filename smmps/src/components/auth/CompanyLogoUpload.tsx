"use client";

import { useRef } from "react";
import { Building2, ImagePlus, Trash2 } from "lucide-react";
import { StablePair } from "@/components/ui/StableBilingual";
import { useLang, TRANSLATIONS } from "@/lib/language-context";

export function CompanyLogoUpload({
  file,
  previewUrl,
  onChange,
}: {
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={
        file
          ? "rounded-2xl border border-emerald-500 bg-emerald-50/50 p-4 ring-1 ring-emerald-200/80"
          : "rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4"
      }
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewUrl}
              src={previewUrl}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <Building2 className="h-10 w-10 text-emerald-300" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-bold text-gray-900">
            {copy.companyLogo[lang]} <span className="text-red-500">*</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {copy.companyLogoUploadHint[lang]}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {copy.fileHintImage[lang]}
          </p>
          {file ? (
            <p className="mt-2 break-all text-xs font-semibold leading-snug text-emerald-700">
              {file.name}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => {
                onChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <ImagePlus className="h-4 w-4 shrink-0" />
              <StablePair pair={file ? copy.replace : copy.upload} lang={lang} />
            </button>
            {file ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-gray-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <StablePair pair={copy.remove} lang={lang} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
