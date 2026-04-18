"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { confidenceLabel } from "@/lib/forecaster";
import type { ScrapedCoupon } from "@/lib/scraper";

interface FeedEntry {
  vendor: string;
  couponCount: number;
  bestCoupon: (ScrapedCoupon & { confidence: number }) | null;
  bestDiscount: number;
  coupons: (ScrapedCoupon & { confidence: number })[];
}

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function HeatBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 66 ? "bg-emerald-500" : pct >= 33 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DealsFeed() {
  const [feed,    setFeed]    = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/deals-feed");
      const data = await res.json();
      setFeed(data.feed ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const maxDiscount = Math.max(...feed.map(f => f.bestDiscount), 0.01);

  function copy(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">🔥 Best Deals Right Now</h2>
          <p className="text-xs text-slate-500">Ranked by expected savings across all vendors</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading} className="text-xs py-1 px-3">
          {loading ? "Loading…" : "🔄 Refresh"}
        </Button>
      </div>

      {loading && !feed.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({length:6}).map((_,i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {feed.map((entry, rank) => {
          const c    = entry.bestCoupon;
          const info = c ? confidenceLabel(c.confidence) : null;
          return (
            <Card key={entry.vendor} className={`rounded-2xl ${rank === 0 ? "border-emerald-400 ring-1 ring-emerald-300" : ""}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    {rank === 0 && <span className="text-[10px] font-bold uppercase text-emerald-600">🏆 Top deal</span>}
                    <p className="font-semibold text-sm">{entry.vendor}</p>
                    <p className="text-xs text-slate-400">{entry.couponCount} coupon{entry.couponCount !== 1 ? "s" : ""} available</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">−{fmt(entry.bestDiscount)}</p>
                    <p className="text-xs text-slate-400">exp. savings</p>
                  </div>
                </div>

                <HeatBar value={entry.bestDiscount} max={maxDiscount} />

                {c && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
                    <p className="text-xs font-medium leading-snug">{c.label}</p>
                    <div className="flex items-center justify-between gap-2">
                      {info && <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${info.color}`}>{info.emoji} {info.label}</span>}
                      {c.code ? (
                        <button onClick={() => copy(c.code!)}
                          className="font-mono text-[10px] bg-white border rounded px-1.5 py-0.5 hover:bg-slate-100">
                          {copied === c.code ? "✓ Copied" : c.code}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Auto-applied</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
