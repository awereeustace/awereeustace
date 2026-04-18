"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Slider from "@/components/ui/Slider";
import type { MealPlan } from "@/lib/mealPlanner";

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const ALL_CUISINES = ["American","Burgers","Pizza","Sandwiches","Mexican","Asian","Chicken","Healthy","Wraps","Soup"];

export default function MealPlanner() {
  const [budget,    setBudget]    = useState(40);
  const [days,      setDays]      = useState(5);
  const [cuisines,  setCuisines]  = useState<string[]>([]);
  const [plan,      setPlan]      = useState<MealPlan | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  function toggleCuisine(c: string) {
    setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyBudget: budget, days, cuisineFilter: cuisines }),
      });
      const data = await res.json();
      setPlan(data.plan);
      setNarrative(data.narrative);
    } finally {
      setLoading(false);
    }
  }

  const budgetPct = plan ? Math.min(100, (plan.totalCost / budget) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="rounded-2xl"><CardContent className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 flex justify-between">
              Weekly food budget <span className="font-semibold">{fmt(budget)}</span>
            </label>
            <Slider value={budget} min={15} max={150} step={5} onChange={setBudget} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 flex justify-between">
              Days to plan <span className="font-semibold">{days}</span>
            </label>
            <Slider value={days} min={1} max={7} step={1} onChange={setDays} />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Cuisine preferences (optional)</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CUISINES.map(c => (
              <button key={c} onClick={() => toggleCuisine(c)}
                className={`rounded-full px-3 py-1 text-xs transition ${cuisines.includes(c) ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={generate} disabled={loading}>
          {loading ? "Planning your meals…" : "✨ Generate Meal Plan"}
        </Button>
      </CardContent></Card>

      {/* Results */}
      {plan && (
        <>
          {/* Budget bar */}
          <Card className="rounded-2xl"><CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Budget used</span>
              <span className={plan.withinBudget ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                {fmt(plan.totalCost)} / {fmt(budget)}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100">
              <div className={`h-3 rounded-full transition-all ${plan.withinBudget ? "bg-emerald-500" : "bg-red-400"}`}
                style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>🎟 Coupons saved: {fmt(plan.totalSavings)}</span>
              <span>Avg/meal: {fmt(plan.averagePerMeal)}</span>
              {plan.withinBudget && <span className="text-emerald-600">{fmt(plan.budgetRemaining)} left over</span>}
            </div>
          </CardContent></Card>

          {/* AI narrative */}
          {narrative && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">🤖 AI Meal Coach</p>
              <p className="text-sm text-slate-700">{narrative}</p>
            </div>
          )}

          {/* Meal list */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.meals.map((m) => (
              <Card key={m.day} className="rounded-2xl"><CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">{m.day}</p>
                    <p className="font-medium text-sm leading-snug">{m.item.name}</p>
                    <p className="text-xs text-slate-500">{m.item.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{fmt(m.adjustedPrice)}</p>
                    {m.savings > 0 && <p className="text-xs text-emerald-600">−{fmt(m.savings)}</p>}
                  </div>
                </div>
                {m.bestCoupon && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs text-emerald-700">
                    🎟 {m.bestCoupon.label}
                    {m.bestCoupon.code && <span className="ml-1 font-mono font-bold">{m.bestCoupon.code}</span>}
                  </div>
                )}
              </CardContent></Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
