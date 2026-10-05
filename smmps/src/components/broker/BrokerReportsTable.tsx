"use client";

import { DataTable } from "@/components/ui/DataTable";
import { PrintButton } from "@/components/ui/PrintButton";
import { useLang } from "@/lib/language-context";

export type BrokerReportRow = {
  id: number;
  animalType: string;
  category: string;
  marketLocation: string;
  price: string;
  dateRecorded: string;
  status: string;
};

export function BrokerReportsTable({ rows }: { rows: BrokerReportRow[] }) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">{t("Reports", "Warbixinno")}</h2>
          <p className="text-sm text-slate-500">{t("Your livestock price history", "Taariikhda qiimaha xoolahaaga")}</p>
        </div>
        <PrintButton label={t("Print", "Daabac")} />
      </div>
      <DataTable
        rows={rows}
        emptyText={t("No data.", "Xog ma jirto.")}
        columns={[
          { key: "animalType", header: t("Type", "Nooca") },
          { key: "category", header: t("Category", "Qaybta") },
          { key: "marketLocation", header: t("Market", "Suuqa") },
          { key: "price", header: t("Price", "Qiimaha") },
          { key: "dateRecorded", header: t("Date", "Taariikhda") },
        ]}
      />
    </div>
  );
}
