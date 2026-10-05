import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, requireAuth } from "@/lib/api-guard";
import { checkPermission, getCurrentUser, isLivestockBroker, isSuperAdmin, type AuthUser } from "@/lib/auth";
import {
  isLivestockCategorySlug,
} from "@/lib/livestock-data";
import { categorySlugFromAnimal, canonicalTypeName } from "@/lib/livestock-section-prices";
import { saveLivestockCategoryImage } from "@/lib/livestock-category-upload";
import {
  getLivestockTypePhotoMaps,
  photoSeasonKey,
  saveLivestockTypePhoto,
  type LivestockPhotoScope,
} from "@/lib/livestock-type-photo-store";
import { revalidateLivestockPublic } from "@/lib/livestock-price-persist";

export const dynamic = "force-dynamic";

function photoCategorySlug(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (isLivestockCategorySlug(value)) return value;
  if (/cattle|loda|lo.?da|cow/.test(value)) return "loda";
  if (/camel|geel/.test(value)) return "geel";
  if (/goat|sheep|arri/.test(value)) return "arri";
  if (/^[a-z0-9-]{2,48}$/.test(value)) return value;
  const fromAnimal = categorySlugFromAnimal(raw);
  return isLivestockCategorySlug(fromAnimal) ? fromAnimal : null;
}

function canUploadTypePhoto(user: AuthUser): boolean {
  return (
    isSuperAdmin(user) ||
    isLivestockBroker(user) ||
    Boolean(user.brokerId) ||
    checkPermission(user, "ADD_LIVESTOCK_PRICE") ||
    checkPermission(user, "MANAGE_LIVESTOCK_CATALOG") ||
    checkPermission(user, "UPLOAD_PROFILE_IMAGE")
  );
}

function photoScopeForUser(user: AuthUser, requested: string): LivestockPhotoScope {
  if (!isSuperAdmin(user)) return "listing";
  return requested === "listing" ? "listing" : "card";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const season = searchParams.get("season") || "";
  const scope: LivestockPhotoScope =
    searchParams.get("scope") === "listing" ? "listing" : "card";
  const categorySlug = isLivestockCategorySlug(slug) ? slug : null;
  const seasonKey = season ? photoSeasonKey(season) : null;

  const maps = await getLivestockTypePhotoMaps(categorySlug, seasonKey, scope);
  let photos = maps.photos;
  const uploaders = maps.uploaders;
  const photosByBroker = maps.photosByBroker || {};

  if (scope === "listing") {
    const user = await getCurrentUser();
    const owned =
      user?.brokerId != null ? photosByBroker[String(user.brokerId)] || {} : {};
    photos = owned;
  } else {
    // Public type cards use generated catalog files, not old uploads / DB URLs.
    photos = {};
  }

  return NextResponse.json(
    { photos, uploaders, photosByBroker },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!canUploadTypePhoto(auth.user)) {
    return jsonError("Forbidden", 403);
  }

  const form = await request.formData();
  const slugRaw = String(form.get("slug") || "").trim();
  const typeName = String(form.get("typeName") || "").trim();
  const season = photoSeasonKey(String(form.get("season") || ""));
  const requestedKind = String(form.get("kind") || "").trim().toLowerCase();
  const scope = photoScopeForUser(auth.user, requestedKind);
  const image = form.get("image");
  const slug = photoCategorySlug(slugRaw);
  if (!slug) return jsonError("Invalid livestock category");
  if (!typeName) return jsonError("Type name is required");
  if (!(image instanceof File) || image.size <= 0) {
    return jsonError("Choose a photo");
  }

  if (scope === "card" && !isSuperAdmin(auth.user)) {
    return jsonError("Only Super Admin can upload public type card photos", 403);
  }

  if (scope === "listing" && !auth.user.brokerId) {
    return jsonError("Broker account is required to upload listing photos", 403);
  }

  let url: string;
  try {
    url = await saveLivestockCategoryImage(image);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not save photo");
  }

  let uploadedBy = auth.user.fullName?.trim() || "";
  if (auth.user.brokerId) {
    const broker = await prisma.livestockBroker.findUnique({
      where: { id: auth.user.brokerId },
      select: { name: true },
    });
    uploadedBy = broker?.name?.trim() || uploadedBy;
  }
  if (!uploadedBy) uploadedBy = "Livestock Broker";

  await saveLivestockTypePhoto(
    slug,
    typeName,
    url,
    season,
    uploadedBy,
    scope,
    scope === "listing" ? auth.user.brokerId ?? null : null
  );

  if (scope === "card" && isSuperAdmin(auth.user)) {
    try {
      const types = await prisma.livestockAnimalType.findMany({
        where: { category: { slug } },
        select: { id: true, name: true, nameSomali: true },
      });
      const want = canonicalTypeName(typeName);
      const hit = types.find((row) => {
        const names = [row.name, row.nameSomali].filter(Boolean) as string[];
        return names.some(
          (n) =>
            n.trim().toLowerCase() === typeName.toLowerCase() ||
            canonicalTypeName(n) === want
        );
      });
      if (hit) {
        await prisma.livestockAnimalType.update({
          where: { id: hit.id },
          data: { imageUrl: url },
        });
      }
    } catch {
      // file store still published the public card photo
    }
  }

  revalidateLivestockPublic();
  const maps = await getLivestockTypePhotoMaps(slug, season, scope);
  const photos =
    scope === "listing" && auth.user.brokerId
      ? maps.photosByBroker[String(auth.user.brokerId)] || {}
      : maps.photos;
  return jsonOk({
    url,
    photos,
    photosByBroker: maps.photosByBroker,
    uploaders: maps.uploaders,
    season,
  });
}
