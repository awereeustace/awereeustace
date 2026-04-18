"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { ScrapedCoupon } from "@/lib/scraper";
import type { Forecast, CouponScenario } from "@/lib/forecaster";
import { confidenceLabel } from "@/lib/forecaster";

interface ApiResponse {
  vendor: string;
  source: "live" | "mock";
  cachedAgoMs: number | null;
  coupons: (ScrapedCoupon & { confidence: number })[];
  forecast: Forecast | null;
}

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const pct  = Math.round(score * 100);
  const info = confidenceLabel(score);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className={info.color.split(" ")[0]}>{info.emoji} {info.label}</span>
        <span className="text-slate-500">{pct}% likely</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full transition-all ${score >= 0.75 ? "bg-emerald-500" : score >= 0.5 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Single coupon card ────────────────────────────────────────────────────────

function CouponRow({ s, isBest, onCopy }: { s: CouponScenario; isBest: boolean; onCopy: (code: string) => void }) {
  const [copied, setCopied] = useState(false);
  const info = confidenceLabel(s.coupon.confidence);

  function copy() {
    if (!s.coupon.code) return;
    navigator.clipboard.writeText(s.coupon.code).catch(() => {});
    setCopied(true);
    onCopy(s.coupon.code);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 transition ${isBest ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {isBest && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">⭐ Best deal</span>}
          <p className="text-sm font-medium leading-snug">{s.coupon.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">Source: {s.coupon.source}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-700">−{fmt(s.discount)}</p>
          <p className="text-xs text-slate-500">→ {fmt(s.netPrice)}</p>
        </div>
      </div>

      <ConfidenceBar score={s.coupon.confidence} />

      <div className="flex items-center gap-2">
        {s.coupon.code ? (
          <button
            onClick={copy}
            className="font-mono text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-50 transition"
          >
            {copied ? "✓ Copied!" : s.coupon.code}
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Auto-applied / no code needed</span>
        )}
        <span className={`text-xs border rounded-full px-2 py-0.5 ${info.color}`}>{info.label}</span>
        <span className="ml-auto text-xs text-slate-400">
          Expected savings: {fmt(s.expectedSavings)}
        </span>
      </div>
    </div>
  );
}

// ── Forecast summary banner ───────────────────────────────────────────────────

function ForecastBanner({ forecast }: { forecast: Forecast }) {
  const [low, high] = forecast.estimatedRange;
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-1">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">💡 Savings Forecast</p>
      <p className="text-sm text-slate-700">{forecast.recommendationText}</p>
      <div className="flex gap-4 text-xs mt-1">
        <span className="text-slate-500">No coupon: <strong>{fmt(forecast.noCouponTotal)}</strong></span>
        <span className="text-emerald-600">Best case: <strong>{fmt(forecast.estimatedRange[0])}</strong></span>
        <span className="text-amber-600">Expected: <strong>{fmt(high)}</strong></span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CouponEngine({ vendor, subtotal }: { vendor: string; subtotal: number }) {
  const [data, setData]         = useState<ApiResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  const fetchCoupons = useCallback(async (refresh = false, validate = false) => {
    setLoading(true);
    if (validate) setValidating(true);
    setError(null);
    try {
      const params = new URLSearchParams({ vendor, subtotal: subtotal.toFixed(2) });
      if (refresh)  params.set("refresh",  "true");
      if (validate) params.set("validate", "true");
      const res = await fetch(`/api/coupons?${params}`);
      if (!res.ok) throw new Error("Failed to fetch coupons");
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setValidating(false);
    }
  }, [vendor, subtotal]);

  // Auto-fetch on mount and when vendor/subtotal changes
  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const cacheMin = data?.cachedAgoMs != null ? Math.round(data.cachedAgoMs / 60000) : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Coupons for <span className="text-emerald-700">{vendor}</span></p>
          {data && (
            <p className="text-xs text-slate-400">
              {data.source === "live" ? "🌐 Live data" : "📦 Cached data"}
              {cacheMin !== null ? ` · fetched ${cacheMin}m ago` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => fetchCoupons(false, true)} disabled={loading}>
            {validating ? "Testing…" : "🧪 Test coupons"}
          </Button>
          <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => fetchCoupons(true)} disabled={loading}>
            {loading && !validating ? "Scraping…" : "🔄 Refresh"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {lastCopied && (
        <p className="text-xs text-emerald-600">✓ Copied <strong>{lastCopied}</strong> to clipboard</p>
      )}

      {/* Forecast banner */}
      {data?.forecast && <ForecastBanner forecast={data.forecast} />}

      {/* Coupon list */}
      {loading && !data && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {data && data.forecast && data.forecast.all.length > 0 ? (
        <div className="space-y-2">
          {data.forecast.all.map((s, i) => (
            <CouponRow
              key={s.coupon.id}
              s={s}
              isBest={i === 0}
              onCopy={setLastCopied}
            />
          ))}
        </div>
      ) : data && !loading ? (
        <Card><CardContent className="p-4 text-sm text-slate-400 text-center">No coupons found for this item's price point.</CardContent></Card>
      ) : null}

      {data && data.coupons.length > 0 && (!data.forecast || data.forecast.all.length === 0) && (
        <div className="space-y-2">
          {data.coupons.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex justify-between">
                <span>{c.label}</span>
                <span className="text-xs text-slate-400">{c.source}</span>
              </div>
              <ConfidenceBar score={c.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
