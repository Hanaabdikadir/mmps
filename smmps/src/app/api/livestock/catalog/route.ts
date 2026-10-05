import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import {
  ensureLivestockCatalog,
  ensureLivestockPermissions,
  inferLivestockSpecies,
  slugFromName,
  canonicalAnimalTypeSlug,
} from "@/lib/livestock-catalog";
import { saveLivestockCategoryImage } from "@/lib/livestock-category-upload";
import { revalidateLivestockPublic } from "@/lib/livestock-price-persist";
import { hardDeleteLivestockPrices } from "@/lib/delete-user";
import { notifyRole } from "@/lib/notifications";
import type { AccountStatus, AnimalType } from "@prisma/client";
import { isLivestockBroker, isSuperAdmin, checkPermission, type AuthUser } from "@/lib/auth";
import {
  isRetiredLivestockType,
  RETIRED_LIVESTOCK_TYPE_ERROR,
} from "@/lib/livestock-section-prices";
import { resolveBilingualTerm } from "@/lib/content-i18n";
import { translateToBoth } from "@/lib/translate-service";

/** Livestock admin may change photos only — type names (Awr, Hal, …) are shared. */
function catalogNamesLocked(user: AuthUser) {
  return isLivestockBroker(user) && !isSuperAdmin(user);
}

function parseTypeNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

async function addCategoryTypes(categoryId: number, species: AnimalType, names: string[]) {
  const category = await prisma.livestockCategory.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  for (const name of names) {
    if (isRetiredLivestockType(name)) continue;
    let bilingual = resolveBilingualTerm(name);
    if (!bilingual.en || !bilingual.so || bilingual.en === bilingual.so) {
      bilingual = await translateToBoth(name);
    }
    const displayName = bilingual.en || name;
    const somaliName = bilingual.so || name;
    const canonical = category
      ? canonicalAnimalTypeSlug(category.slug, somaliName) ||
        canonicalAnimalTypeSlug(category.slug, displayName)
      : null;
    const slug = canonical || slugFromName(somaliName || displayName);
    const existing = await prisma.livestockAnimalType.findFirst({
      where: {
        categoryId,
        OR: [
          { slug },
          ...(canonical ? [{ slug: canonical }] : []),
          { nameSomali: { equals: somaliName, mode: "insensitive" } },
          { name: { equals: displayName, mode: "insensitive" } },
          { name: { equals: name, mode: "insensitive" } },
          { nameSomali: { equals: name, mode: "insensitive" } },
        ],
      },
    });
    if (existing) {
      await prisma.livestockAnimalType.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          slug: canonical || existing.slug,
          nameSomali: existing.nameSomali?.trim() || somaliName,
          name: existing.name?.trim() || displayName,
        },
      });
      continue;
    }
    const maxSort = await prisma.livestockAnimalType.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    await prisma.livestockAnimalType.create({
      data: {
        categoryId,
        slug,
        name: displayName,
        nameSomali: somaliName,
        unit: "head",
        legacyAnimalType: species,
        status: "ACTIVE",
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }
}

async function readCatalogBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const image = form.get("image");
    const optional = (key: string) => {
      if (!form.has(key)) return undefined;
      return String(form.get(key) || "").trim();
    };
    return {
      kind: String(form.get("kind") || "category"),
      id: form.get("id") ? Number(form.get("id")) : undefined,
      categoryId: form.get("categoryId") ? Number(form.get("categoryId")) : undefined,
      name: optional("name"),
      nameSomali: optional("nameSomali"),
      description: optional("description"),
      species: optional("species") || undefined,
      status: optional("status"),
      sortOrder: form.has("sortOrder") ? form.get("sortOrder") : undefined,
      slug: optional("slug") || "",
      types: parseTypeNames(form.get("types")),
      image: image instanceof File && image.size > 0 ? image : null,
      imageUrl: optional("imageUrl") || "",
    };
  }
  const json = await request.json().catch(() => null);
  return {
    ...(json || {}),
    types: parseTypeNames(json?.types),
    image: null,
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await ensureLivestockPermissions();
    await ensureLivestockCatalog();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "1";

    const categories = await prisma.livestockCategory.findMany({
      where: includeInactive
        ? { status: { in: ["ACTIVE", "SUSPENDED"] } }
        : { status: "ACTIVE" },
      include: {
        animalTypes: {
          where: includeInactive
            ? { status: { in: ["ACTIVE", "SUSPENDED"] } }
            : { status: "ACTIVE" },
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { prices: true, brokers: true } } },
        },
        _count: { select: { brokers: true, markets: true, prices: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({
      categories: categories.map((category) => ({
        ...category,
        animalTypes: (category.animalTypes || []).filter(
          (type) =>
            !isRetiredLivestockType(type.slug, type.name, type.nameSomali)
        ),
      })),
    });
  } catch (error) {
    console.error("[api/livestock/catalog GET]", error);
    return jsonError("Could not load livestock categories", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await readCatalogBody(request);
  const kind = String(body?.kind || "category");
  const canCatalog = checkPermission(auth.user, "MANAGE_LIVESTOCK_CATALOG");
  const brokerProposeType = kind === "type" && isLivestockBroker(auth.user);
  if (!canCatalog && !brokerProposeType) {
    return jsonError("Forbidden", 403);
  }

  const namesLocked = catalogNamesLocked(auth.user);

  if (namesLocked && kind !== "type") {
    return jsonError(
      "Magacyadan waa guud. Kaliya nooc cusub ama qiimaha suuqaaga ayaad soo gudbin kartaa.",
      403
    );
  }

  if (kind === "type") {
    const categoryId = Number(body?.categoryId);
    const name = String(body?.name || "").trim();
    if (!categoryId || !name) return jsonError("categoryId and name are required");

    const category = await prisma.livestockCategory.findUnique({ where: { id: categoryId } });
    if (!category) return jsonError("Category not found", 404);

    let bilingual = resolveBilingualTerm(name);
    if (!bilingual.en || !bilingual.so || bilingual.en === bilingual.so) {
      bilingual = await translateToBoth(name);
    }
    const fromBodySo = String(body?.nameSomali || "").trim();
    const englishName = bilingual.en || name;
    const somaliName =
      (fromBodySo
        ? (await translateToBoth(fromBodySo)).so || resolveBilingualTerm(fromBodySo).so
        : "") ||
      bilingual.so ||
      name;
    if (isRetiredLivestockType(name, somaliName, slugFromName(somaliName))) {
      return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
    }
    const canonical = canonicalAnimalTypeSlug(category.slug, somaliName) ||
      canonicalAnimalTypeSlug(category.slug, englishName) ||
      canonicalAnimalTypeSlug(category.slug, name);
    const baseSlug = canonical || slugFromName(somaliName);
    const existingSame = await prisma.livestockAnimalType.findFirst({
      where: {
        categoryId,
        OR: [
          { slug: baseSlug },
          ...(canonical ? [{ slug: canonical }] : []),
          { nameSomali: { equals: somaliName, mode: "insensitive" } },
          { name: { equals: somaliName, mode: "insensitive" } },
          { name: { equals: englishName, mode: "insensitive" } },
          { name: { equals: name, mode: "insensitive" } },
          { nameSomali: { equals: name, mode: "insensitive" } },
        ],
      },
    });
    if (existingSame) {
      const type = await prisma.livestockAnimalType.update({
        where: { id: existingSame.id },
        data: {
          status: "ACTIVE",
          slug: canonical || existingSame.slug,
          name: existingSame.name?.trim() || englishName,
          nameSomali: existingSame.nameSomali?.trim() || somaliName,
        },
      });
      revalidateLivestockPublic(category.slug);
      revalidatePath(`/livestock/${category.slug}`);
      return jsonOk({ type });
    }

    let slug = baseSlug;
    for (let n = 2; n < 80; n++) {
      const clash = await prisma.livestockAnimalType.findUnique({
        where: { categoryId_slug: { categoryId, slug } },
        select: { id: true },
      });
      if (!clash) break;
      // Never invent sac-2 when a canonical catalog type exists
      if (canonical) {
        return jsonError("This animal type already exists in the catalog.", 409);
      }
      slug = `${baseSlug.slice(0, 50)}-${n}`;
    }

    const maxSort = await prisma.livestockAnimalType.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });

    const pendingApproval = namesLocked;
    const type = await prisma.livestockAnimalType.create({
      data: {
        categoryId,
        slug,
        name: englishName,
        nameSomali: somaliName,
        description: body?.description ? String(body.description).trim() : null,
        unit: body?.unit ? String(body.unit).trim() : "head",
        legacyAnimalType: (body?.legacyAnimalType as AnimalType) || category.species,
        status: pendingApproval ? "SUSPENDED" : (body?.status as AccountStatus) || "ACTIVE",
        sortOrder: Number.isFinite(Number(body?.sortOrder))
          ? Number(body.sortOrder)
          : (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    if (pendingApproval) {
      await notifyRole(["SUPER_ADMIN"], {
        title: "New livestock type submitted",
        message: `${auth.user.fullName} proposed ${type.nameSomali || type.name} in ${category.nameSomali || category.name}. Approve it before it appears publicly.`,
        type: "PRICE_SUBMITTED",
        sector: "livestock",
        senderId: auth.user.id,
      });
      return jsonOk({ type, pending: true }, 201);
    }

    revalidateLivestockPublic(category.slug);
    revalidatePath(`/livestock/${category.slug}`);
    return jsonOk({ type }, 201);
  }

  const name = String(body?.name || "").trim();
  if (!name) return jsonError("Category name is required");
  const slug = String(body?.slug || slugFromName(name)).trim();
  const species = inferLivestockSpecies(name, body?.species);
  const typeNames = parseTypeNames(body?.types);

  const existingCategory = await prisma.livestockCategory.findUnique({ where: { slug } });
  if (existingCategory) return jsonError("A category with this name already exists", 409);

  const duplicateName = await prisma.livestockCategory.findFirst({
    where: { status: "ACTIVE", name: { equals: name, mode: "insensitive" } },
  });
  if (duplicateName) return jsonError(`${name} is already in livestock categories.`, 409);

  let imageUrl: string | null = null;
  const image = body?.image;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await saveLivestockCategoryImage(image);
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Could not save image");
    }
  } else if (typeof body?.imageUrl === "string" && body.imageUrl.trim()) {
    imageUrl = body.imageUrl.trim();
  }
  if (!imageUrl) {
    imageUrl =
      species === "CAMEL"
        ? "/images/livestock/geel.jpg"
        : species === "CATTLE"
          ? "/images/livestock/loda-cattle.jpg"
          : "/images/livestock/arri.jpg";
  }

  const maxSort = await prisma.livestockCategory.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.livestockCategory.create({
    data: {
      slug,
      name,
      nameSomali: body?.nameSomali ? String(body.nameSomali).trim() : null,
      description: body?.description ? String(body.description).trim() : null,
      imageUrl,
      species,
      status: (body?.status as AccountStatus) || "ACTIVE",
      sortOrder: Number.isFinite(Number(body?.sortOrder))
        ? Number(body.sortOrder)
        : (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
  await addCategoryTypes(category.id, species, typeNames);

  revalidateLivestockPublic(category.slug);
  revalidatePath(`/livestock/${category.slug}`);
  return jsonOk({ category }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_CATALOG");
  if (auth.error) return auth.error;

  const body = await readCatalogBody(request);
  const kind = String(body?.kind || "category");
  const id = Number(body?.id);
  if (!id) return jsonError("id is required");
  const namesLocked = catalogNamesLocked(auth.user);

  if (kind === "type") {
    const existingType = await prisma.livestockAnimalType.findUnique({ where: { id } });
    if (!existingType) return jsonError("Animal type not found", 404);
    if (namesLocked) {
      return jsonError(
        "Kaliya admin ayaa soo gelin kara sawirka nooca (Awr, Hal, …).",
        403
      );
    }

    let typeImageUrl: string | undefined;
    const typeImage = body?.image;
    if (typeImage instanceof File && typeImage.size > 0) {
      try {
        typeImageUrl = await saveLivestockCategoryImage(typeImage);
      } catch (err) {
        return jsonError(err instanceof Error ? err.message : "Could not save image");
      }
    }

    const nextName = namesLocked
      ? existingType.name
      : body.name != null
        ? String(body.name).trim()
        : existingType.name;
    const nextSomali = namesLocked
      ? existingType.nameSomali
      : body.nameSomali != null
        ? String(body.nameSomali).trim()
        : existingType.nameSomali;

    if (
      isRetiredLivestockType(
        existingType.slug,
        existingType.name,
        existingType.nameSomali,
        nextName,
        nextSomali
      )
    ) {
      return jsonError(RETIRED_LIVESTOCK_TYPE_ERROR);
    }

    const type = await prisma.livestockAnimalType.update({
      where: { id },
      data: {
        ...(namesLocked || body.name == null ? {} : { name: nextName }),
        ...(namesLocked || body.nameSomali == null ? {} : { nameSomali: nextSomali }),
        ...(namesLocked || body.description == null
          ? {}
          : { description: String(body.description) }),
        ...(namesLocked || body.unit == null ? {} : { unit: String(body.unit).trim() }),
        ...(namesLocked || body.status == null
          ? {}
          : { status: body.status as AccountStatus }),
        ...(namesLocked || body.sortOrder == null
          ? {}
          : { sortOrder: Number(body.sortOrder) }),
        ...(namesLocked || body.legacyAnimalType == null
          ? {}
          : { legacyAnimalType: body.legacyAnimalType as AnimalType }),
      },
    });

    const publicName = String(nextSomali || nextName || "").trim();
    if (!namesLocked && publicName && (body.name != null || body.nameSomali != null)) {
      await prisma.livestockPrice.updateMany({
        where: { livestockTypeId: id, deletedAt: null },
        data: { description: publicName },
      });
    }

    if (typeImageUrl) {
      await prisma.$executeRaw`
        UPDATE livestock_animal_types SET image_url = ${typeImageUrl} WHERE id = ${id}
      `;
    }

    const typeCategory = await prisma.livestockCategory.findUnique({
      where: { id: existingType.categoryId },
      select: { slug: true },
    });
    revalidateLivestockPublic(typeCategory?.slug);
    if (typeCategory?.slug) revalidatePath(`/livestock/${typeCategory.slug}`);
    return jsonOk({ type });
  }

  const existingCategory = await prisma.livestockCategory.findUnique({ where: { id } });
  if (!existingCategory) return jsonError("Category not found", 404);
  if (namesLocked) {
    return jsonError(
      "Kaliya admin ayaa soo gelin kara sawirka qaybta.",
      403
    );
  }

  if (!namesLocked && body.name != null) {
    const nextName = String(body.name).trim();
    if (!nextName) return jsonError("Category name is required");
    const duplicateName = await prisma.livestockCategory.findFirst({
      where: {
        id: { not: id },
        status: "ACTIVE",
        name: { equals: nextName, mode: "insensitive" },
      },
    });
    if (duplicateName) return jsonError(`${nextName} is already in livestock categories.`, 409);
  }

  let imageUrl: string | undefined;
  const image = body?.image;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await saveLivestockCategoryImage(image);
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Could not save image");
    }
  }

  const category = await prisma.livestockCategory.update({
    where: { id },
    data: {
      ...(namesLocked || body.name == null ? {} : { name: String(body.name).trim() }),
      ...(namesLocked || body.nameSomali == null
        ? {}
        : { nameSomali: String(body.nameSomali).trim() }),
      ...(namesLocked || body.description == null
        ? {}
        : { description: String(body.description) }),
      ...(namesLocked || body.status == null
        ? {}
        : { status: body.status as AccountStatus }),
      ...(namesLocked || body.sortOrder == null
        ? {}
        : { sortOrder: Number(body.sortOrder) }),
      ...(body.species
        ? {
            species: inferLivestockSpecies(
              body.name != null ? String(body.name).trim() : existingCategory.name,
              String(body.species)
            ),
          }
        : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
  });
  const typeNames = namesLocked ? [] : parseTypeNames(body.types);
  if (typeNames.length) {
    await addCategoryTypes(
      id,
      inferLivestockSpecies(
        body.name != null ? String(body.name).trim() : existingCategory.name,
        body.species != null ? String(body.species) : existingCategory.species
      ),
      typeNames
    );
  }

  revalidateLivestockPublic(category.slug);
  revalidatePath(`/livestock/${category.slug}`);
  return jsonOk({ category });
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_CATALOG");
  if (auth.error) return auth.error;
  if (catalogNamesLocked(auth.user)) {
    return jsonError(
      "Magacyadan waa guud. Kaliya suuqaaga ayaad wax ku dari kartaa ama ka tirtiri kartaa.",
      403
    );
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") || "category";
  const id = Number(searchParams.get("id"));
  if (!id) return jsonError("id is required");

  if (kind === "type") {
    const existingType = await prisma.livestockAnimalType.findUnique({ where: { id } });
    if (!existingType) return jsonError("Animal type not found", 404);

    await prisma.livestockAnimalType.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    const typeCategory = await prisma.livestockCategory.findUnique({
      where: { id: existingType.categoryId },
      select: { slug: true },
    });
    revalidateLivestockPublic(typeCategory?.slug);
    if (typeCategory?.slug) revalidatePath(`/livestock/${typeCategory.slug}`);
    return jsonOk({ ok: true });
  }

  const existingCategory = await prisma.livestockCategory.findUnique({ where: { id } });
  if (!existingCategory) return jsonError("Category not found", 404);

  await hardDeleteLivestockPrices({ livestockCategoryId: id });
  await hardDeleteLivestockPrices({ livestockType: { categoryId: id } });
  await prisma.$transaction([
    prisma.livestockBrokerCategory.deleteMany({ where: { categoryId: id } }),
    prisma.livestockMarketCategory.deleteMany({ where: { categoryId: id } }),
    prisma.livestockBrokerAnimalType.deleteMany({
      where: { animalType: { categoryId: id } },
    }),
    prisma.livestockAnimalType.deleteMany({ where: { categoryId: id } }),
    prisma.livestockCategory.delete({ where: { id } }),
  ]);
  revalidateLivestockPublic(existingCategory.slug);
  revalidatePath(`/livestock/${existingCategory.slug}`);
  return jsonOk({ ok: true });
}
