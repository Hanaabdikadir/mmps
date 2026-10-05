"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keep the active in-page tab in the URL (`?tab=…`) so a refresh
 * stays on the same screen instead of jumping back to the default.
 */
export function useUrlTab<T extends string>(
  allowed: readonly T[],
  fallback: T,
  param = "tab"
): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const allowedSet = useMemo(() => new Set<string>(allowed), [allowed]);

  const parse = useCallback(
    (raw: string | null): T =>
      raw && allowedSet.has(raw) ? (raw as T) : fallback,
    [allowedSet, fallback]
  );

  const fromUrl = parse(searchParams.get(param));
  const [tab, setTabState] = useState<T>(fromUrl);

  useEffect(() => {
    setTabState(fromUrl);
  }, [fromUrl]);

  const setTab = useCallback(
    (next: T) => {
      const value = allowedSet.has(next) ? next : fallback;
      setTabState(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === fallback) params.delete(param);
      else params.set(param, value);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [allowedSet, fallback, param, pathname, router, searchParams]
  );

  return [tab, setTab];
}
