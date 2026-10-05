import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BrokerLivestockDashboard } from "@/components/broker/BrokerLivestockDashboard";
import {
  animalTypesFromCategory,
  livestockEditorGroupKey,
  namedFieldsOrDefaults,
  pickLatestEditorRows,
} from "@/lib/livestock-section-prices";
import {
  isLivestockCategorySlug,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { cn } from "@/lib/utils";

export async function LivestockMarketPricesEditor({
  slug,
  cats,
  catHref,
  brokerId,
  userId,
  loadAllBrokers,
}: {
  slug: LivestockCategorySlug;
  cats: { slug: string; name: string }[];
  catHref: (slug: string) => string;
  brokerId?: number | null;
  userId: number;
  loadAllBrokers?: boolean;
}) {
  const animalTypes = animalTypesFromCategory(slug);
  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      animalType: { in: animalTypes },
      ...(loadAllBrokers
        ? {}
        : brokerId
          ? { brokerId }
          : { updatedById: userId }),
    },
    include: {
      livestockType: { select: { name: true, nameSomali: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const latest = pickLatestEditorRows(rows, livestockEditorGroupKey);
  const active = slug;

  return (
    <div className="space-y-4">
      {cats.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const on = c.slug === active;
            return (
              <Link
                key={c.slug}
                href={catHref(c.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition",
                  on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="grid min-h-[40vh] place-items-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          </div>
        }
      >
        <BrokerLivestockDashboard
          slug={slug}
          initialFields={namedFieldsOrDefaults(
            slug,
            latest.map((r) => ({
              category: r.category,
              description: r.description,
              price: Number(r.price),
              livestockTypeName:
                r.livestockType?.nameSomali || r.livestockType?.name || null,
            }))
          )}
        />
      </Suspense>
    </div>
  );
}

export function pickEditorSlug(
  requested: string,
  cats: { slug: string }[],
  fallback: LivestockCategorySlug
): LivestockCategorySlug {
  const active = cats.find((c) => c.slug === requested)?.slug || cats[0]?.slug || fallback;
  return isLivestockCategorySlug(active) ? active : fallback;
}
