import { LivestockBrokerProfilePanel } from "@/components/livestock-admin/LivestockBrokerProfilePanel";

export const dynamic = "force-dynamic";

export default async function SuperAdminBrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LivestockBrokerProfilePanel brokerId={Number(id)} />;
}
