import { MarketSectorLayout } from "@/components/MarketSectorLayout";

export const dynamic = "force-dynamic";

export default function LivestockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketSectorLayout
      sector="livestock"
      sectorEn="Livestock"
      sectorSo="Xoolaha"
    >
      {children}
    </MarketSectorLayout>
  );
}
