import { NextResponse } from "next/server";
import { getAllKnownVendors, scrapeCoupons } from "@/lib/scraper";
import { scoreConfidence, applyDiscount } from "@/lib/forecaster";

export async function GET() {
  const vendors = getAllKnownVendors();

  const results = await Promise.allSettled(vendors.map(async vendor => {
    const raw    = await scrapeCoupons(vendor);
    const scored = raw.map(c => ({ ...c, confidence: scoreConfidence(c, raw) }));
    // Find best coupon by expected discount (across a $10 reference price)
    const REF = 10;
    let bestDiscount = 0;
    let bestCoupon   = scored[0] ?? null;
    for (const c of scored) {
      const d = applyDiscount(REF, c) * c.confidence;
      if (d > bestDiscount) { bestDiscount = d; bestCoupon = c; }
    }
    return { vendor, couponCount: scored.length, bestCoupon, bestDiscount, coupons: scored.slice(0,3) };
  }));

  type FeedEntry = { vendor:string; couponCount:number; bestCoupon:ReturnType<typeof scoreConfidence> extends number ? never : unknown; bestDiscount:number; coupons:unknown[] };
  const feed = (results.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<{ vendor:string; couponCount:number; bestCoupon:unknown; bestDiscount:number; coupons:unknown[] }>[])
    .map(r => r.value)
    .sort((a,b) => b.bestDiscount - a.bestDiscount);

  return NextResponse.json({ feed, generatedAt: Date.now() });
}
