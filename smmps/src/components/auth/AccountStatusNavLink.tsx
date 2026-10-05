"use client";

import Link from "next/link";

/** @deprecated Public email status check removed — applicants sign in instead. */
export function AccountStatusNavLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href="/login" className={className}>
      {children}
    </Link>
  );
}
