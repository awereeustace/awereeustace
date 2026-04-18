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
  valid?: boolean;
}

interface CacheEntry { coupons: ScrapedCoupon[]; fetchedAt: number; }
const scraperCache = new Map<string, CacheEntry>();
const inflight     = new Map<string, Promise<ScrapedCoupon[]>>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_RETRIES  = 2;

// ── helpers ───────────────────────────────────────────────────────────────────

function parseDiscount(text: string): Pick<ScrapedCoupon,"type"|"value"|"minSpend"|"cap"> | null {
  const flat = text.match(/\$(\d+(?:\.\d+)?)\s*off/i);
  const pct  = text.match(/(\d+)%\s*off/i);
  const bogo = /buy\s+one\s+get\s+one|bogo/i.test(text);
  const free = /free\s+\w/i.test(text);
  const min  = text.match(/(?:on|over|spend|orders?)\s+\$?(\d+(?:\.\d+)?)\+?/i);
  const cap  = text.match(/up\s+to\s+\$(\d+(?:\.\d+)?)/i);
  if (flat) return { type:"flat",      value:parseFloat(flat[1]),  minSpend:min?parseFloat(min[1]):undefined, cap:cap?parseFloat(cap[1]):undefined };
  if (pct)  return { type:"percent",   value:parseInt(pct[1]),     minSpend:min?parseFloat(min[1]):undefined, cap:cap?parseFloat(cap[1]):undefined };
  if (bogo) return { type:"bogo",      value:0 };
  if (free) return { type:"free_item", value:0 };
  return null;
}

async function safeFetch(url: string, attempt = 0): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      return safeFetch(url, attempt + 1);
    }
    return res.ok ? res.text() : null;
  } catch {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 800 * 2 ** attempt));
      return safeFetch(url, attempt + 1);
    }
    return null;
  }
}

// ── scrapers ──────────────────────────────────────────────────────────────────

async function scrapeRetailMeNot(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://www.retailmenot.com/view/${slug}.com`;
  const html = await safeFetch(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: ScrapedCoupon[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data  = JSON.parse($(el).html() ?? "{}");
      const items: unknown[] = data["@type"] === "ItemList" ? (data.itemListElement ?? []) : [];
      for (const raw of items as Record<string,unknown>[]) {
        const offer = (raw.item ?? raw) as Record<string,string>;
        const desc  = String(offer.name ?? offer.description ?? "");
        const p = parseDiscount(desc); if (!p) continue;
        const code = String(offer.url ?? "").match(/code[=:]([A-Z0-9]+)/i)?.[1] ?? null;
        out.push({ id:`rmn-${slug}-${out.length}`, vendor, code, label:desc.slice(0,100), ...p, source:"RetailMeNot", sourceUrl:url, scrapedAt:Date.now(), confidence:0 });
      }
    } catch { /* skip */ }
  });
  if (!out.length) {
    $(".offer-title,.js-offer-title,[data-offer-name]").each((_,el) => {
      const desc = $(el).text().trim();
      const p = parseDiscount(desc); if (!p) return;
      const code = $(el).closest("[data-code]").attr("data-code") ?? null;
      out.push({ id:`rmn-${slug}-${out.length}`, vendor, code, label:desc.slice(0,100), ...p, source:"RetailMeNot", sourceUrl:url, scrapedAt:Date.now(), confidence:0 });
    });
  }
  return out.slice(0,6);
}

async function scrapeSlickdeals(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://slickdeals.net/coupons/${slug}/`;
  const html = await safeFetch(url); if (!html) return [];
  const $ = cheerio.load(html);
  const out: ScrapedCoupon[] = [];
  $(".dealCard__title,.sd-card-title,h3.title").each((_,el) => {
    const desc = $(el).text().trim();
    const p = parseDiscount(desc); if (!p) return;
    out.push({ id:`sd-${slug}-${out.length}`, vendor, code:null, label:desc.slice(0,100), ...p, source:"Slickdeals", sourceUrl:url, scrapedAt:Date.now(), confidence:0 });
  });
  return out.slice(0,4);
}

async function scrapeCouponCom(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://www.coupon.com/coupons/${slug}`;
  const html = await safeFetch(url); if (!html) return [];
  const $ = cheerio.load(html);
  const out: ScrapedCoupon[] = [];
  $(".coupon-title,.coupon-description,h3").each((_,el) => {
    const desc = $(el).text().trim();
    const p = parseDiscount(desc); if (!p) return;
    out.push({ id:`cc-${slug}-${out.length}`, vendor, code:null, label:desc.slice(0,100), ...p, source:"Coupon.com", sourceUrl:url, scrapedAt:Date.now(), confidence:0 });
  });
  return out.slice(0,4);
}

async function scrapeGroupon(vendor: string): Promise<ScrapedCoupon[]> {
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url  = `https://www.groupon.com/coupons/${slug}`;
  const html = await safeFetch(url); if (!html) return [];
  const $ = cheerio.load(html);
  const out: ScrapedCoupon[] = [];
  $("[class*='coupon-title'],[class*='deal-title'],h3,[class*='headline']").each((_,el) => {
    const desc = $(el).text().trim();
    const p = parseDiscount(desc); if (!p) return;
    const code = $(el).closest("[data-code],[data-coupon-code]").attr("data-code") ?? null;
    out.push({ id:`gp-${slug}-${out.length}`, vendor, code, label:desc.slice(0,100), ...p, source:"Groupon", sourceUrl:url, scrapedAt:Date.now(), confidence:0 });
  });
  return out.slice(0,4);
}

// ── enriched mock DB (15 vendors) ─────────────────────────────────────────────

const MOCK_DB: Record<string, Omit<ScrapedCoupon,"id"|"scrapedAt"|"confidence">[]> = {
  "Patty Palace": [
    { vendor:"Patty Palace", code:"PATTY3",   label:"$3 off orders $10+",              type:"flat",      value:3,    minSpend:10, source:"RetailMeNot",   sourceUrl:"#" },
    { vendor:"Patty Palace", code:"BURGER15", label:"15% off, max $4 discount",        type:"percent",   value:15,   cap:4,       source:"Coupon.com",    sourceUrl:"#" },
    { vendor:"Patty Palace", code:null,        label:"Free fries with any burger",      type:"free_item", value:1.99,              source:"Restaurant app",sourceUrl:"#" },
    { vendor:"Patty Palace", code:"BOGO",     label:"Buy one burger, get one 50% off", type:"percent",   value:50,   cap:5,       source:"Groupon",       sourceUrl:"#" },
  ],
  "Toasty Town": [
    { vendor:"Toasty Town",  code:"TOASTY1",  label:"$1 off any sandwich",             type:"flat",      value:1,                 source:"In-store",      sourceUrl:"#" },
    { vendor:"Toasty Town",  code:"LUNCH20",  label:"20% off lunch (11am–3pm)",        type:"percent",   value:20,                source:"RetailMeNot",   sourceUrl:"#" },
    { vendor:"Toasty Town",  code:"TOAST5",   label:"$5 off orders $20+",              type:"flat",      value:5,    minSpend:20, source:"Coupon.com",    sourceUrl:"#" },
  ],
  "Pizza Planet": [
    { vendor:"Pizza Planet", code:"PIZZA2",   label:"$2 off any large pizza",          type:"flat",      value:2,                 source:"RetailMeNot",   sourceUrl:"#" },
    { vendor:"Pizza Planet", code:"SLICE25",  label:"25% off online orders $15+",      type:"percent",   value:25,   minSpend:15, source:"Groupon",       sourceUrl:"#" },
    { vendor:"Pizza Planet", code:null,        label:"Free 2-liter with XL pizza",      type:"free_item", value:2.49,              source:"Restaurant app",sourceUrl:"#" },
  ],
  "Burger World": [
    { vendor:"Burger World", code:"BW2FOR1",  label:"Buy 1 get 1 free on burgers",     type:"bogo",      value:0,                 source:"Restaurant app",sourceUrl:"#" },
    { vendor:"Burger World", code:"BWSAVE3",  label:"$3 off $12+ orders",              type:"flat",      value:3,    minSpend:12, source:"Slickdeals",    sourceUrl:"#" },
  ],
  "Cluckers": [
    { vendor:"Cluckers",     code:"CLUCK10",  label:"10% off your entire order",       type:"percent",   value:10,                source:"Coupon.com",    sourceUrl:"#" },
    { vendor:"Cluckers",     code:"WING4",    label:"$4 off bucket orders $18+",       type:"flat",      value:4,    minSpend:18, source:"RetailMeNot",   sourceUrl:"#" },
    { vendor:"Cluckers",     code:null,        label:"Free biscuit with 8-pc meal",     type:"free_item", value:1.29,              source:"In-store",      sourceUrl:"#" },
  ],
  "Nacho Mama's": [
    { vendor:"Nacho Mama's", code:"NACHO5",   label:"$5 off $20+ online orders",       type:"flat",      value:5,    minSpend:20, source:"Groupon",       sourceUrl:"#" },
    { vendor:"Nacho Mama's", code:"BOWL15",   label:"15% off burrito bowls",           type:"percent",   value:15,                source:"RetailMeNot",   sourceUrl:"#" },
  ],
  "Dragon Wok": [
    { vendor:"Dragon Wok",   code:"DRAGON3",  label:"$3 off orders over $13",          type:"flat",      value:3,    minSpend:13, source:"Coupon.com",    sourceUrl:"#" },
    { vendor:"Dragon Wok",   code:"WOK20",    label:"20% off Mon–Thu only",            type:"percent",   value:20,                source:"RetailMeNot",   sourceUrl:"#" },
  ],
  "Bread & Co.": [
    { vendor:"Bread & Co.",  code:"BREAD2",   label:"$2 off soups & sandwiches",       type:"flat",      value:2,                 source:"In-store",      sourceUrl:"#" },
    { vendor:"Bread & Co.",  code:"BAKERY10", label:"10% off bakery items",            type:"percent",   value:10,                source:"Slickdeals",    sourceUrl:"#" },
  ],
  "Sub Station": [
    { vendor:"Sub Station",  code:"SUB3",     label:"$3 off footlong subs",            type:"flat",      value:3,                 source:"RetailMeNot",   sourceUrl:"#" },
    { vendor:"Sub Station",  code:"COMBO15",  label:"15% off combo meals",             type:"percent",   value:15,                source:"Coupon.com",    sourceUrl:"#" },
  ],
  "Taco Fiesta": [
    { vendor:"Taco Fiesta",  code:"TACO2",    label:"$2 off 3+ tacos",                 type:"flat",      value:2,    minSpend:6,  source:"Restaurant app",sourceUrl:"#" },
    { vendor:"Taco Fiesta",  code:null,        label:"Free chips & queso on $15+",      type:"free_item", value:2.99, minSpend:15, source:"Groupon",       sourceUrl:"#" },
  ],
};

function mockCoupons(vendor: string): ScrapedCoupon[] {
  const base = MOCK_DB[vendor] ?? [];
  return base.map((m,i) => ({ ...m, id:`mock-${vendor.replace(/\W/g,"")}-${i}`, scrapedAt:Date.now(), confidence:0 }));
}

// ── validation ────────────────────────────────────────────────────────────────

export async function validateCoupon(coupon: ScrapedCoupon): Promise<boolean> {
  if (!coupon.sourceUrl || coupon.sourceUrl === "#") return true;
  const html = await safeFetch(coupon.sourceUrl);
  if (!html) return false;
  return !/expired|no longer valid|deal is over|unavailable/i.test(html);
}

// ── main entry point ──────────────────────────────────────────────────────────

export async function scrapeCoupons(vendor: string, forceRefresh = false): Promise<ScrapedCoupon[]> {
  const key = vendor.toLowerCase();

  if (!forceRefresh) {
    const cached = scraperCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.coupons;
  }

  // Deduplication: coalesce concurrent requests for the same vendor
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = (async () => {
    const [rmn, sd, cc, gp] = await Promise.allSettled([
      scrapeRetailMeNot(vendor),
      scrapeSlickdeals(vendor),
      scrapeCouponCom(vendor),
      scrapeGroupon(vendor),
    ]);
    const live = [
      ...(rmn.status==="fulfilled"?rmn.value:[]),
      ...(sd.status ==="fulfilled"?sd.value :[]),
      ...(cc.status ==="fulfilled"?cc.value :[]),
      ...(gp.status ==="fulfilled"?gp.value :[]),
    ];
    const coupons = live.length > 0 ? live : mockCoupons(vendor);
    scraperCache.set(key, { coupons, fetchedAt: Date.now() });
    inflight.delete(key);
    return coupons;
  })();

  inflight.set(key, promise);
  return promise;
}

export function getCacheAgeMs(vendor: string): number | null {
  const entry = scraperCache.get(vendor.toLowerCase());
  return entry ? Date.now() - entry.fetchedAt : null;
}

export function getAllKnownVendors(): string[] {
  return Object.keys(MOCK_DB);
}
