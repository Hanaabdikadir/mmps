"use client";

import { useEffect } from "react";

/** Marks <body> so hand-cursor rules apply to portals (menus) outside the shell. */
export function SuperAdminCursorScope() {
  useEffect(() => {
    document.body.classList.add("super-admin-active");
    return () => document.body.classList.remove("super-admin-active");
  }, []);
  return null;
}
