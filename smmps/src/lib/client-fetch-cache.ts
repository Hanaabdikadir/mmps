type SectorFlags = {
  livestock: boolean;
  water: boolean;
  electricity: boolean;
};

const DEFAULT_SECTORS: SectorFlags = {
  livestock: true,
  water: true,
  electricity: true,
};

let availabilityInflight: Promise<SectorFlags> | null = null;
let availabilityCache: { at: number; data: SectorFlags } | null = null;

export function fetchMarketAvailabilityCached(): Promise<SectorFlags> {
  const now = Date.now();
  if (availabilityCache && now - availabilityCache.at < 30_000) {
    return Promise.resolve(availabilityCache.data);
  }
  if (availabilityInflight) return availabilityInflight;
  availabilityInflight = fetch("/api/markets/availability")
    .then((r) => r.json())
    .then((d) => {
      const data: SectorFlags = {
        livestock: d.livestock !== false,
        water: d.water !== false,
        electricity: d.electricity !== false,
      };
      availabilityCache = { at: Date.now(), data };
      return data;
    })
    .catch(() => availabilityCache?.data ?? DEFAULT_SECTORS)
    .finally(() => {
      availabilityInflight = null;
    });
  return availabilityInflight;
}
