import { Suspense } from "react";
import { MarketSuspendedNotice } from "@/components/MarketSuspendedNotice";
import {
  getPublicMarketAvailabilityCached,
  type PublicMarketSector,
} from "@/lib/market-availability";

async function SectorGate({
  sector,
  sectorEn,
  sectorSo,
  children,
}: {
  sector: PublicMarketSector;
  sectorEn: string;
  sectorSo: string;
  children: React.ReactNode;
}) {
  const open = (await getPublicMarketAvailabilityCached())[sector];
  if (!open) {
    return (
      <MarketSuspendedNotice sectorEn={sectorEn} sectorSo={sectorSo} />
    );
  }
  return children;
}

export function MarketSectorLayout({
  sector,
  sectorEn,
  sectorSo,
  children,
}: {
  sector: PublicMarketSector;
  sectorEn: string;
  sectorSo: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <SectorGate sector={sector} sectorEn={sectorEn} sectorSo={sectorSo}>
        {children}
      </SectorGate>
    </Suspense>
  );
}
