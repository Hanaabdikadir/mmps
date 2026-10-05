"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { authPortalHeaders } from "@/lib/auth-portal";

export function ConditionalHeader() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith("/admin");
  const isSuperPath = pathname.startsWith("/super-admin");
  const isBrokerPath = pathname.startsWith("/broker");
  // Assume company shell until /api/auth/me says otherwise — avoids header flash/lag.
  const [showSiteHeaderOnAdmin, setShowSiteHeaderOnAdmin] = useState(false);

  useEffect(() => {
    if (!isAdminPath) {
      setShowSiteHeaderOnAdmin(false);
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 2500);

    fetch("/api/auth/me", {
      signal: ctrl.signal,
      headers: authPortalHeaders("admin"),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const user = d.user;
        const isCompanyAdmin =
          Boolean(user?.companySlug) && user?.role === "COMPANY_ADMIN";
        setShowSiteHeaderOnAdmin(!isCompanyAdmin);
      })
      .catch(() => {
        if (!cancelled) setShowSiteHeaderOnAdmin(false);
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [isAdminPath, pathname]);

  // Portal shells own their chrome — never show the public site header on them
  if (isSuperPath || isBrokerPath) return null;
  if (isAdminPath && !showSiteHeaderOnAdmin) return null;

  return <Header />;
}
