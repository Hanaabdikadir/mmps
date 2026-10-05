import { LivestockBrokersPanel } from "@/components/livestock-admin/LivestockBrokersPanel";

export const dynamic = "force-dynamic";

export default function BrokersPage() {
  return <LivestockBrokersPanel profileBase="/super-admin/brokers" />;
}
