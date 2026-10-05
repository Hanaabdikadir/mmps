import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BrokerManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user =
    (await getCurrentUser("broker")) || (await getCurrentUser("super"));
  if (!user) redirect("/login");
  // Legacy LIVESTOCK_BROKER_ADMIN retired — Super Admin only.
  if (!isSuperAdmin(user)) redirect("/broker");
  return children;
}
