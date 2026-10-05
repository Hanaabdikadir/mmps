import type { Lang } from "@/lib/lang";

const ANIMAL_SO: Record<string, string> = {
  Camel: "Geel",
  Cattle: "Lo'",
  Goat: "Ari",
};

/** Display name for livestock broker portal UI (no Banadir branding). */
export function formatBrokerDisplayName(
  name: string | null | undefined,
  livestockFocus?: string | null,
  lang: Lang = "en"
): string {
  const raw = (name || "").trim();
  const withoutBanadir = raw
    .replace(/\bbanadir\b/gi, "")
    .replace(/\bbanaadir\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const hay = `${withoutBanadir} ${livestockFocus || ""}`.toUpperCase();
  const animals: string[] = [];
  if (hay.includes("CAMEL") || hay.includes("GEEL")) animals.push("Camel");
  if (
    hay.includes("CATTLE") ||
    hay.includes("LODA") ||
    hay.includes("LO'D") ||
    hay.includes("LO’D")
  ) {
    animals.push("Cattle");
  }
  if (
    hay.includes("GOAT") ||
    hay.includes("SHEEP") ||
    hay.includes("ARRI") ||
    hay.includes("ARRIGA")
  ) {
    animals.push("Goat");
  }
  const labeled = animals.map((a) => (lang === "so" ? ANIMAL_SO[a] || a : a));
  const and = lang === "so" ? "iyo" : "and";
  if (labeled.length === 1) return labeled[0]!;
  if (labeled.length === 2) return `${labeled[0]} ${and} ${labeled[1]}`;
  if (labeled.length > 2) {
    return `${labeled.slice(0, -1).join(", ")} ${and} ${labeled[labeled.length - 1]}`;
  }

  const fallback = lang === "so" ? "Dulaal Xoolaha" : "Livestock Broker";
  if (!withoutBanadir) return fallback;

  const simplified = withoutBanadir
    .replace(/\blivestock\s+broker\b/gi, fallback)
    .replace(/\s+broker$/i, "")
    .trim();

  if (!simplified || /^livestock$/i.test(simplified)) {
    return fallback;
  }

  const upper = simplified.toUpperCase();
  if (upper === "CAMEL") return lang === "so" ? "Geel" : "Camel";
  if (upper === "CATTLE") return lang === "so" ? "Lo'" : "Cattle";
  if (upper === "GOAT") return lang === "so" ? "Ari" : "Goat";

  return simplified;
}
