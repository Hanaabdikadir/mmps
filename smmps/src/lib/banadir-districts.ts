/** Administrative districts of Banadir Region (Mogadishu), Somalia. */
export const BANADIR_DISTRICTS = [
  "Abdiaziz",
  "Bondhere",
  "Daynile",
  "Dharkenley",
  "Hamar-Jajab",
  "Hamar-Weyne",
  "Heliwa",
  "Hodan",
  "Howlwadaag",
  "Kaxda",
  "Karaan",
  "Shangani",
  "Shibis",
  "Waberi",
  "Wadajir",
  "Wardhiigley",
  "Yaaqshiid",
] as const;

export type BanadirDistrict = (typeof BANADIR_DISTRICTS)[number];

/** Alternate spellings / spacing → canonical Banadir district name. */
const BANADIR_DISTRICT_ALIASES: Record<string, BanadirDistrict> = {
  abdiaziz: "Abdiaziz",
  "abdi aziz": "Abdiaziz",
  "abdi-aziz": "Abdiaziz",
  abdiaziiz: "Abdiaziz",
  bondhere: "Bondhere",
  bondheere: "Bondhere",
  boondheere: "Bondhere",
  boondhere: "Bondhere",
  daynile: "Daynile",
  dharkenley: "Dharkenley",
  "hamar jajab": "Hamar-Jajab",
  "hamar-jajab": "Hamar-Jajab",
  hamarjajab: "Hamar-Jajab",
  "hamar weyne": "Hamar-Weyne",
  "hamar-weyne": "Hamar-Weyne",
  hamarweyne: "Hamar-Weyne",
  heliwa: "Heliwa",
  heliwaa: "Heliwa",
  hiliwaa: "Heliwa",
  hodan: "Hodan",
  howlwadaag: "Howlwadaag",
  holwadag: "Howlwadaag",
  kaxda: "Kaxda",
  karaan: "Karaan",
  kaaraan: "Karaan",
  shangani: "Shangani",
  shangaani: "Shangani",
  shibis: "Shibis",
  waberi: "Waberi",
  wadajir: "Wadajir",
  wardhiigley: "Wardhiigley",
  wardhigley: "Wardhiigley",
  yaaqshiid: "Yaaqshiid",
  yaqshid: "Yaaqshiid",
};

function districtKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");
}

/** Map free text / aliases to the canonical Banadir district name. */
export function normalizeBanadirDistrict(
  value: string
): BanadirDistrict | null {
  const key = districtKey(value);
  if (!key) return null;

  const alias = BANADIR_DISTRICT_ALIASES[key];
  if (alias) return alias;

  const hyphenated = key.replace(/\s+/g, "-");
  const exact = (BANADIR_DISTRICTS as readonly string[]).find(
    (d) => d.toLowerCase() === key || d.toLowerCase() === hyphenated
  );
  return (exact as BanadirDistrict | undefined) ?? null;
}

export function isBanadirDistrict(value: string): value is BanadirDistrict {
  return normalizeBanadirDistrict(value) !== null;
}
