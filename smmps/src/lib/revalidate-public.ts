import { revalidatePath } from "next/cache";

/** Public Compare Prices board — call after any admin market/rate change. */
export function revalidatePublicCompare() {
  revalidatePath("/compare");
  revalidatePath("/reports");
}

/** Livestock public pages + compare. */
export function revalidateLivestockPublic(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/livestock");
  revalidatePath("/livestock", "layout");
  revalidatePath("/livestock/arri");
  revalidatePath("/livestock/geel");
  revalidatePath("/livestock/loda");
  revalidatePath("/livestock/types");
  if (slug && !["arri", "geel", "loda"].includes(slug)) {
    revalidatePath(`/livestock/${slug}`);
  }
  revalidatePath("/api/livestock/section-prices");
  revalidatePath("/api/livestock/type-photos");
  revalidatePath("/api/livestock/public-catalog");
  revalidatePublicCompare();
}

/** Water / electricity public pages + compare. */
export function revalidateUtilityPublic(slug?: string | null) {
  revalidatePath("/water");
  revalidatePath("/electricity");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/water/${slug}`);
    revalidatePath(`/electricity/${slug}`);
  }
  revalidatePublicCompare();
}

/** Full public market surfaces. */
export function revalidateAllPublicMarkets() {
  revalidateLivestockPublic();
  revalidateUtilityPublic();
}
