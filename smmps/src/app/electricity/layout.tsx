import { MarketSectorLayout } from "@/components/MarketSectorLayout";

export const revalidate = 30;

export default function ElectricityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketSectorLayout
      sector="electricity"
      sectorEn="Electricity"
      sectorSo="Korontada"
    >
      {children}
    </MarketSectorLayout>
  );
}
