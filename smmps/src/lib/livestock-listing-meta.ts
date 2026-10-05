export function normalizeAgeClass(raw?: string | null): string {
  const value = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (value.toUpperCase() === "YAR" || value.toUpperCase() === "YOUNG") return "Yar";
  if (value.toUpperCase() === "WEYN" || value.toUpperCase() === "ADULT") return "Weyn";
  return value;
}

/** Compare "1 jir", "1jir", "1 sano", and "1" as the same age. */
export function ageClassKey(raw?: string | null): string {
  const age = normalizeAgeClass(raw).toLowerCase();
  if (!age) return "";
  const num = age.match(/\d+(?:\.\d+)?/)?.[0] || "";
  const rest = age
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[.\-]/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, "")
    .trim();
  const yearUnit = !rest || /^(jir|jiir|iir|sano|sanad|year|years|yr|yrs)$/.test(rest);
  if (num && yearUnit) return `y:${num}`;
  return age.replace(/\s+/g, "");
}

export function sameAgeClass(a?: string | null, b?: string | null): boolean {
  const left = ageClassKey(a);
  const right = ageClassKey(b);
  return Boolean(left && right && left === right);
}

export function defaultAgeClass(_typeName?: string): string {
  return "";
}

export function normalizeOriginPlace(raw?: string | null): string {
  const value = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 80);
  // Place name only — bare numbers (e.g. "2") are not a valid origin.
  if (!value || /^\d+(\.\d+)?$/.test(value)) return "";
  return value;
}

export function ageClassLabel(id: string | null | undefined, lang: "en" | "so") {
  const age = normalizeAgeClass(id);
  if (!age) return "";
  const lower = age.toLowerCase();
  if (lower === "yar" || lower === "young") return lang === "so" ? "Yar" : "Young";
  if (lower === "weyn" || lower === "adult") return lang === "so" ? "Weyn" : "Adult";

  const num = age.match(/\d+(?:\.\d+)?/)?.[0] || "";
  const rest = age
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[.\-]/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
  const yearUnit = !rest || /^(jir|jiir|iir|sano|sanad|year|years|yr|yrs)$/.test(rest);
  if (num && yearUnit) {
    if (lang === "so") return `${num}jir`;
    return num === "1" ? "1 year" : `${num} years`;
  }
  return age;
}

export function originPlaceKey(raw?: string | null): string {
  return normalizeOriginPlace(raw).toLowerCase();
}

export function sameOriginPlace(a?: string | null, b?: string | null): boolean {
  const left = originPlaceKey(a);
  const right = originPlaceKey(b);
  return Boolean(left && right && left === right);
}

export function originPlaceLabel(id: string | null | undefined, _lang?: "en" | "so") {
  return normalizeOriginPlace(id);
}
