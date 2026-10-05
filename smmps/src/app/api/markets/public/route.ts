import { NextResponse } from "next/server";
import { getPublicLivestockMarkets } from "@/lib/livestock-registration-markets";

/** Public — livestock markets for broker registration (core five + Super Admin extras). */
export async function GET() {
  try {
    const markets = await getPublicLivestockMarkets();
    return NextResponse.json({ ok: true, markets });
  } catch (error) {
    console.error("[api/markets/public]", error);
    return NextResponse.json({ ok: true, markets: [] });
  }
}
