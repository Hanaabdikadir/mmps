import { MarketSectorLayout } from "@/components/MarketSectorLayout";

export const revalidate = 30;

export default function WaterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketSectorLayout
      sector="water"
      sectorEn="Water Supply"
      sectorSo="Biyaha"
    >
      {children}
    </MarketSectorLayout>
  );
}
