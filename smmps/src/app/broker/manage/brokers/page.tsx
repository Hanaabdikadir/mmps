import { LivestockBrokersPanel } from "@/components/livestock-admin/LivestockBrokersPanel";

export const dynamic = "force-dynamic";

export default function BrokerManageBrokersPage() {
  return <LivestockBrokersPanel profileBase="/broker/manage/brokers" />;
}
