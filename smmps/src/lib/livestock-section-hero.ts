import "server-only";
import { prisma } from "@/lib/prisma";
import {
  LIVESTOCK_CATEGORY_PAGES,
  isLivestockCategorySlug,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { SECTION_BROKER_EMAILS } from "@/lib/livestock-manager-broker";

export const DEFAULT_HERO_LOCATION = "Gobolka Banaadir · Muqdisho, Soomaaliya";
export const PUBLIC_HERO_LOCATION_EN = "Banadir Region · Mogadishu, Somalia";
export const PUBLIC_HERO_LOCATION_SO = "Gobolka Banaadir · Muqdisho, Soomaaliya";

export type LivestockSectionHero = {
  slug: string;
  title: string;
  location: string;
  description: string;
  featuredImage: string | null;
  updatedAt: string | null;
  phone: string | null;
  email: string | null;
  brokerName: string | null;
  livestockFocus: string | null;
};

const CATEGORY_SECTION_EMAIL: Record<LivestockCategorySlug, string> = {
  geel: "camel@livestock.so",
  loda: "cattle@livestock.so",
  arri: "goat@livestock.so",
};

const brokerPublicSelect = {
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

export function defaultSectionHero(slug: string): LivestockSectionHero {
  if (isLivestockCategorySlug(slug)) {
    const meta = LIVESTOCK_CATEGORY_PAGES[slug];
    return {
      slug,
      title: meta.somali,
      location: DEFAULT_HERO_LOCATION,
      description: meta.descriptionEn,
      featuredImage: null,
      updatedAt: null,
      phone: null,
      email: CATEGORY_SECTION_EMAIL[slug],
      brokerName: null,
      livestockFocus: null,
    };
  }
  return {
    slug,
    title: slug,
    location: DEFAULT_HERO_LOCATION,
    description: "",
    featuredImage: null,
    updatedAt: null,
    phone: null,
    email: null,
    brokerName: null,
    livestockFocus: null,
  };
}

export function mergeSectionHero(
  slug: string,
  broker: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    livestockFocus?: string | null;
    heroTitle?: string | null;
    location?: string | null;
    description?: string | null;
    profilePicture?: string | null;
    updatedAt?: Date | null;
  } | null,
  catalogTitle?: string | null,
  catalogImage?: string | null,
  catalogDescription?: string | null
): LivestockSectionHero {
  const defaults = defaultSectionHero(slug);
  const fallbackTitle = catalogTitle?.trim() || defaults.title;
  if (!broker) {
    return {
      ...defaults,
      title: fallbackTitle,
      description: catalogDescription?.trim() || defaults.description,
      featuredImage: catalogImage?.trim() || defaults.featuredImage,
    };
  }

  return {
    slug,
    title: broker.heroTitle?.trim() || fallbackTitle,
    location: defaults.location,
    description: broker.description?.trim() || defaults.description,
    featuredImage:
      broker.profilePicture?.trim() || catalogImage?.trim() || null,
    updatedAt: broker.updatedAt?.toISOString() ?? null,
    phone: broker.phone?.trim() || null,
    email: broker.email?.trim() || defaults.email,
    brokerName: broker.name?.trim() || null,
    livestockFocus: broker.livestockFocus?.trim() || null,
  };
}

export async function findSectionBrokerForSlug(slug: string) {
  if (isLivestockCategorySlug(slug)) {
    const email = categoryEmailFromSlug(slug);
    const byEmail = await prisma.livestockBroker.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, ...brokerPublicSelect },
    });
    if (byEmail) return byEmail;
  }

  const byCategory = await prisma.livestockBroker.findFirst({
    where: {
      deletedAt: null,
      authorizedCategories: { some: { category: { slug } } },
    },
    orderBy: { id: "asc" },
    select: { id: true, ...brokerPublicSelect },
  });
  if (byCategory) return byCategory;

  return prisma.livestockBroker.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { livestockFocus: { contains: slug, mode: "insensitive" } },
        { name: { contains: slug, mode: "insensitive" } },
      ],
    },
    orderBy: { id: "asc" },
    select: { id: true, ...brokerPublicSelect },
  });
}

export async function getSectionHeroByCategory(
  slug: string
): Promise<LivestockSectionHero> {
  const [broker, categoryRow] = await Promise.all([
    findSectionBrokerForSlug(slug),
    prisma.livestockCategory.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { name: true, nameSomali: true, imageUrl: true, description: true },
    }),
  ]);
  const catalogTitle =
    categoryRow?.nameSomali?.trim() || categoryRow?.name?.trim() || null;

  return mergeSectionHero(
    slug,
    broker,
    catalogTitle,
    categoryRow?.imageUrl,
    categoryRow?.description
  );
}

export async function getSectionHeroForBroker(
  brokerId: number,
  slug: LivestockCategorySlug
): Promise<LivestockSectionHero> {
  const broker = await prisma.livestockBroker.findUnique({
    where: { id: brokerId },
    select: brokerPublicSelect,
  });

  return mergeSectionHero(slug, broker);
}

export function categoryEmailFromSlug(slug: LivestockCategorySlug): string {
  return CATEGORY_SECTION_EMAIL[slug];
}

export function isSectionBrokerEmail(email: string): boolean {
  return SECTION_BROKER_EMAILS.includes(
    email.toLowerCase() as (typeof SECTION_BROKER_EMAILS)[number]
  );
}
