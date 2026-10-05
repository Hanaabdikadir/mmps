import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { brokerHomeHref } from "@/lib/livestock-manager-broker";

export const dynamic = "force-dynamic";

/** Approvals moved to Super Admin → Livestock Prices. */
export default async function BrokerApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(brokerHomeHref(user));
}
