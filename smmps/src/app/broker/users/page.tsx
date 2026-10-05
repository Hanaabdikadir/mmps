import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { brokerHomeHref } from "@/lib/livestock-manager-broker";

export const dynamic = "force-dynamic";

/** Users & Roles for livestock are managed by Super Admin. */
export default async function BrokerUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(brokerHomeHref(user));
}
