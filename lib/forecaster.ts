import type { ScrapedCoupon } from "./scraper";

// ── Confidence scoring ────────────────────────────────────────────────────────

const SOURCE_TRUST: Record<string, number> = {
  "Restaurant app": 0.18,
  "In-store":       0.15,
  "RetailMeNot":    0.12,
  "Slickdeals":     0.10,
  "Coupon.com":     0.08,
};

export function scoreConfidence(coupon: ScrapedCoupon, allForVendor: ScrapedCoupon[]): number {
  let score = 0.40; // base

  // Source trust
  const trust = Object.entries(SOURCE_TRUST).find(([k]) => coupon.source.includes(k));
  if (trust) score += trust[1];

  // Code present (verifiable at checkout)
  if (coupon.code) score += 0.10;

  // Corroboration: same discount found on another source
  const corroborated = allForVendor.some(
    c => c.id !== coupon.id && c.type === coupon.type && Math.abs(c.value - coupon.value) < 0.01
  );
  if (corroborated) score += 0.12;

  // Recency
  const ageHours = (Date.now() - coupon.scrapedAt) / 3_600_000;
  score += ageHours < 1 ? 0.08 : ageHours < 6 ? 0.04 : 0;

  // Expiry proximity
  if (coupon.expiresAt) {
    const daysLeft = (coupon.expiresAt - Date.now()) / 86_400_000;
    if (daysLeft < 0) return 0; // expired
    if (daysLeft < 3) score -= 0.12;
  }

  // Validated live
  if (coupon.valid === true)  score += 0.15;
  if (coupon.valid === false) score -= 0.30;

  return Math.max(0, Math.min(1, score));
}

export function confidenceLabel(score: number) {
  if (score >= 0.75) return { label: "High",   emoji: "🟢", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (score >= 0.50) return { label: "Medium", emoji: "🟡", color: "text-amber-600   bg-amber-50   border-amber-200"   };
  return               { label: "Low",    emoji: "🔴", color: "text-red-600    bg-red-50     border-red-200"      };
}

// ── Discount application ──────────────────────────────────────────────────────

export function applyDiscount(subtotal: number, coupon: ScrapedCoupon): number {
  if (typeof coupon.minSpend === "number" && subtotal < coupon.minSpend) return 0;
  switch (coupon.type) {
    case "flat":      return Math.min(coupon.value, subtotal);
    case "percent": { const raw = (coupon.value / 100) * subtotal; return typeof coupon.cap === "number" ? Math.min(raw, coupon.cap) : raw; }
    case "free_item": return Math.min(coupon.value, subtotal);
    case "bogo":      return subtotal / 2;
    default:          return 0;
  }
}

// ── Forecasting engine ────────────────────────────────────────────────────────

export interface CouponScenario {
  coupon: ScrapedCoupon & { confidence: number };
  discount: number;
  netPrice: number;
  expectedSavings: number; // discount × confidence
  worstCase: number;       // no coupon works
  bestCase: number;        // full discount
}

export interface Forecast {
  subtotal: number;
  noCouponTotal: number;
  best: CouponScenario | null;
  all: CouponScenario[];
  estimatedRange: [low: number, high: number];
  recommendationText: string;
}

export function buildForecast(subtotal: number, coupons: ScrapedCoupon[]): Forecast {
  const scored = coupons.map(c => ({ ...c, confidence: scoreConfidence(c, coupons) }));

  const scenarios: CouponScenario[] = scored
    .map(c => {
      const discount       = applyDiscount(subtotal, c);
      const netPrice       = Math.max(0, subtotal - discount);
      const expectedSavings = discount * c.confidence;
      return { coupon: c, discount, netPrice, expectedSavings, worstCase: subtotal, bestCase: netPrice };
    })
    .filter(s => s.discount > 0)
    .sort((a, b) => b.expectedSavings - a.expectedSavings);

  const best = scenarios[0] ?? null;
  const maxDiscount = best?.discount ?? 0;
  const expDiscount = best?.expectedSavings ?? 0;

  let recommendationText = "No applicable coupons found for this item.";
  if (best) {
    const pct  = Math.round(best.coupon.confidence * 100);
    const conf = confidenceLabel(best.coupon.confidence);
    recommendationText = `Best bet: "${best.coupon.label}" saves $${best.discount.toFixed(2)} (${conf.label} confidence — ${pct}% likely to work). Expected net: $${(subtotal - expDiscount).toFixed(2)}.`;
  }

  return {
    subtotal,
    noCouponTotal: subtotal,
    best,
    all: scenarios,
    estimatedRange: [subtotal - maxDiscount, subtotal - expDiscount],
    recommendationText,
  };
}
