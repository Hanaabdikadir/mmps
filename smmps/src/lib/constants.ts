/** Single market location for all price records */
export const MARKET_LOCATION = "Mogadishu";

export const ANIMAL_TYPES = [
  { value: "CAMEL", label: "Camel" },
  { value: "CATTLE", label: "Cattle" },
  { value: "GOAT", label: "Goat" },
] as const;

/** Only professionals / service-provider rates are used system-wide. */
export const UTILITY_SERVICE_TYPE = "SERVICE_PROVIDER" as const;

export const WATER_TYPES = [
  { value: UTILITY_SERVICE_TYPE, label: "Professionals" },
] as const;

export const ELECTRICITY_TYPES = [
  { value: UTILITY_SERVICE_TYPE, label: "Professionals" },
] as const;

export const SECTORS = [
  { id: "livestock", label: "Livestock", href: "/livestock" },
  { id: "water", label: "Water Supply", href: "/water" },
  { id: "electricity", label: "Electricity", href: "/electricity" },
] as const;
