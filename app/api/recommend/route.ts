import { NextRequest, NextResponse } from "next/server";
import { scrapeCoupons } from "@/lib/scraper";
import { scoreConfidence, buildForecast } from "@/lib/forecaster";
import { getAiRecommendation } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json();
    const { vendor, itemName, subtotal, budget, query } = body as {
      vendor: string; itemName: string; subtotal: number; budget: number; query?: string;
    };
    if (!vendor || !subtotal) return NextResponse.json({ error: "vendor and subtotal required" }, { status: 400 });

    const raw      = await scrapeCoupons(vendor);
    const scored   = raw.map(c => ({ ...c, confidence: scoreConfidence(c, raw) }));
    const forecast = buildForecast(subtotal, scored);
    const advice   = await getAiRecommendation({ budget, vendor, itemName: itemName ?? vendor, subtotal, scenarios: forecast.all, query });

    return NextResponse.json({ advice, forecast, coupons: scored });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
