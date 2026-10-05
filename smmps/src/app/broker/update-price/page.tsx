import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrokerLivestockDashboard } from "@/components/broker/BrokerLivestockDashboard";
import {
  animalTypesFromCategory,
  categorySlugFromBroker,
  livestockEditorGroupKey,
  namedFieldsOrDefaults,
  pickLatestEditorRows,
} from "@/lib/livestock-section-prices";
import { isLivestockCategorySlug } from "@/lib/livestock-data";
import { getBrokerScope } from "@/lib/livestock-scope";
import { cn } from "@/lib/utils";
import { LivestockSubmitPriceForm } from "@/components/livestock-admin/LivestockSubmitPriceForm";

export const dynamic = "force-dynamic";

export default async function BrokerUpdatePricePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const broker = user.brokerId
    ? await prisma.livestockBroker.findUnique({
        where: { id: user.brokerId },
        select: { name: true, livestockFocus: true },
      })
    : null;

  const scope = user.brokerId ? await getBrokerScope(user.brokerId) : null;
  const assigned = (scope?.categories || []).map((c) => ({
    slug: c.slug,
    name: c.nameSomali || c.name,
  }));

  const fallbackSlug = categorySlugFromBroker({
    livestockFocus: broker?.livestockFocus,
    name: broker?.name,
    companyType: user.companyType,
  });
  const cats = assigned.length
    ? assigned
    : [{ slug: fallbackSlug, name: fallbackSlug }];

  const params = await searchParams;
  const requested = (params.cat || "").trim();
  const active =
    cats.find((c) => c.slug === requested)?.slug || cats[0]?.slug || fallbackSlug;

  const slug = isLivestockCategorySlug(active) ? active : fallbackSlug;
  const animalTypes = animalTypesFromCategory(slug);

  const rows = await prisma.livestockPrice.findMany({
    where: {
      deletedAt: null,
      animalType: { in: animalTypes },
      ...(user.brokerId
        ? { brokerId: user.brokerId }
        : { updatedById: user.id }),
    },
    include: {
      livestockType: { select: { name: true, nameSomali: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const latest = pickLatestEditorRows(rows, livestockEditorGroupKey);

  return (
    <div className="space-y-4">
      {cats.length > 1 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Livestock you can manage
          </p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = c.slug === active;
              return (
                <Link
                  key={c.slug}
                  href={`/broker/update-price?cat=${encodeURIComponent(c.slug)}`}
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
        </div>
      ) : null}

      {isLivestockCategorySlug(active) ? (
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
      ) : (
        <LivestockSubmitPriceForm />
      )}
    </div>
  );
}
