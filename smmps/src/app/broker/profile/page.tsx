import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LivestockBrokerProfilePanel } from "@/components/livestock-admin/LivestockBrokerProfilePanel";
import { isLivestockManagerBroker } from "@/lib/livestock-manager-broker";

export const dynamic = "force-dynamic";

export default async function BrokerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLivestockManagerBroker(user) || !user.brokerId) {
    redirect("/broker");
  }

  return <LivestockBrokerProfilePanel brokerId={user.brokerId} />;
}
