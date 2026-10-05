"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared card chrome for post-register / account status screens — login-matched height. */
export const AUTH_RESULT_CARD_CLASS =
  "relative mx-auto flex w-full max-w-[26rem] shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-emerald-200 bg-white shadow-sm shadow-emerald-900/5";

/**
 * Full main-area shell that centers a max-width card (login-style viewport lock).
 * Use for register submit/success and /account — not inside the register split layout.
 * Locks to one viewport: no page scroll at 100% zoom.
 */
export function AuthCenteredResultShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100dvh";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, []);

  return (
    <div
      className={cn(
        "register-result-shell relative box-border flex h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden",
        "px-3 py-3 min-[360px]:px-4 sm:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}
