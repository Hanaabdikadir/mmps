"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminSaveButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label: string;
  saving?: boolean;
  saved?: boolean;
  savingLabel?: string;
  savedLabel?: string;
  fullWidth?: boolean;
};

/**
 * Shared admin Save control: dark forest green, press feedback,
 * spinner while saving, checkmark after success.
 */
export function AdminSaveButton({
  label,
  saving = false,
  saved = false,
  savingLabel = "Saving…",
  savedLabel = "Saved successfully",
  fullWidth = false,
  className,
  disabled,
  type = "button",
  ...props
}: AdminSaveButtonProps) {
  const busy = saving || saved;

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={saving || undefined}
      className={cn(
        "admin-save-btn",
        fullWidth && "admin-save-btn--block",
        saving && "admin-save-btn--saving",
        saved && "admin-save-btn--saved",
        className
      )}
      {...props}
    >
      <span className="admin-save-btn__shine" aria-hidden />
      <span className="admin-save-btn__content">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {savingLabel}
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {savedLabel}
          </>
        ) : (
          label
        )}
      </span>
    </button>
  );
}
