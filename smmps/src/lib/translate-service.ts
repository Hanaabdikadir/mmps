/**
 * Translate arbitrary user content EN ↔ SO.
 * 1) MMPS terminology dictionary (exact / livestock / age)
 * 2) Autodetect + MyMemory for any new free text (any Somali / English)
 */
import { createHash } from "crypto";
import {
  guessContentLang,
  isKnownTerminology,
  localizeContent,
  resolveBilingualTerm,
  type ContentLang,
} from "@/lib/content-i18n";

type CacheEntry = { text: string; at: number };
type SourceKey = ContentLang | "auto";

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAX_CACHE = 2000;

function cacheKey(text: string, target: ContentLang, source: SourceKey): string {
  const hash = createHash("sha1")
    .update(`${source}|${text}`)
    .digest("hex")
    .slice(0, 24);
  return `v3:${target}:${hash}`;
}

function getCached(
  text: string,
  target: ContentLang,
  source: SourceKey
): string | null {
  const key = cacheKey(text, target, source);
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.text;
}

function setCached(
  text: string,
  target: ContentLang,
  source: SourceKey,
  translated: string
) {
  if (memoryCache.size >= MAX_CACHE) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
  memoryCache.set(cacheKey(text, target, source), {
    text: translated,
    at: Date.now(),
  });
}

/** Keep brand / company names intact through machine translation. */
function applyProtectPlaceholders(
  text: string,
  protect: string[] | undefined
): { text: string; restore: (out: string) => string } {
  const names = (protect || [])
    .map((n) => String(n || "").trim())
    .filter((n) => n.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) {
    return { text, restore: (out) => out };
  }
  let working = text;
  const map: { token: string; name: string }[] = [];
  names.forEach((name, i) => {
    const token = `__MMPS_NAME_${i}__`;
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (!re.test(working)) return;
    working = working.replace(re, token);
    map.push({ token, name });
  });
  return {
    text: working,
    restore: (out: string) => {
      let restored = out;
      for (const { token, name } of map) {
        restored = restored.split(token).join(name);
      }
      return restored;
    },
  };
}

async function translateViaGoogle(
  text: string,
  target: ContentLang
): Promise<string | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text.slice(0, 1800));
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const out = (data[0] as unknown[])
    .map((part) => (Array.isArray(part) ? String(part[0] || "") : ""))
    .join("")
    .trim();
  if (!out || out.toLowerCase() === text.toLowerCase()) return null;
  return out;
}

async function translateViaMyMemory(
  text: string,
  source: SourceKey,
  target: ContentLang
): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 450));
  url.searchParams.set(
    "langpair",
    source === "auto" ? `Autodetect|${target}` : `${source}|${target}`
  );
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number | string;
  };
  const status = Number(data.responseStatus);
  if (status && status !== 200) return null;
  const out = String(data.responseData?.translatedText || "").trim();
  if (!out || out.toLowerCase() === text.toLowerCase()) return null;
  if (/invalid|error|query length/i.test(out)) return null;
  return out;
}

/**
 * Try Autodetect first (any new SO/EN), then explicit opposite → target.
 */
async function translateFreeText(
  text: string,
  target: ContentLang
): Promise<string | null> {
  const auto = await translateViaMyMemory(text, "auto", target);
  if (auto) return auto;

  const opposite: ContentLang = target === "en" ? "so" : "en";
  const paired = await translateViaMyMemory(text, opposite, target);
  if (paired) return paired;

  return translateViaGoogle(text, target);
}

export type TranslateOptions = {
  /** Proper nouns to keep unchanged (company name, acronym, …). */
  protect?: string[];
};

/**
 * Translate text into target language.
 * Any new Somali or English free text is auto-detected — no fixed word list required.
 */
export async function translateContent(
  raw: string | null | undefined,
  target: ContentLang,
  options?: TranslateOptions
): Promise<string> {
  const text = String(raw || "").trim();
  if (!text) return "";

  // Dictionary / terminology first (instant + correct MMPS terms)
  if (isKnownTerminology(text)) {
    return localizeContent(text, target);
  }

  const { text: protectedText, restore } = applyProtectPlaceholders(
    text,
    options?.protect
  );

  const cached = getCached(protectedText, target, "auto");
  if (cached) return restore(cached);

  try {
    const translated = await translateFreeText(protectedText, target);
    if (translated) {
      const restored = restore(translated);
      const polished = localizeContent(restored, target) || restored;
      setCached(protectedText, target, "auto", polished);
      return polished;
    }
  } catch {
    /* fall through */
  }

  // Heuristic fallback: if our guess says text is already target lang, keep it
  if (guessContentLang(text) === target) return text;
  return text;
}

/** Resolve both EN and SO for storage (catalog, descriptions, …). */
export async function translateToBoth(
  raw: string | null | undefined
): Promise<{ en: string; so: string }> {
  const text = String(raw || "").trim();
  if (!text) return { en: "", so: "" };

  if (isKnownTerminology(text)) {
    return resolveBilingualTerm(text);
  }

  const [en, so] = await Promise.all([
    translateContent(text, "en"),
    translateContent(text, "so"),
  ]);
  return { en: en || text, so: so || text };
}
