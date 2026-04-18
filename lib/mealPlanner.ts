import type { ScrapedCoupon } from "./scraper";
import { applyDiscount, scoreConfidence } from "./forecaster";

export interface MenuItem {
  id: string;
  name: string;
  vendor: string;
  cuisine: string[];
  basePrice: number;
  estFeesTax: number;
  pickupAvailable: boolean;
  coupons: ScrapedCoupon[];
  distanceMi?: number;
}

export interface PlannedMeal {
  day: string;
  item: MenuItem;
  bestCoupon: ScrapedCoupon | null;
  discount: number;
  adjustedPrice: number;
  savings: number;
}

export interface MealPlan {
  meals: PlannedMeal[];
  totalCost: number;
  totalSavings: number;
  averagePerMeal: number;
  withinBudget: boolean;
  budgetRemaining: number;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export function buildMealPlan(
  items: MenuItem[],
  allCoupons: Map<string, ScrapedCoupon[]>,
  weeklyBudget: number,
  days = 5,
): MealPlan {
  // Score every item: compute best coupon savings + adjusted price
  const scored = items.map(item => {
    const coupons = allCoupons.get(item.vendor) ?? item.coupons;
    const subtotal = item.basePrice + item.estFeesTax;
    let bestCoupon: ScrapedCoupon | null = null;
    let bestDiscount = 0;
    for (const c of coupons) {
      const conf = scoreConfidence(c, coupons);
      const d    = applyDiscount(subtotal, c) * conf; // confidence-weighted discount
      if (d > bestDiscount) { bestDiscount = d; bestCoupon = { ...c, confidence: conf }; }
    }
    const discount      = bestCoupon ? applyDiscount(subtotal, bestCoupon) : 0;
    const adjustedPrice = Math.max(0, subtotal - discount);
    const valueScore    = discount / subtotal; // 0–1, higher = better deal
    return { item, bestCoupon, discount, adjustedPrice, valueScore };
  });

  // Sort by value score descending (best deals first)
  scored.sort((a,b) => b.valueScore - a.valueScore);

  // Greedy selection: pick `days` meals maximising vendor variety within budget
  const selected: typeof scored = [];
  const usedVendors = new Set<string>();
  const budget = weeklyBudget;
  let remaining = budget;

  // Pass 1: pick best deal from each unique vendor
  for (const s of scored) {
    if (selected.length >= days) break;
    if (!usedVendors.has(s.item.vendor) && s.adjustedPrice <= remaining) {
      selected.push(s);
      usedVendors.add(s.item.vendor);
      remaining -= s.adjustedPrice;
    }
  }
  // Pass 2: fill remaining slots if budget allows
  for (const s of scored) {
    if (selected.length >= days) break;
    if (!selected.includes(s) && s.adjustedPrice <= remaining) {
      selected.push(s);
      remaining -= s.adjustedPrice;
    }
  }
  // Pass 3: if still not enough, allow going slightly over budget
  for (const s of scored) {
    if (selected.length >= days) break;
    if (!selected.includes(s)) { selected.push(s); remaining -= s.adjustedPrice; }
  }

  const meals: PlannedMeal[] = selected.slice(0, days).map((s, i) => ({
    day: DAYS[i],
    item: s.item,
    bestCoupon: s.bestCoupon,
    discount: s.discount,
    adjustedPrice: s.adjustedPrice,
    savings: s.discount,
  }));

  const totalCost    = meals.reduce((acc, m) => acc + m.adjustedPrice, 0);
  const totalSavings = meals.reduce((acc, m) => acc + m.savings, 0);

  return {
    meals,
    totalCost,
    totalSavings,
    averagePerMeal: totalCost / Math.max(meals.length, 1),
    withinBudget: totalCost <= weeklyBudget,
    budgetRemaining: weeklyBudget - totalCost,
  };
}
