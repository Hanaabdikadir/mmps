export type Lang = "en" | "so";

export function parseLang(value: string | undefined | null): Lang {
  return value === "so" ? "so" : "en";
}
