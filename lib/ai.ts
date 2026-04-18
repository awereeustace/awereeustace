import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedCoupon } from "./scraper";
import type { CouponScenario } from "./forecaster";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AiContext {
  budget: number;
  vendor: string;
  itemName: string;
  subtotal: number;
  scenarios: CouponScenario[];
  query?: string;
}

const SYSTEM = `You are OnBaJet's AI deal advisor — a sharp, concise expert in food budgeting and coupon strategy.
Rules:
- Max 3 sentences. Be direct and specific with dollar amounts.
- Always mention the single best coupon by name and its confidence.
- If no good coupon exists, say so and suggest the cheapest transport option.
- Never hallucinate coupon codes. Only reference what's in the data.`;

export async function getAiRecommendation(ctx: AiContext): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    if (!ctx.scenarios.length) return `No active coupons found for ${ctx.vendor}. At $${ctx.subtotal.toFixed(2)}, this ${ctx.budget >= ctx.subtotal ? "fits" : "exceeds"} your $${ctx.budget.toFixed(2)} budget.`;
    const best = ctx.scenarios[0];
    return `Best deal: "${best.coupon.label}" saves $${best.discount.toFixed(2)} (${Math.round(best.coupon.confidence*100)}% confidence), bringing your total to $${best.netPrice.toFixed(2)}. Expected savings with uncertainty: $${best.expectedSavings.toFixed(2)}.`;
  }

  const couponSummary = ctx.scenarios.slice(0,5).map((s,i) =>
    `${i+1}. "${s.coupon.label}" [${s.coupon.code ?? "no code"}] — saves $${s.discount.toFixed(2)}, confidence ${Math.round(s.coupon.confidence*100)}%, expected $${s.expectedSavings.toFixed(2)}`
  ).join("\n");

  const userMsg = `
Item: ${ctx.itemName} at ${ctx.vendor}
Subtotal (after fees): $${ctx.subtotal.toFixed(2)}
Budget: $${ctx.budget.toFixed(2)}
${ctx.query ? `User query: "${ctx.query}"` : ""}

Available coupons ranked by expected savings:
${couponSummary || "None found."}

Give your recommendation.`.trim();

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : fallback(ctx);
  } catch {
    return fallback(ctx);
  }
}

function fallback(ctx: AiContext): string {
  if (!ctx.scenarios.length) return `No coupons available for ${ctx.vendor} right now.`;
  const b = ctx.scenarios[0];
  return `Use "${b.coupon.label}" for $${b.discount.toFixed(2)} off — ${Math.round(b.coupon.confidence*100)}% confidence. Net price: $${b.netPrice.toFixed(2)}.`;
}

// ── Streaming version for real-time UX ───────────────────────────────────────

export async function* streamAiRecommendation(ctx: AiContext): AsyncGenerator<string> {
  if (!process.env.ANTHROPIC_API_KEY) { yield getAiRecommendation(ctx); return; }

  const couponSummary = ctx.scenarios.slice(0,5).map((s,i) =>
    `${i+1}. "${s.coupon.label}" — saves $${s.discount.toFixed(2)}, ${Math.round(s.coupon.confidence*100)}% confidence`
  ).join("\n");

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role:"user", content:`Item: ${ctx.itemName} at ${ctx.vendor}, $${ctx.subtotal.toFixed(2)}. Budget $${ctx.budget.toFixed(2)}.\nCoupons:\n${couponSummary||"None."}` }],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      yield chunk.delta.text;
    }
  }
}

// ── Meal plan advisor ────────────────────────────────────────────────────────

export interface MealPlanItem {
  name: string;
  vendor: string;
  adjustedPrice: number;
  bestCouponLabel: string | null;
  savings: number;
}

export async function getMealPlanNarrative(
  weeklyBudget: number,
  plan: MealPlanItem[]
): Promise<string> {
  const total = plan.reduce((s,m) => s+m.adjustedPrice, 0);
  const saved  = plan.reduce((s,m) => s+m.savings, 0);

  if (!process.env.ANTHROPIC_API_KEY) {
    return `Your ${plan.length}-meal plan totals $${total.toFixed(2)} of your $${weeklyBudget.toFixed(2)} weekly budget, saving $${saved.toFixed(2)} with coupons. ${total <= weeklyBudget ? "You're on track!" : `You're $${(total-weeklyBudget).toFixed(2)} over — try removing the most expensive meal.`}`;
  }

  const planText = plan.map((m,i) => `Day ${i+1}: ${m.name} from ${m.vendor} — $${m.adjustedPrice.toFixed(2)}${m.bestCouponLabel ? ` (coupon: ${m.bestCouponLabel})` : ""}`).join("\n");

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 180,
      system: "You are a food budget coach. Be encouraging, specific, and under 3 sentences.",
      messages: [{ role:"user", content:`Weekly budget: $${weeklyBudget.toFixed(2)}.\nMeal plan:\n${planText}\nTotal: $${total.toFixed(2)}, saved: $${saved.toFixed(2)}.` }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : `Meal plan totals $${total.toFixed(2)}, saving $${saved.toFixed(2)} in coupons.`;
  } catch {
    return `Meal plan totals $${total.toFixed(2)}, saving $${saved.toFixed(2)} with coupons.`;
  }
}
