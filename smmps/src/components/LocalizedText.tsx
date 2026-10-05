"use client";

import { useLang } from "@/lib/language-context";

/** Renders any user text in the active language (dictionary + live translate). */
export function LocalizedText({
  children,
  className,
}: {
  children: string | null | undefined;
  className?: string;
}) {
  const { lc } = useLang();
  const text = children == null ? "" : String(children);
  if (!text) return null;
  return <span className={className}>{lc(text)}</span>;
}
