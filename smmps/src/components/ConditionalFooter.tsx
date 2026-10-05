"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { MMPS_SUPPORT_EMAIL } from "@/lib/home-content";

const FOOTER_HIDDEN_PATHS = [
  "/login",
  "/register",
  "/account",
  "/forgot-password",
  "/reset-password",
  "/livestock/types",
];

export function ConditionalFooter({
  supportEmail = MMPS_SUPPORT_EMAIL,
}: {
  supportEmail?: string;
}) {
  const pathname = usePathname();

  if (
    FOOTER_HIDDEN_PATHS.includes(pathname) ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/broker")
  ) {
    return null;
  }

  return <Footer supportEmail={supportEmail} />;
}
