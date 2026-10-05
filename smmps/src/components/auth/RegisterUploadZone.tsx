"use client";

import { useId, useRef } from "react";
import { FileUp, ImagePlus, Trash2, type LucideIcon } from "lucide-react";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const ACCENTS = {
  teal: {
    idleIcon: "bg-teal-50 text-teal-600",
    doneIcon: "bg-teal-100 text-teal-700",
    borderIdle: "border-2 border-emerald-200 bg-gray-50/60 hover:border-teal-300 hover:bg-teal-50/30",
    borderDone: "border-teal-500 bg-teal-50/40 ring-1 ring-teal-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-teal-300",
    button: "border-teal-600 text-teal-800 hover:bg-teal-50",
    fileName: "text-teal-800",
    buttonIcon: "text-teal-600",
  },
  violet: {
    idleIcon: "bg-violet-50 text-violet-600",
    doneIcon: "bg-violet-100 text-violet-700",
    borderIdle: "border-gray-300 bg-gray-50/60 hover:border-violet-300 hover:bg-violet-50/30",
    borderDone: "border-violet-500 bg-violet-50/40 ring-1 ring-violet-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-violet-300",
    button: "border-violet-600 text-violet-800 hover:bg-violet-50",
    fileName: "text-violet-800",
    buttonIcon: "text-violet-600",
  },
  green: {
    idleIcon: "bg-green-50 text-[#00A84E]",
    doneIcon: "bg-green-100 text-[#00A84E]",
    borderIdle: "border-gray-300 bg-gray-50/60 hover:border-green-300 hover:bg-green-50/30",
    borderDone: "border-[#00A84E] bg-green-50/40 ring-1 ring-green-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-green-300",
    button: "border-[#00A84E] text-green-900 hover:bg-green-50",
    fileName: "text-[#00A84E]",
    buttonIcon: "text-[#00A84E]",
  },
  sky: {
    idleIcon: "bg-sky-50 text-sky-600",
    doneIcon: "bg-sky-100 text-sky-700",
    borderIdle: "border-gray-300 bg-gray-50/60 hover:border-sky-300 hover:bg-sky-50/30",
    borderDone: "border-sky-500 bg-sky-50/40 ring-1 ring-sky-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-sky-300",
    button: "border-sky-600 text-sky-800 hover:bg-sky-50",
    fileName: "text-sky-800",
    buttonIcon: "text-sky-600",
  },
  amber: {
    idleIcon: "bg-amber-50 text-amber-600",
    doneIcon: "bg-amber-100 text-amber-700",
    borderIdle: "border-gray-300 bg-gray-50/60 hover:border-amber-300 hover:bg-amber-50/30",
    borderDone: "border-amber-500 bg-amber-50/40 ring-1 ring-amber-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-amber-300",
    button: "border-amber-600 text-amber-900 hover:bg-amber-50",
    fileName: "text-amber-800",
    buttonIcon: "text-amber-600",
  },
  indigo: {
    idleIcon: "bg-indigo-50 text-indigo-600",
    doneIcon: "bg-indigo-100 text-indigo-700",
    borderIdle: "border-gray-300 bg-gray-50/60 hover:border-indigo-300 hover:bg-indigo-50/30",
    borderDone: "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-200/80",
    thumbBorderIdle: "border-emerald-200",
    thumbBorderDone: "border-indigo-300",
    button: "border-indigo-600 text-indigo-800 hover:bg-indigo-50",
    fileName: "text-indigo-800",
    buttonIcon: "text-indigo-600",
  },
} as const;

export type RegisterUploadAccent = keyof typeof ACCENTS;

export function RegisterUploadZone({
  label,
  description,
  hint,
  accept = "image/png,image/jpeg,image/jpg,application/pdf",
  file,
  previewUrl,
  onChange,
  required,
  imageOnly,
  icon: Icon,
  accent = "teal",
  error,
  zoneId,
}: {
  label: string;
  description?: string;
  hint?: string;
  accept?: string;
  file: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  imageOnly?: boolean;
  icon?: LucideIcon;
  accent?: RegisterUploadAccent;
  error?: string;
  zoneId?: string;
}) {
  const { lang } = useLang();
  const copy = TRANSLATIONS.register;
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = zoneId ?? generatedId;
  const ZoneIcon = Icon ?? (imageOnly ? ImagePlus : FileUp);
  const showImagePreview = Boolean(previewUrl && imageOnly);
  const theme = ACCENTS[accent];
  const resolvedHint = hint ?? copy.fileHintDocsOr[lang];
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div
      id={zoneId}
      className={cn(
        "rounded-2xl border border-dashed p-4 transition",
        error
          ? "border-red-300 bg-red-50/40"
          : file
            ? theme.borderDone
            : theme.borderIdle
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white",
            file ? theme.thumbBorderDone : theme.thumbBorderIdle
          )}
        >
          {showImagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl!}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                file ? theme.doneIcon : theme.idleIcon
              )}
            >
              <ZoneIcon className="h-6 w-6" strokeWidth={1.85} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
            {!required ? (
              <span className="ml-1 text-xs font-semibold text-gray-400">
                ({copy.optional[lang]})
              </span>
            ) : null}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              {description}
            </p>
          ) : null}
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {resolvedHint}
          </p>
          {file ? (
            <p className={cn("mt-2 break-all text-xs font-semibold leading-snug", theme.fileName)}>
              {file.name}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              tabIndex={-1}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
              onChange={(e) => {
                onChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold",
                theme.button
              )}
            >
              <ZoneIcon className={cn("h-4 w-4", theme.buttonIcon)} />
              {file ? copy.replace[lang] : copy.upload[lang]}
            </button>
            {file ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-gray-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {copy.remove[lang]}
              </button>
            ) : null}
          </div>
          {error ? (
            <p id={errorId} className="mt-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
