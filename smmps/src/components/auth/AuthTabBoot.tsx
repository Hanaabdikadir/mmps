import { AuthTabSync } from "@/components/auth/AuthTabSync";

/** Keeps this tab's auth slot alive so Super Admin and another admin can stay signed in together. */
export function AuthTabBoot() {
  return <AuthTabSync />;
}
