function keyOf(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const DELIVERED_WATER_KEYS = new Set(["tanker", "taangi", "tank"]);

/** Piped water only — tanker / delivered water is not a market section. */
export function isDeliveredWaterSection(
  name: string,
  marketType?: string | null
): boolean {
  if ((marketType || "").toUpperCase() !== "WATER") return false;
  return DELIVERED_WATER_KEYS.has(keyOf(name));
}

/** Somali (or short) labels → English section names. */
const TO_ENGLISH: Record<string, Record<string, string>> = {
  WATER: {
    guri: "Household",
    household: "Household",
    house: "Household",
    ganacsi: "Commercial",
    commercial: "Commercial",
  },
  ELECTRICITY: {
    guri: "Residential",
    residential: "Residential",
    res: "Residential",
    ganacsi: "Commercial",
    commercial: "Commercial",
    kwh: "Unit kWh",
    "unit kwh": "Unit kWh",
    "unug kwh": "Unit kWh",
    unug: "Unit kWh",
  },
};

/** English display name for a market section. */
export function marketSectionDisplayName(
  name: string,
  marketType?: string | null
): string {
  const type = (marketType || "").toUpperCase();
  const mapped = TO_ENGLISH[type]?.[keyOf(name)];
  return mapped || name;
}

export function shouldRenameMarketSection(
  name: string,
  marketType?: string | null
): string | null {
  const next = marketSectionDisplayName(name, marketType);
  return next !== name ? next : null;
}
