import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-guard";
import {
  isLivestockCategorySlug,
  LIVESTOCK_CATEGORY_PAGES,
} from "@/lib/livestock-data";
import {
  findSectionBrokerForSlug,
  getSectionHeroByCategory,
  mergeSectionHero,
} from "@/lib/livestock-section-hero";

const MAX_BYTES = 5 * 1024 * 1024;

const brokerHeroSelect = {
  name: true,
  email: true,
  phone: true,
  livestockFocus: true,
  heroTitle: true,
  location: true,
  description: true,
  profilePicture: true,
  updatedAt: true,
} as const;

function revalidatePublicHero(slug: string) {
  revalidatePath(`/livestock/${slug}`);
  if (isLivestockCategorySlug(slug)) {
    revalidatePath(LIVESTOCK_CATEGORY_PAGES[slug].href);
  }
}

function parseSlug(raw: unknown): string | null {
  const slug = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return null;
  return slug;
}

async function saveCategoryHero(
  slug: string,
  data: {
    title?: string;
    description?: string | null;
    imageUrl?: string;
  }
) {
  const existing = await prisma.livestockCategory.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      nameSomali: true,
      description: true,
      imageUrl: true,
    },
  });
  if (!existing) return null;
  return prisma.livestockCategory.update({
    where: { id: existing.id },
    data: {
      ...(data.title ? { nameSomali: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    },
    select: { name: true, nameSomali: true, imageUrl: true, description: true },
  });
}

function heroFromCategory(
  slug: string,
  category: {
    name: string;
    nameSomali: string | null;
    imageUrl: string | null;
    description: string | null;
  },
  broker: Parameters<typeof mergeSectionHero>[1]
) {
  return mergeSectionHero(
    slug,
    broker,
    category.nameSomali?.trim() || category.name,
    category.imageUrl,
    category.description
  );
}

export async function GET() {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const categories = await prisma.livestockCategory.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, nameSomali: true },
  });

  const heroes = await Promise.all(
    categories.map((row) => getSectionHeroByCategory(row.slug))
  );

  return jsonOk({
    categories: categories.map((row) => ({
      slug: row.slug,
      name: row.name,
      nameSomali: row.nameSomali,
      href: `/livestock/${row.slug}`,
    })),
    heroes,
  });
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const slug = parseSlug(body?.slug);
  if (!slug) return jsonError("Category is required");

  const title = String(body?.title ?? "").trim().slice(0, 80);
  const description = String(body?.description ?? "").trim().slice(0, 2000);
  if (!title) return jsonError("Page title is required");

  const broker = await findSectionBrokerForSlug(slug);

  if (broker) {
    const updated = await prisma.livestockBroker.update({
      where: { id: broker.id },
      data: {
        heroTitle: title,
        description: description || null,
      },
      select: brokerHeroSelect,
    });
    await saveCategoryHero(slug, { title, description: description || null });
    revalidatePublicHero(slug);
    return jsonOk({
      slug,
      hero: mergeSectionHero(slug, updated, title, null, description),
    });
  }

  const category = await saveCategoryHero(slug, {
    title,
    description: description || null,
  });
  if (!category) return jsonError("Livestock category was not found", 404);

  revalidatePublicHero(slug);
  return jsonOk({ slug, hero: heroFromCategory(slug, category, null) });
}

export async function POST(request: Request) {
  const auth = await requirePermission("MANAGE_LIVESTOCK_BROKERS");
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const slug = parseSlug(form?.get("slug"));
  if (!slug) return jsonError("Category is required");

  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Image file is required", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Image must be 5 MB or smaller", 400);
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(path.extname(file.name));
  if (!isImage) {
    return jsonError("Image must be PNG, JPEG, WEBP, or GIF", 400);
  }

  const extFromName = path.extname(file.name).toLowerCase();
  const ext = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName)
    ? extFromName === ".jpeg"
      ? ".jpg"
      : extFromName
    : file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
        ? ".webp"
        : file.type === "image/gif"
          ? ".gif"
          : ".jpg";

  const broker = await findSectionBrokerForSlug(slug);

  const fileName = `hero-${slug}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "livestock-hero");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  const image = `/uploads/livestock-hero/${fileName}`;

  if (broker) {
    const updated = await prisma.livestockBroker.update({
      where: { id: broker.id },
      data: { profilePicture: image },
      select: brokerHeroSelect,
    });
    await saveCategoryHero(slug, { imageUrl: image });
    revalidatePublicHero(slug);
    return jsonOk({
      slug,
      hero: mergeSectionHero(slug, updated),
      image,
    });
  }

  const category = await saveCategoryHero(slug, { imageUrl: image });
  if (!category) return jsonError("Livestock category was not found", 404);

  revalidatePublicHero(slug);
  return jsonOk({
    slug,
    hero: heroFromCategory(slug, category, null),
    image,
  });
}
