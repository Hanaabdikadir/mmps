"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, ShieldCheck, Trash2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmTone = "danger" | "warning" | "primary";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

const TONE_UI: Record<
  ConfirmTone,
  { wrap: string; icon: LucideIcon; confirm: string; showTrash: boolean }
> = {
  danger: {
    wrap: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
    icon: Trash2,
    confirm: "bg-rose-600 hover:bg-rose-700",
    showTrash: true,
  },
  warning: {
    wrap: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    icon: Ban,
    confirm: "bg-amber-600 hover:bg-amber-700",
    showTrash: false,
  },
  primary: {
    wrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    icon: ShieldCheck,
    confirm: "bg-emerald-600 hover:bg-emerald-700",
    showTrash: false,
  },
};

/**
 * Branded confirm dialog — replaces native window.confirm / “localhost says…”.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open || !mounted) return null;

  const ui = TONE_UI[tone];
  const Icon = ui.icon;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={busy}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px] transition"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white "
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3.5">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                ui.wrap
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2
                id={titleId}
                className="text-[15px] font-black tracking-tight text-slate-900"
              >
                {title}
              </h2>
              <p
                id={descId}
                className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-500"
              >
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 bg-slate-50/80 px-5 py-4">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-60",
              ui.confirm
            )}
          >
            {ui.showTrash && <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Promise-based confirm — drop-in replacement for window.confirm. */
export function useConfirmDialog() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      title={state?.title ?? ""}
      description={state?.description ?? ""}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      tone={state?.tone}
      onConfirm={() => {
        state?.resolve(true);
        setState(null);
      }}
      onCancel={() => {
        state?.resolve(false);
        setState(null);
      }}
    />
  );

  return { confirm, dialog };
}
