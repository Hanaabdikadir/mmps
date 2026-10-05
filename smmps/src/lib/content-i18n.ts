import { ageClassLabel, normalizeAgeClass } from "@/lib/livestock-listing-meta";
import {
  adminLivestockName,
  livestockTypeLabel,
} from "@/lib/livestock-data";
import { DEFAULT_LIVESTOCK_CATEGORIES } from "@/lib/livestock-catalog";
import { publicPlanName } from "@/lib/pricing-plans";

export type ContentLang = "en" | "so";

type TermPair = { en: string; so: string };

function normKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

export function guessContentLang(raw: string | null | undefined): ContentLang {
  const text = String(raw || "").trim();
  if (!text) return "en";

  if (/[’']/.test(text)) return "so";

  const soHit =
    /\b(waa|waxaa|waxay|wuxuu|waxaan|ahaan|ahay|yihiin|yahay|oo|ee|ku|ka|la|uga|ugu|iyo|ama|haddii|marka|fadlan|mahadsanid|shirkad|shirkadda|madal|biyo|biyaha|koronto|korontada|xoolaha|suuq|suuqa|dilaal|bilaash|geel|awr|hal|sac|dibi|waxar|sabeen|birimo|sugunto|maalmood|bilood|jir|jiir|bixiya|bixisaa|adeeg|adeegyo|muqdisho|soomaaliya|qof|dad|magaalada|gobolka|degmada|lacag|qiimo|qiimaha|cusub|horay|haan|ahaan|sida|ahaan|ugu|uga|loo|loo|loo)\b/i.test(
      text
    ) || /[cC]aysan|[Qq]urbac|[Bb]aarqab|[Nn]eyl|[Ww]eyl/.test(text);

  if (soHit) return "so";

  const enHit =
    /\b(the|and|with|from|price|market|camel|cattle|year|years|month|months|free|all|provides|services|water|electricity|company|platform|this|that|for|are|is|a|an|of|to|in|on)\b/i.test(
      text
    );
  if (enHit) return "en";

  // Unknown Latin free text with Somali-like vowels → treat as Somali
  if (/\b\w*(aa|ee|oo|ii|uu)\w*\b/i.test(text)) return "so";

  // Short unknown phrases: assume Somali so EN UI still triggers Autodetect translate
  if (text.split(/\s+/).length <= 16) return "so";

  return "en";
}

const EXTRA_TERMS: TermPair[] = [
  { en: "platform", so: "madal" },
  { en: "Platform", so: "Madal" },
  { en: "water", so: "biyo" },
  { en: "Water", so: "Biyo" },
  { en: "is a", so: "waa" },
  { en: "is a water platform", so: "waa madal biyo" },
  { en: "is a water company", so: "waa shirkad biyo" },
  { en: "Livestock", so: "Xoolaha" },
  { en: "Electricity", so: "Korontada" },
  { en: "Water", so: "Biyaha" },
  { en: "Camels", so: "Geel" },
  { en: "Cattle", so: "Lo'" },
  { en: "Sheep & Goats", so: "Ari & Ido" },
  { en: "Sheep and Goats", so: "Ari & Ido" },
  { en: "Free", so: "Bilaash" },
  { en: "1 Month", so: "1 Bil" },
  { en: "3 Months", so: "3 Bilood" },
  { en: "6 Months", so: "6 Bilood" },
  { en: "1 Year", so: "1 Sano" },
  { en: "Month", so: "Bil" },
  { en: "Months", so: "Bilood" },
  { en: "Year", so: "Sano" },
  { en: "Years", so: "Sanooyin" },
  { en: "days", so: "maalmood" },
  { en: "Day", so: "Maalin" },
  { en: "Price Calculator", so: "Xisaabiyaha qiimaha" },
  { en: "Current Electricity Rate", so: "Qiimaha korontada ee hadda" },
  { en: "Current Water Rate", so: "Qiimaha biyaha ee hadda" },
  { en: "Current Price", so: "Qiimaha Hadda" },
  { en: "Current Rate", so: "Qiimaha hadda" },
  { en: "Price History", so: "Taariikhda qiimaha" },
  { en: "Rate Changes", so: "Isbeddellada qiimaha" },
  { en: "Full Price History", so: "Taariikhda qiimaha oo buuxa" },
  { en: "Detailed Reports", so: "Warbixino faahfaahsan" },
  { en: "All features", so: "Dhammaan features-ka" },
  { en: "All markets", so: "Dhammaan suuqyada" },
  { en: "All livestock types", so: "Dhammaan noocyada xoolaha" },
  { en: "Young", so: "Yar" },
  { en: "Adult", so: "Weyn" },
  { en: "Market", so: "Suuq" },
  { en: "Markets", so: "Suuqyo" },
  { en: "Broker", so: "Dilaal" },
  { en: "Company", so: "Shirkad" },
  { en: "First Class", so: "Birimo" },
  { en: "Second Class", so: "Sugunto" },
  { en: "Birimo", so: "Birimo" },
  { en: "Sugunto", so: "Sugunto" },
];

const TERM_BY_KEY: Map<string, TermPair> = (() => {
  const map = new Map<string, TermPair>();
  const add = (en: string, so: string) => {
    const pair = { en: en.trim(), so: so.trim() };
    if (!pair.en || !pair.so) return;
    map.set(normKey(pair.en), pair);
    map.set(normKey(pair.so), pair);
  };

  for (const t of EXTRA_TERMS) add(t.en, t.so);

  for (const cat of DEFAULT_LIVESTOCK_CATEGORIES) {
    add(cat.name, cat.nameSomali);
    for (const type of cat.types) {
      add(type.name, type.nameSomali);
    }
  }

  return map;
})();

function lookupTerm(raw: string, lang: ContentLang): string | null {
  const pair = TERM_BY_KEY.get(normKey(raw));
  if (!pair) return null;
  return lang === "so" ? pair.so : pair.en;
}

function looksLikeAge(raw: string): boolean {
  const age = normalizeAgeClass(raw);
  if (!age) return false;
  const lower = age.toLowerCase();
  if (lower === "yar" || lower === "young" || lower === "weyn" || lower === "adult") {
    return true;
  }
  return /\d/.test(age) && /(jir|jiir|sano|sanad|year|yr|yrs)/i.test(age);
}

export function resolveBilingualTerm(raw: string | null | undefined): {
  en: string;
  so: string;
} {
  const text = String(raw || "").trim();
  if (!text) return { en: "", so: "" };

  if (looksLikeAge(text)) {
    return {
      en: ageClassLabel(text, "en") || text,
      so: ageClassLabel(text, "so") || text,
    };
  }

  const pair = TERM_BY_KEY.get(normKey(text));
  if (pair) return { en: pair.en, so: pair.so };

  const so = livestockTypeLabel(text, "so") || text;
  const en = livestockTypeLabel(text, "en") || text;
  if (normKey(so) !== normKey(en)) return { en, so };

  return { en: text, so: text };
}

export function localizeContent(
  raw: string | null | undefined,
  lang: ContentLang
): string {
  const text = String(raw || "").trim();
  if (!text) return "";

  if (looksLikeAge(text)) {
    return ageClassLabel(text, lang) || text;
  }

  const exact = lookupTerm(text, lang);
  if (exact) return exact;

  const so = livestockTypeLabel(text, "so") || text;
  const en = livestockTypeLabel(text, "en") || text;
  if (normKey(so) !== normKey(en)) {
    return lang === "so" ? so : en;
  }

  if (/livestock|electricity|water|xoolaha|korontada|biyaha/i.test(text)) {
    const named = publicPlanName(text, lang);
    if (named && normKey(named) !== normKey(text)) return named;
    if (lang === "so" && named !== text) return named;
  }

  return text;
}

export function isKnownTerminology(raw: string | null | undefined): boolean {
  const text = String(raw || "").trim();
  if (!text) return true;
  if (looksLikeAge(text)) return true;
  if (lookupTerm(text, "en") || lookupTerm(text, "so")) return true;
  const pair = resolveBilingualTerm(text);
  return Boolean(pair.en && pair.so && normKey(pair.en) !== normKey(pair.so));
}

export function localizeNamed(
  name: string | null | undefined,
  nameSomali: string | null | undefined,
  lang: ContentLang
): string {
  const fromAdmin = adminLivestockName(name, nameSomali, lang);
  if (fromAdmin) return localizeContent(fromAdmin, lang);
  return localizeContent(nameSomali || name, lang);
}

export function resolveDescriptionSource(
  description?: string | null,
  descriptionSo?: string | null
):
  | { mode: "pair"; en: string; so: string }
  | { mode: "single"; text: string } {
  const en = String(description || "").trim();
  const so = String(descriptionSo || "").trim();
  if (!en && !so) return { mode: "single", text: "" };
  if (!en) return { mode: "single", text: so };
  if (!so) return { mode: "single", text: en };
  if (normKey(en) === normKey(so)) return { mode: "single", text: en };

  // Classic seed pair only — admin overrides often leave a stale descriptionSo.
  if (guessContentLang(en) === "en" && guessContentLang(so) === "so") {
    return { mode: "pair", en, so };
  }

  // Prefer the editable `description` field (what company admin saves).
  return { mode: "single", text: en };
}
