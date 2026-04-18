import * as cheerio from "cheerio";

export type CouponType = "flat" | "percent" | "bogo" | "free_item";

export interface ScrapedCoupon {
  id: string;
  vendor: string;
  code: string | null;
  label: string;
  type: CouponType;
  value: number;
  minSpend?: number;
  cap?: number;
  source: string;
  sourceUrl: string;
  scrapedAt: number;
  expiresAt?: number;
  confidence: number;
  valid?: boolean; // result of live validation check
}

interface CacheEntry {
  coupons: ScrapedCoupon[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const scraperCache = new Map<string, CacheEntry>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDiscount(text: string): Pick<ScrapedCoupon, "type" | "value" | "minSpend" | "cap"> | null {
  const flat = text.match(/\$(\d+(?:\.\d+)?)\s*off/i);
  const pct  = text.match(/(\d+)%\s*off/i);
  const bogo = /buy\s+one\s+get\s+one|bogo/i.test(text);
  const free = text.match(/free\s+(.+?)(?:\s+with|\s+on|$)/i);
  const min  = text.match(/(?:on|over|spend)\s+\$(\d+(?:\.\d+)?)/i);
  const cap  = text.match(/up\s+to\s+\$(\d+(?:\.\d+)?)/i);
  if (flat)  return { type: "flat",      value: parseFloat(flat[1]),  minSpend: min ? parseFloat(min[1]) : undefined, cap: cap ? parseFloat(cap[1]) : undefined };
  if (pct)   return { type: "percent",   value: parseInt(pct[1]),     minSpend: min ? parseFloat(min[1]) : undefined, cap: cap ? parseFloat(cap[1]) : undefined };
  if (bogo)  return { type: "bogo",      value: 0 };
  if (free)  return { type: "free_item", value: 0 };
  return null;
}

async function safeFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? res.text() : null;
  } catch {
    return null;
  }
}

// ── Source: RetailMeNot ───────────────────────────────────────────────────────

async function scrapeRetailMeNot(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://www.retailmenot.com/view/${slug}.com`;
  const html = await safeFetch(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: ScrapedCoupon[] = [];

  // Try structured JSON-LD first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      const items: unknown[] = data["@type"] === "ItemList" ? (data.itemListElement ?? []) : [];
      for (const item of items as Record<string, unknown>[]) {
        const offer = (item.item ?? item) as Record<string, string>;
        const desc  = String(offer.name ?? offer.description ?? "");
        const parsed = parseDiscount(desc);
        if (!parsed) continue;
        const code = String(offer.url ?? "").match(/code[=:]([A-Z0-9]+)/i)?.[1] ?? null;
        results.push({ id: `rmn-${slug}-${results.length}`, vendor, code, label: desc.slice(0, 100), ...parsed, source: "RetailMeNot", sourceUrl: url, scrapedAt: Date.now(), confidence: 0 });
      }
    } catch { /* ignore */ }
  });

  // Fallback: parse visible offer cards
  if (results.length === 0) {
    $(".offer-title, .js-offer-title, [data-offer-name]").each((_, el) => {
      const desc   = $(el).text().trim();
      const parsed = parseDiscount(desc);
      if (!parsed) return;
      const code   = $(el).closest("[data-code]").attr("data-code") ?? null;
      results.push({ id: `rmn-${slug}-${results.length}`, vendor, code, label: desc.slice(0, 100), ...parsed, source: "RetailMeNot", sourceUrl: url, scrapedAt: Date.now(), confidence: 0 });
    });
  }

  return results.slice(0, 6);
}

// ── Source: Slickdeals ────────────────────────────────────────────────────────

async function scrapeSlickdeals(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://slickdeals.net/coupons/${slug}/`;
  const html = await safeFetch(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: ScrapedCoupon[] = [];

  $(".dealCard__title, .sd-card-title, h3.title").each((_, el) => {
    const desc   = $(el).text().trim();
    const parsed = parseDiscount(desc);
    if (!parsed) return;
    results.push({ id: `sd-${slug}-${results.length}`, vendor, code: null, label: desc.slice(0, 100), ...parsed, source: "Slickdeals", sourceUrl: url, scrapedAt: Date.now(), confidence: 0 });
  });

  return results.slice(0, 4);
}

// ── Source: Coupon.com ────────────────────────────────────────────────────────

async function scrapeCouponCom(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://www.coupon.com/coupons/${slug}`;
  const html = await safeFetch(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: ScrapedCoupon[] = [];

  $(".coupon-title, .coupon-description, h3").each((_, el) => {
    const desc   = $(el).text().trim();
    const parsed = parseDiscount(desc);
    if (!parsed) return;
    results.push({ id: `cc-${slug}-${results.length}`, vendor, code: null, label: desc.slice(0, 100), ...parsed, source: "Coupon.com", sourceUrl: url, scrapedAt: Date.now(), confidence: 0 });
  });

  return results.slice(0, 4);
}

// ── Coupon validation: test if the code is still live ─────────────────────────

export async function validateCoupon(coupon: ScrapedCoupon): Promise<boolean> {
  if (!coupon.sourceUrl || coupon.sourceUrl === "#") return true; // mock, assume valid
  const html = await safeFetch(coupon.sourceUrl);
  if (!html) return false;
  const expired = /expired|no longer valid|deal is over/i.test(html);
  return !expired;
}

// ── Enriched mock fallback ────────────────────────────────────────────────────

const MOCK_DB: Record<string, Omit<ScrapedCoupon, "id" | "scrapedAt" | "confidence">[]> = {
  "Patty Palace": [
    { vendor: "Patty Palace", code: "PATTY3",    label: "$3 off orders $10+",               type: "flat",      value: 3,    minSpend: 10, source: "RetailMeNot",   sourceUrl: "#" },
    { vendor: "Patty Palace", code: "BURGER15",  label: "15% off, max $4 discount",         type: "percent",   value: 15,   cap: 4,       source: "Coupon.com",    sourceUrl: "#" },
    { vendor: "Patty Palace", code: null,         label: "Free fries with any burger",       type: "free_item", value: 1.99,              source: "Restaurant app",sourceUrl: "#" },
    { vendor: "Patty Palace", code: "BOGO",      label: "Buy one burger, get one free",     type: "bogo",      value: 0,                 source: "Slickdeals",    sourceUrl: "#" },
  ],
  "Toasty Town": [
    { vendor: "Toasty Town",  code: "TOASTY1",   label: "$1 off any sandwich",              type: "flat",      value: 1,                 source: "In-store",      sourceUrl: "#" },
    { vendor: "Toasty Town",  code: "LUNCH20",   label: "20% off lunch (11 am–3 pm)",      type: "percent",   value: 20,                source: "RetailMeNot",   sourceUrl: "#" },
    { vendor: "Toasty Town",  code: "TOAST5",    label: "$5 off orders $20+",              type: "flat",      value: 5,    minSpend: 20, source: "Coupon.com",    sourceUrl: "#" },
  ],
};

function mockCoupons(vendor: string): ScrapedCoupon[] {
  const base = MOCK_DB[vendor] ?? [];
  return base.map((m, i) => ({ ...m, id: `mock-${vendor.replace(/\s/g, "")}-${i}`, scrapedAt: Date.now(), confidence: 0 }));
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function scrapeCoupons(vendor: string, forceRefresh = false): Promise<ScrapedCoupon[]> {
  const key = vendor.toLowerCase();
  if (!forceRefresh) {
    const cached = scraperCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.coupons;
  }

  const [rmn, sd, cc] = await Promise.allSettled([
    scrapeRetailMeNot(vendor),
    scrapeSlickdeals(vendor),
    scrapeCouponCom(vendor),
  ]);

  const live = [
    ...(rmn.status === "fulfilled" ? rmn.value : []),
    ...(sd.status  === "fulfilled" ? sd.value  : []),
    ...(cc.status  === "fulfilled" ? cc.value  : []),
  ];

  const coupons = live.length > 0 ? live : mockCoupons(vendor);
  scraperCache.set(key, { coupons, fetchedAt: Date.now() });
  return coupons;
}

export function getCacheAgeMs(vendor: string): number | null {
  const entry = scraperCache.get(vendor.toLowerCase());
  return entry ? Date.now() - entry.fetchedAt : null;
}
