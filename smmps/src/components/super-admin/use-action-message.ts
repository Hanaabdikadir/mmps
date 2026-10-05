"use client";

import { useEffect, useState } from "react";

export type ActionMessage = {
  type: "ok" | "error";
  text: string;
};

/** Action toast — shows once, then clears after `durationMs` (default 2s). */
export function useActionMessage(durationMs = 2000) {
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(
    null
  );

  useEffect(() => {
    if (!actionMessage) return;
    const id = window.setTimeout(() => setActionMessage(null), durationMs);
    return () => window.clearTimeout(id);
  }, [actionMessage, durationMs]);

  return [actionMessage, setActionMessage] as const;
}
