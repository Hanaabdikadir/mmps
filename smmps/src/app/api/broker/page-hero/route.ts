import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isLivestockBroker } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-guard";
import { requireActiveSubscription } from "@/lib/subscriptions";
import { categorySlugFromBroker } from "@/lib/livestock-section-prices";
import type { LivestockCategorySlug } from "@/lib/livestock-data";
import { LIVESTOCK_CATEGORY_PAGES } from "@/lib/livestock-data";
import {
  DEFAULT_HERO_LOCATION,
  mergeSectionHero,
} from "@/lib/livestock-section-hero";
import { isLivestockManagerBroker } from "@/lib/livestock-manager-broker";
import { phoneWriteError } from "@/lib/register-validation";

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

async function resolveBroker(user: { brokerId?: number | null }) {
  if (!user.brokerId) return null;

  return prisma.livestockBroker.findUnique({
    where: { id: user.brokerId },
    select: brokerHeroSelect,
  });
}

function slugFromBroker(broker: {
  name: string;
  livestockFocus: string | null;
}): LivestockCategorySlug {
  return categorySlugFromBroker({
    livestockFocus: broker.livestockFocus,
    name: broker.name,
    companyType: null,
  }) as LivestockCategorySlug;
}

function revalidatePublicHero(slug: LivestockCategorySlug) {
  revalidatePath(LIVESTOCK_CATEGORY_PAGES[slug].href);
  revalidatePath(`/livestock/${slug}`);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isLivestockBroker(user)) return jsonError("Forbidden", 403);
  if (isLivestockManagerBroker(user) || !user.brokerId) {
    return jsonError("Section brokers only", 403);
  }

  const broker = await resolveBroker(user);
  if (!broker) return jsonError("Broker not found", 404);

  const slug = slugFromBroker(broker);

  return jsonOk({
    slug,
    hero: mergeSectionHero(slug, broker),
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isLivestockBroker(user)) return jsonError("Forbidden", 403);
  if (isLivestockManagerBroker(user) || !user.brokerId) {
    return jsonError("Section brokers only", 403);
  }

  const sub = await requireActiveSubscription({ brokerId: user.brokerId });
  if (!sub.ok) return jsonError(sub.reason, 402);

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 80);
  const location = String(body?.location ?? "").trim().slice(0, 120);
  const description = String(body?.description ?? "").trim().slice(0, 2000);
  const phone =
    body?.phone === undefined
      ? undefined
      : String(body.phone ?? "").trim();
  if (phone !== undefined) {
    const phoneErr = phoneWriteError(phone, false);
    if (phoneErr) return jsonError(phoneErr);
  }

  if (!title && phone === undefined) return jsonError("Page title is required");

  const broker = await prisma.livestockBroker.update({
    where: { id: user.brokerId },
    data: {
      ...(title ? { heroTitle: title } : {}),
      ...(body?.location !== undefined
        ? { location: location || DEFAULT_HERO_LOCATION }
        : {}),
      ...(body?.description !== undefined
        ? { description: description || null }
        : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
    },
    select: brokerHeroSelect,
  });

  const slug = slugFromBroker(broker);
  revalidatePublicHero(slug);

  return jsonOk({
    slug,
    hero: mergeSectionHero(slug, broker),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isLivestockBroker(user)) return jsonError("Forbidden", 403);
  if (isLivestockManagerBroker(user) || !user.brokerId) {
    return jsonError("Section brokers only", 403);
  }

  const sub = await requireActiveSubscription({ brokerId: user.brokerId });
  if (!sub.ok) return jsonError(sub.reason, 402);

  const form = await request.formData().catch(() => null);
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
  const ext =
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName)
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

  const fileName = `hero-${user.brokerId}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "livestock-hero");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  const image = `/uploads/livestock-hero/${fileName}`;
  const broker = await prisma.livestockBroker.update({
    where: { id: user.brokerId },
    data: { profilePicture: image },
    select: brokerHeroSelect,
  });

  const slug = slugFromBroker(broker);
  revalidatePublicHero(slug);

  return jsonOk({
    slug,
    hero: mergeSectionHero(slug, broker),
    image,
  });
}
