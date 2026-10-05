export interface LivestockPriceRecord {
  id: number;
  animalType: string;
  price: number;
  dateRecorded: Date;
}

const ANIMAL_BASE_PRICES: Record<string, [number, number]> = {
  CAMEL: [1200, 2500],
  CATTLE: [250, 600],
  GOAT: [80, 180],
  SHEEP: [80, 180],
  POULTRY: [8, 25],
};

/** Deterministic demo prices when MySQL is not available */
export function getFallbackLivestockPrices(): LivestockPriceRecord[] {
  const records: LivestockPriceRecord[] = [];
  let id = 1;
  const animalTypes = ["CAMEL", "CATTLE", "GOAT", "SHEEP", "POULTRY"] as const;

  for (const animalType of animalTypes) {
    const [min, max] = ANIMAL_BASE_PRICES[animalType];
    for (let i = 0; i < 4; i++) {
      const seed = animalType.length + id + i * 17;
      const price = min + ((seed * 47) % 1000) / 1000 * (max - min);

      records.push({
        id: id++,
        animalType,
        price: Math.round(price * 100) / 100,
        dateRecorded: new Date(Date.now() - ((id + i) % 14) * 86400000),
      });
    }
  }

  return records;
}

export function filterLivestockPrices(
  records: LivestockPriceRecord[],
  animalType?: string
): LivestockPriceRecord[] {
  return records.filter((r) => {
    if (animalType && r.animalType !== animalType) return false;
    return true;
  });
}
