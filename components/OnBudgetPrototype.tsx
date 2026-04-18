"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Slider from "@/components/ui/Slider";
import Badge from "@/components/ui/Badge";
import CouponEngine from "@/components/CouponEngine";
import MealPlanner from "@/components/MealPlanner";
import DealsFeed from "@/components/DealsFeed";

const MapRadiusPicker = dynamic(() => import("@/components/MapRadiusPicker"), { ssr: false });

// ── types ─────────────────────────────────────────────────────────────────────

type Coupon   = { id:string; label:string; type:"flat"|"percent"; value:number; minSpend?:number; cap?:number; source:string };
type MenuItem = { id:string; name:string; vendor:string; cuisine:string[]; basePrice:number; estFeesTax:number; pickupAvailable:boolean; coupons:Coupon[]; url?:string; distanceMi?:number };

// ── menu data ─────────────────────────────────────────────────────────────────

const MENU: MenuItem[] = [
  { id:"1",  name:"Classic Cheeseburger",      vendor:"Patty Palace",  cuisine:["American","Burgers"],    basePrice:6.99, estFeesTax:1.20, pickupAvailable:true,  coupons:[{ id:"c1",label:"$3 off $10+",type:"flat",value:3,minSpend:10,source:"RetailMeNot"},{id:"c2",label:"15% off up to $4",type:"percent",value:15,cap:4,source:"Promo"}], distanceMi:1.2 },
  { id:"2",  name:"Double Smash Burger",        vendor:"Patty Palace",  cuisine:["American","Burgers"],    basePrice:9.49, estFeesTax:1.50, pickupAvailable:true,  coupons:[{id:"c3",label:"$3 off $10+",type:"flat",value:3,minSpend:10,source:"RetailMeNot"}], distanceMi:1.2 },
  { id:"3",  name:"Grilled Chicken Club",       vendor:"Toasty Town",   cuisine:["American","Sandwiches"], basePrice:4.75, estFeesTax:0.75, pickupAvailable:true,  coupons:[{id:"c4",label:"$1 off any sandwich",type:"flat",value:1,source:"In-store"},{id:"c5",label:"20% off lunch",type:"percent",value:20,source:"RetailMeNot"}], distanceMi:0.6 },
  { id:"4",  name:"Buffalo Chicken Wrap",       vendor:"Toasty Town",   cuisine:["American","Wraps"],      basePrice:5.99, estFeesTax:0.90, pickupAvailable:true,  coupons:[{id:"c6",label:"20% off lunch",type:"percent",value:20,source:"RetailMeNot"}], distanceMi:0.6 },
  { id:"5",  name:"Italian Sub",                vendor:"Sub Station",   cuisine:["Sandwiches"],            basePrice:5.49, estFeesTax:0.80, pickupAvailable:true,  coupons:[{id:"c7",label:"$3 off footlong subs",type:"flat",value:3,source:"RetailMeNot"}], distanceMi:0.9 },
  { id:"6",  name:"Pepperoni Pizza (12\")",     vendor:"Pizza Planet",  cuisine:["Pizza","Italian"],       basePrice:10.99,estFeesTax:1.80, pickupAvailable:true,  coupons:[{id:"c8",label:"$2 off any large pizza",type:"flat",value:2,source:"RetailMeNot"},{id:"c9",label:"25% off $15+",type:"percent",value:25,minSpend:15,source:"Groupon"}], distanceMi:2.1 },
  { id:"7",  name:"BBQ Chicken Pizza",          vendor:"Pizza Planet",  cuisine:["Pizza"],                 basePrice:11.49,estFeesTax:1.90, pickupAvailable:true,  coupons:[{id:"c10",label:"25% off $15+",type:"percent",value:25,minSpend:15,source:"Groupon"}], distanceMi:2.1 },
  { id:"8",  name:"Classic Burger Combo",       vendor:"Burger World",  cuisine:["American","Burgers"],    basePrice:7.99, estFeesTax:1.30, pickupAvailable:true,  coupons:[{id:"c11",label:"Buy 1 get 1 free",type:"flat",value:7.99,source:"Restaurant app"},{id:"c12",label:"$3 off $12+",type:"flat",value:3,minSpend:12,source:"Slickdeals"}], distanceMi:1.8 },
  { id:"9",  name:"3-Piece Fried Chicken",      vendor:"Cluckers",      cuisine:["Chicken","American"],    basePrice:6.49, estFeesTax:1.00, pickupAvailable:true,  coupons:[{id:"c13",label:"10% off entire order",type:"percent",value:10,source:"Coupon.com"},{id:"c14",label:"$4 off bucket $18+",type:"flat",value:4,minSpend:18,source:"RetailMeNot"}], distanceMi:1.5 },
  { id:"10", name:"Chicken Burrito Bowl",       vendor:"Nacho Mama's",  cuisine:["Mexican","Tex-Mex"],     basePrice:8.49, estFeesTax:1.40, pickupAvailable:false, coupons:[{id:"c15",label:"$5 off $20+",type:"flat",value:5,minSpend:20,source:"Groupon"},{id:"c16",label:"15% off bowls",type:"percent",value:15,source:"RetailMeNot"}], distanceMi:3.0 },
  { id:"11", name:"Street Tacos (3-pack)",      vendor:"Taco Fiesta",   cuisine:["Mexican","Tacos"],       basePrice:5.99, estFeesTax:0.90, pickupAvailable:true,  coupons:[{id:"c17",label:"$2 off 3+ tacos",type:"flat",value:2,minSpend:6,source:"Restaurant app"}], distanceMi:2.4 },
  { id:"12", name:"Pad Thai",                   vendor:"Dragon Wok",    cuisine:["Asian","Thai"],          basePrice:9.99, estFeesTax:1.60, pickupAvailable:false, coupons:[{id:"c18",label:"$3 off $13+",type:"flat",value:3,minSpend:13,source:"Coupon.com"},{id:"c19",label:"20% off Mon–Thu",type:"percent",value:20,source:"RetailMeNot"}], distanceMi:4.2 },
  { id:"13", name:"Turkey Avocado Sandwich",    vendor:"Bread & Co.",   cuisine:["Sandwiches","Healthy"],  basePrice:7.49, estFeesTax:1.20, pickupAvailable:true,  coupons:[{id:"c20",label:"$2 off soups & sandwiches",type:"flat",value:2,source:"In-store"}], distanceMi:0.8 },
  { id:"14", name:"Chicken Noodle Soup + Roll", vendor:"Bread & Co.",   cuisine:["Soup","Healthy"],        basePrice:6.29, estFeesTax:0.95, pickupAvailable:true,  coupons:[{id:"c21",label:"10% off bakery items",type:"percent",value:10,source:"Slickdeals"}], distanceMi:0.8 },
  { id:"15", name:"Kung Pao Chicken",           vendor:"Dragon Wok",    cuisine:["Asian","Chinese"],       basePrice:10.49,estFeesTax:1.70, pickupAvailable:false, coupons:[{id:"c22",label:"20% off Mon–Thu",type:"percent",value:20,source:"RetailMeNot"}], distanceMi:4.2 },
];

const ALL_CUISINES = [...new Set(MENU.flatMap(m => m.cuisine))].sort();

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString(undefined, { style:"currency", currency:"USD" });

function applyCoupon(subtotal: number, c: Coupon) {
  if (typeof c.minSpend === "number" && subtotal < c.minSpend) return 0;
  if (c.type === "flat")    return Math.min(c.value, subtotal);
  const raw = (c.value / 100) * subtotal;
  return typeof c.cap === "number" ? Math.min(raw, c.cap) : raw;
}

function bestCoupon(subtotal: number, coupons: Coupon[]) {
  return coupons.reduce<{coupon:Coupon|null;discount:number}>((acc,c) => {
    const d = applyCoupon(subtotal, c);
    return d > acc.discount ? {coupon:c, discount:d} : acc;
  }, {coupon:null, discount:0});
}

const estimateFuel = (rt: number, mpg: number, gas: number) => mpg > 0 ? (rt / mpg) * gas : 0;

// ── tab type ──────────────────────────────────────────────────────────────────

type Tab = "search" | "feed" | "planner";

// ── main component ────────────────────────────────────────────────────────────

export default function OnBudgetPrototype({ onSignOut }: { onSignOut?: () => void }) {
  const [tab,            setTab]            = React.useState<Tab>("search");
  const [budget,         setBudget]         = React.useState(10);
  const [query,          setQuery]          = React.useState("");
  const [selectedCuisines, setSelectedCuisines] = React.useState<string[]>([]);
  const [pickupOnly,     setPickupOnly]     = React.useState(false);
  const [showOver,       setShowOver]       = React.useState(true);
  const [selectedId,     setSelectedId]     = React.useState<string|null>(null);
  const [saved,          setSaved]          = React.useState<string[]>([]);

  // map + travel state
  const [mapCenter,  setMapCenter]  = React.useState<[number,number]>([40.7128,-74.006]);
  const [radiusMi,   setRadiusMi]   = React.useState(5);
  const [locating,   setLocating]   = React.useState(false);
  const [walkMaxMi,  setWalkMaxMi]  = React.useState(1.0);
  const [gasPrice,   setGasPrice]   = React.useState(3.75);
  const [customMPG,  setCustomMPG]  = React.useState<number|undefined>(undefined);
  const inferredMPG = 32;
  const activeMPG   = customMPG && customMPG > 0 ? customMPG : inferredMPG;

  // persist saved to localStorage
  React.useEffect(() => {
    try { const s = localStorage.getItem("onbajet-saved"); if (s) setSaved(JSON.parse(s)); } catch {}
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem("onbajet-saved", JSON.stringify(saved)); } catch {}
  }, [saved]);

  function locate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      p => { setMapCenter([p.coords.latitude, p.coords.longitude]); setLocating(false); },
      ()  => setLocating(false)
    );
  }
  React.useEffect(() => { locate(); }, []);

  // ── derived results ──────────────────────────────────────────────────────────

  const results = React.useMemo(() => {
    const kw = query.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    return MENU
      .filter(item => {
        const text = [item.name, item.vendor, ...item.cuisine].join(" ").toLowerCase();
        const matchKw = kw.length === 0 || kw.some(k => text.includes(k));
        const matchCuisine = selectedCuisines.length === 0 || selectedCuisines.some(c => item.cuisine.includes(c));
        const matchPickup = !pickupOnly || item.pickupAvailable;
        const matchRadius = (item.distanceMi ?? 0) <= radiusMi;
        return matchKw && matchCuisine && matchPickup && matchRadius;
      })
      .map(item => {
        const subtotal = item.basePrice + item.estFeesTax;
        const { coupon, discount } = bestCoupon(subtotal, item.coupons);
        const adjusted = Math.max(0, subtotal - discount);
        return { ...item, subtotal, coupon, discount, adjusted, fitsBudget: adjusted <= budget };
      })
      .filter(r => showOver || r.fitsBudget)
      .sort((a, b) => a.adjusted - b.adjusted);
  }, [query, selectedCuisines, pickupOnly, radiusMi, budget, showOver]);

  const selected = results.find(r => r.id === selectedId) ?? null;

  // ── travel advisor ───────────────────────────────────────────────────────────

  const travelModes = React.useMemo(() => {
    if (!selected) return [];
    const d  = selected.distanceMi ?? 0;
    const rt = d * 2;
    const fuel    = estimateFuel(rt, activeMPG, gasPrice);
    const delFees = selected.pickupAvailable ? Math.max(2.49, selected.estFeesTax * 0.5) : 3.99;
    return [
      { mode:"Walk",         enabled: d <= walkMaxMi,                     total: selected.adjusted,          note:`~${d.toFixed(1)} mi one-way` },
      { mode:"Bike",         enabled: d <= Math.max(2, walkMaxMi * 2.5),  total: selected.adjusted,          note:`~${d.toFixed(1)} mi one-way` },
      { mode:"Pickup (Car)", enabled: true,                                total: selected.adjusted + fuel,   note:`Fuel ${fmt(fuel)} / ${rt.toFixed(1)} mi` },
      { mode:"Delivery",     enabled: true,                                total: selected.adjusted + delFees,note:`Fees ${fmt(delFees)}` },
    ].filter(m => m.enabled).sort((a,b) => a.total - b.total);
  }, [selected, activeMPG, gasPrice, walkMaxMi]);

  // ── tabs ─────────────────────────────────────────────────────────────────────

  const TABS: {id:Tab; label:string}[] = [
    { id:"search",  label:"🔍 Search" },
    { id:"feed",    label:"🔥 Deals Feed" },
    { id:"planner", label:"📅 Meal Planner" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* header */}
      <header className="sticky top-0 z-20 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <span className="text-xl font-bold tracking-tight">OnBaJet</span>
            <span className="ml-2 text-xs text-slate-400">eat smart, spend less</span>
          </div>
          <div className="flex items-center gap-2">
            {saved.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">❤️ {saved.length} saved</span>
            )}
            {onSignOut && <Button variant="secondary" onClick={onSignOut} className="text-xs py-1 px-3">Sign out</Button>}
          </div>
        </div>
        {/* tab bar */}
        <div className="mx-auto max-w-5xl flex border-t px-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.id ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">

        {/* ── DEALS FEED tab ─────────────────────────────────────────────────── */}
        {tab === "feed" && <DealsFeed />}

        {/* ── MEAL PLANNER tab ───────────────────────────────────────────────── */}
        {tab === "planner" && <MealPlanner />}

        {/* ── SEARCH tab ─────────────────────────────────────────────────────── */}
        {tab === "search" && (<>

          {/* filters */}
          <Card className="rounded-2xl shadow-sm"><CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid md:grid-cols-[1fr_220px] gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Search food</label>
                <div className="flex gap-2 mt-1">
                  <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="burger, tacos, pizza, healthy…" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  Max budget <span className="font-semibold">{fmt(budget)}</span>
                </label>
                <Slider value={budget} min={2} max={25} step={0.5} onChange={setBudget} />
              </div>
            </div>

            {/* cuisine pills */}
            <div className="flex flex-wrap gap-2">
              {ALL_CUISINES.map(c => (
                <button key={c} onClick={() => setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  className={`rounded-full px-3 py-1 text-xs transition ${selectedCuisines.includes(c) ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setPickupOnly(v => !v)} className="text-xs py-1 px-3">
                {pickupOnly ? "Pickup only" : "Pickup or delivery"}
              </Button>
              <Button variant="secondary" onClick={() => setShowOver(v => !v)} className="text-xs py-1 px-3">
                {showOver ? "Show all prices" : "Within budget only"}
              </Button>
              {(query || selectedCuisines.length > 0) && (
                <Button variant="secondary" onClick={() => { setQuery(""); setSelectedCuisines([]); }} className="text-xs py-1 px-3">
                  ✕ Clear filters
                </Button>
              )}
            </div>
          </CardContent></Card>

          {/* map */}
          <Card className="rounded-2xl shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Search radius</p>
                <p className="text-xs text-slate-400">{locating ? "Detecting location…" : "Click map to move centre"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{radiusMi.toFixed(1)} mi</span>
                <Button variant="secondary" className="text-xs py-1 px-2" onClick={locate}>📍 Me</Button>
              </div>
            </div>
            <Slider value={radiusMi} min={0.25} max={10} step={0.25} onChange={setRadiusMi} />
            <MapRadiusPicker center={mapCenter} radiusMi={radiusMi} onCenterChange={(lat,lng) => setMapCenter([lat,lng])} />
          </CardContent></Card>

          {/* results */}
          <div>
            <p className="text-sm text-slate-500 mb-3">
              {results.length} result{results.length !== 1 ? "s" : ""} within {radiusMi} mi
              {selectedCuisines.length > 0 && ` · ${selectedCuisines.join(", ")}`}
            </p>
            {results.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-400">No matches — try widening the radius or clearing filters.</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(r => (
                  <Card key={r.id} className={`rounded-2xl h-full ${r.fitsBudget ? "border-emerald-300" : ""}`}>
                    <CardContent className="p-4 flex flex-col h-full space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.vendor} · {r.cuisine.join(", ")} · {r.distanceMi?.toFixed(1)} mi</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge>{r.pickupAvailable ? "Pickup" : "Delivery"}</Badge>
                          <button onClick={() => setSaved(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                            className="text-lg leading-none" title="Save">
                            {saved.includes(r.id) ? "❤️" : "🤍"}
                          </button>
                        </div>
                      </div>

                      <div className="text-sm grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <span>Base</span><span className="text-right">{fmt(r.basePrice)}</span>
                        <span>Fees & tax</span><span className="text-right">{fmt(r.estFeesTax)}</span>
                        {r.coupon && (<>
                          <span className="text-slate-400 text-xs">{r.coupon.label}</span>
                          <span className="text-right text-emerald-600 text-xs">−{fmt(r.discount)}</span>
                        </>)}
                        <span className="font-medium">Total</span>
                        <span className="text-right font-bold">{fmt(r.adjusted)}</span>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className={`text-xs ${r.fitsBudget ? "text-emerald-600" : "text-slate-400"}`}>
                          {r.fitsBudget ? "✓ Within budget" : `+${fmt(r.adjusted - budget)} over`}
                        </span>
                        <Button className="text-xs py-1 px-3 rounded-xl" onClick={() => { setSelectedId(r.id); }}>
                          Optimize →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* selected item detail */}
          {selected && (
            <Card className="rounded-2xl border-emerald-300 shadow-md">
              <CardContent className="p-5 md:p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Deal Optimizer</p>
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.vendor} · subtotal {fmt(selected.subtotal)}</p>
                  </div>
                  <Button variant="secondary" className="rounded-xl text-sm" onClick={() => setSelectedId(null)}>✕ Close</Button>
                </div>

                {/* live coupon engine */}
                <CouponEngine vendor={selected.vendor} subtotal={selected.subtotal} />

                <hr className="border-slate-200" />

                {/* travel optimizer */}
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-3">🚗 Travel cost optimizer · {selected.distanceMi?.toFixed(1)} mi away</p>
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs font-medium mb-1">Walk comfort</p>
                      <Slider value={walkMaxMi} min={0.25} max={3} step={0.25} onChange={setWalkMaxMi} />
                      <p className="text-xs text-slate-400 mt-0.5">Up to {walkMaxMi.toFixed(2)} mi</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Gas (USD/gal)</p>
                      <Input type="number" step="0.01" value={gasPrice} onChange={e => setGasPrice(Number(e.target.value))} />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">MPG override</p>
                      <div className="flex gap-2 items-center">
                        <Input type="number" step="1" value={customMPG ?? ""} placeholder={String(inferredMPG)} onChange={e => setCustomMPG(e.target.value ? Number(e.target.value) : undefined)} />
                        <span className="text-xs text-slate-400 shrink-0">auto: {inferredMPG}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {travelModes.map((m, i) => (
                      <div key={m.mode} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${i === 0 ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                        <div>
                          <p className="font-medium text-sm">{i === 0 ? "👑 Best: " : ""}{m.mode}</p>
                          <p className="text-xs text-slate-500">{m.note}</p>
                        </div>
                        <p className="font-bold text-sm">{fmt(m.total)}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400 mt-3">Prototype with mock data. Production: EPA MPG, live gas prices, routed distances via Maps API.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* saved items */}
          {saved.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">❤️ Saved items</p>
              <div className="flex flex-wrap gap-2">
                {MENU.filter(m => saved.includes(m.id)).map(m => (
                  <span key={m.id} className="text-xs bg-slate-100 rounded-full px-3 py-1">
                    {m.name} · {fmt(m.basePrice + m.estFeesTax)}
                    <button className="ml-1 text-slate-400 hover:text-red-500" onClick={() => setSaved(prev => prev.filter(x => x !== m.id))}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>)}
      </main>

      <footer className="border-t bg-white py-5 text-center text-xs text-slate-400 mt-10">
        © {new Date().getFullYear()} OnBaJet · eat smart, spend less
      </footer>
    </div>
  );
}
