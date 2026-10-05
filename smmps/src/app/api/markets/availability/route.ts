import { NextResponse } from "next/server";
import { getPublicMarketAvailabilityCached } from "@/lib/market-availability";

/** Public — which sector hubs are open (ACTIVE markets). */
export async function GET() {
  try {
    const availability = await getPublicMarketAvailabilityCached();
    return NextResponse.json(
      { ok: true, ...availability },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[api/markets/availability]", error);
    return NextResponse.json(
      { ok: true, livestock: true, water: true, electricity: true },
      { status: 200 }
    );
  }
}
