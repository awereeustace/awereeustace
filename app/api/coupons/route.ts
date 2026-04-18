import { NextRequest, NextResponse } from "next/server";
import { scrapeCoupons, validateCoupon, getCacheAgeMs } from "@/lib/scraper";
import { scoreConfidence, buildForecast } from "@/lib/forecaster";

export async function GET(req: NextRequest) {
  const vendor   = req.nextUrl.searchParams.get("vendor") ?? "";
  const refresh  = req.nextUrl.searchParams.get("refresh") === "true";
  const subtotal = parseFloat(req.nextUrl.searchParams.get("subtotal") ?? "0");
  const validate = req.nextUrl.searchParams.get("validate") === "true";

  if (!vendor) return NextResponse.json({ error: "vendor param required" }, { status: 400 });

  // 1. Scrape (or return cached)
  const raw = await scrapeCoupons(vendor, refresh);

  // 2. Optionally run live validation (checks if coupon page is still up)
  const coupons = validate
    ? await Promise.all(raw.map(async c => ({ ...c, valid: await validateCoupon(c) })))
    : raw;

  // 3. Score confidence
  const scored = coupons.map(c => ({ ...c, confidence: scoreConfidence(c, coupons) }));

  // 4. Forecast if subtotal provided
  const forecast = subtotal > 0 ? buildForecast(subtotal, scored) : null;

  const cacheAgeMs = getCacheAgeMs(vendor);

  return NextResponse.json({
    vendor,
    source: raw.some(c => !c.source.includes("mock")) ? "live" : "mock",
    cachedAgoMs: cacheAgeMs,
    coupons: scored,
    forecast,
  });
}
