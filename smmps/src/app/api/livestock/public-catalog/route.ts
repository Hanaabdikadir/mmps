import { jsonOk } from "@/lib/api-guard";
import { listPublicLivestockCatalog } from "@/lib/livestock-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await listPublicLivestockCatalog();
  const body = jsonOk({ categories });
  body.headers.set("Cache-Control", "no-store, max-age=0");
  return body;
}
