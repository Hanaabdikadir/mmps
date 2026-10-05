import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { canonicalTypeName } from "@/lib/livestock-section-prices";

const STORE_PATH = path.join(process.cwd(), "data", "livestock-type-photos.json");

type SeasonKey = "birimo" | "sugunto";
type PhotoValue = string | { url: string; by?: string };
type NameMap = Record<string, PhotoValue>;
type ListingBucketKey = "listing_birimo" | "listing_sugunto";
type CategoryPhotos = {
  birimo?: NameMap;
  sugunto?: NameMap;
  listing_birimo?: NameMap;
  listing_sugunto?: NameMap;
} & NameMap;

export type LivestockPhotoScope = "card" | "listing";
type PhotoStore = Record<string, CategoryPhotos>;

export type LivestockPhotoMaps = {
  photos: Record<string, string>;
  uploaders: Record<string, string>;
  photosByBroker: Record<string, Record<string, string>>;
};

async function readStore(): Promise<PhotoStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PhotoStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: PhotoStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function photoUrl(value: PhotoValue | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.url || "").trim();
}

function photoBy(value: PhotoValue | undefined): string {
  if (!value || typeof value === "string") return "";
  return String(value.by || "").trim();
}

function addKeys(
  target: NameMap,
  name: string,
  url: string,
  by?: string
) {
  const trimmed = name.trim();
  if (!trimmed || !url) return;
  const next: PhotoValue = by ? { url, by } : url;
  target[trimmed] = next;
  const canonical = canonicalTypeName(trimmed);
  if (canonical) target[canonical] = next;
}

export function photoSeasonKey(season?: string | null): SeasonKey {
  return String(season || "")
    .toLowerCase()
    .includes("sugunto")
    ? "sugunto"
    : "birimo";
}

function isSeasonBucket(key: string): key is SeasonKey {
  return key === "birimo" || key === "sugunto";
}

function isListingBucket(key: string): key is ListingBucketKey {
  return key === "listing_birimo" || key === "listing_sugunto";
}

function listingBucketKey(season: SeasonKey): ListingBucketKey {
  return season === "sugunto" ? "listing_sugunto" : "listing_birimo";
}

function listingNameMap(group: CategoryPhotos, season: SeasonKey): NameMap {
  return asNameMap(group[listingBucketKey(season)]);
}

function listingOwnerKey(brokerId: number, typeName: string) {
  const type = canonicalTypeName(typeName) || typeName.trim();
  return `b${brokerId}:${type}`;
}

function parseListingOwnerKey(key: string): { brokerId: number; typeName: string } | null {
  const match = /^b(\d+):(.+)$/.exec(key);
  if (!match) return null;
  return { brokerId: Number(match[1]), typeName: match[2] };
}

function asNameMap(value: unknown): NameMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: NameMap = {};
  for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw) out[name] = raw;
    else if (raw && typeof raw === "object" && "url" in (raw as object)) {
      const url = photoUrl(raw as PhotoValue);
      if (url) out[name] = raw as PhotoValue;
    }
  }
  return out;
}

function seasonBucket(group: CategoryPhotos, season: SeasonKey): NameMap {
  return asNameMap(group[season]);
}

function legacyNameMap(group: CategoryPhotos): NameMap {
  const out: NameMap = {};
  for (const [name, url] of Object.entries(group)) {
    if (isSeasonBucket(name) || isListingBucket(name)) continue;
    if (typeof url === "string" && url) out[name] = url;
    else if (url && typeof url === "object") out[name] = url as PhotoValue;
  }
  return out;
}

function flatten(map: NameMap): LivestockPhotoMaps {
  const photos: Record<string, string> = {};
  const uploaders: Record<string, string> = {};
  const photosByBroker: Record<string, Record<string, string>> = {};
  for (const [name, value] of Object.entries(map)) {
    const url = photoUrl(value);
    if (!url) continue;
    const owned = parseListingOwnerKey(name);
    if (owned) {
      const brokerKey = String(owned.brokerId);
      photosByBroker[brokerKey] ||= {};
      photosByBroker[brokerKey][owned.typeName] = url;
      const canon = canonicalTypeName(owned.typeName);
      if (canon) photosByBroker[brokerKey][canon] = url;
      continue;
    }
    const keys = [name, canonicalTypeName(name)].filter(Boolean) as string[];
    for (const key of keys) {
      photos[key] = url;
      const by = photoBy(value);
      if (by) uploaders[key] = by;
    }
  }
  return { photos, uploaders, photosByBroker };
}

function mergeMaps(into: LivestockPhotoMaps, extra: LivestockPhotoMaps) {
  Object.assign(into.photos, extra.photos);
  Object.assign(into.uploaders, extra.uploaders);
  for (const [brokerId, photos] of Object.entries(extra.photosByBroker || {})) {
    into.photosByBroker[brokerId] ||= {};
    Object.assign(into.photosByBroker[brokerId], photos);
  }
}

export async function getLivestockTypePhotoMaps(
  slug?: string | null,
  season?: string | null,
  scope: LivestockPhotoScope = "card"
): Promise<LivestockPhotoMaps> {
  const store = await readStore();
  const out: LivestockPhotoMaps = { photos: {}, uploaders: {}, photosByBroker: {} };
  const slugs = slug ? [slug] : Object.keys(store);
  const seasonFilter = season ? photoSeasonKey(season) : null;

  for (const key of slugs) {
    const group = store[key] || {};
    const cards: LivestockPhotoMaps = { photos: {}, uploaders: {}, photosByBroker: {} };
    if (seasonFilter) {
      if (seasonFilter === "birimo") {
        mergeMaps(cards, flatten(legacyNameMap(group)));
      }
      mergeMaps(cards, flatten(seasonBucket(group, seasonFilter)));
    } else {
      mergeMaps(cards, flatten(legacyNameMap(group)));
      mergeMaps(cards, flatten(seasonBucket(group, "birimo")));
      mergeMaps(cards, flatten(seasonBucket(group, "sugunto")));
    }

    if (scope === "listing") {
      const inner: LivestockPhotoMaps = { photos: {}, uploaders: {}, photosByBroker: {} };
      if (seasonFilter) {
        mergeMaps(inner, flatten(listingNameMap(group, seasonFilter)));
      } else {
        mergeMaps(inner, flatten(listingNameMap(group, "birimo")));
        mergeMaps(inner, flatten(listingNameMap(group, "sugunto")));
      }
      mergeMaps(out, inner);
      continue;
    }

    mergeMaps(out, cards);
  }

  return out;
}

export async function getLivestockTypePhotos(
  slug?: string | null,
  season?: string | null
) {
  const maps = await getLivestockTypePhotoMaps(slug, season);
  return maps.photos;
}

export async function saveLivestockTypePhoto(
  slug: string,
  typeName: string,
  url: string,
  season?: string | null,
  uploadedBy?: string | null,
  scope: LivestockPhotoScope = "card",
  ownerBrokerId?: number | null
) {
  const store = await readStore();
  const group: CategoryPhotos = { ...(store[slug] || {}) };
  const seasonKey = photoSeasonKey(season);
  if (scope === "listing") {
    const key = listingBucketKey(seasonKey);
    const bucket = { ...listingNameMap(group, seasonKey) };
    const ownerId = Number(ownerBrokerId);
    if (Number.isFinite(ownerId) && ownerId > 0) {
      const owned = listingOwnerKey(ownerId, typeName);
      bucket[owned] = {
        url,
        by: uploadedBy?.trim() || undefined,
      };
    } else {
      addKeys(bucket, typeName, url, uploadedBy?.trim() || undefined);
    }
    group[key] = bucket;
    store[slug] = group;
    await writeStore(store);
    return flatten(bucket);
  }
  const bucket = { ...seasonBucket(group, seasonKey) };
  addKeys(bucket, typeName, url, uploadedBy?.trim() || undefined);
  group[seasonKey] = bucket;
  const canonical = canonicalTypeName(typeName);
  delete group[typeName];
  if (canonical && canonical !== typeName) delete group[canonical];
  store[slug] = group;
  await writeStore(store);
  return flatten(bucket);
}
