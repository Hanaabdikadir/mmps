import {
  getAllRecentPrices,
  getApprovedCompaniesForManagement,
  getMarketPriceStats,
  getPendingMarketPrices,
} from "@/lib/super-admin-service";
import { MarketPricesPanel } from "@/components/super-admin/MarketPricesPanel";
import { PendingPricesPanel } from "@/components/super-admin/PendingPricesPanel";

export const dynamic = "force-dynamic";

export default async function PricesManagementPage() {
  const [rows, stats, companies, pendingPrices] = await Promise.all([
    getAllRecentPrices(60),
    getMarketPriceStats(),
    getApprovedCompaniesForManagement(),
    getPendingMarketPrices(),
  ]);

  const livestockPending = pendingPrices.filter((p) => p.sector === "Livestock");
  const livestockCompanies = companies.filter((c) => c.sector === "Livestock");

  return (
    <div className="space-y-8">
      {livestockPending.length > 0 ? (
        <PendingPricesPanel initialPrices={livestockPending} livestockOnly />
      ) : null}
      <MarketPricesPanel
        rows={rows}
        companies={livestockCompanies}
        stats={stats}
      />
    </div>
  );
}
