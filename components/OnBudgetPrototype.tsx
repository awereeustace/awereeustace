import * as React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Slider from "@/components/ui/Slider";
import Badge from "@/components/ui/Badge";

type Coupon = { id: string; label: string; type: "flat" | "percent"; value: number; minSpend?: number; cap?: number; source: string };
type MenuItem = { id: string; name: string; vendor: string; cuisine: string[]; basePrice: number; estFeesTax: number; pickupAvailable: boolean; coupons: Coupon[]; url?: string; distanceMi?: number; lat?: number; lng?: number; };

const MOCK_ITEMS: MenuItem[] = [
  { id: "1", name: "Classic Cheeseburger", vendor: "Patty Palace", cuisine: ["American","Burgers"], basePrice: 6.99, estFeesTax: 1.2, pickupAvailable: true, coupons: [{ id: "c1", label: "$3 off $10+", type: "flat", value: 3, minSpend: 10, source: "Restaurant app" }, { id: "c2", label: "15% off up to $4", type: "percent", value: 15, cap: 4, source: "Promo" }], url: "#", distanceMi: 1.2 },
  { id: "2", name: "Grilled Chicken Club Sandwich", vendor: "Toasty Town", cuisine: ["American","Sandwiches"], basePrice: 4.75, estFeesTax: 0.75, pickupAvailable: true, coupons: [{ id: "c3", label: "$1 off any sandwich", type: "flat", value: 1, source: "In-store" }], url: "#", distanceMi: 0.6 }
];

const formatUSD = (n:number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function applyCoupon(subtotal:number, c:Coupon){ if(typeof c.minSpend==="number"&&subtotal<c.minSpend) return {discount:0,applied:false}; if(c.type==="flat"){const d=Math.min(c.value, subtotal); return {discount:d,applied:d>0};} const raw=(c.value/100)*subtotal; const discount=typeof c.cap==="number"?Math.min(raw,c.cap):raw; return {discount, applied: discount>0}; }
function bestCoupon(subtotal:number, coupons:Coupon[]){ return coupons.reduce((acc,c)=>{ const {discount}=applyCoupon(subtotal,c); return discount>acc.discount?{coupon:c,discount}:acc; }, {coupon:null as Coupon|null, discount:0}); }
const estimateFuelCost=(rt:number, mpg:number, gas:number)=> (mpg>0? (rt/mpg)*gas : 0);

export default function OnBudgetPrototype({ onSignOut }:{ onSignOut?:()=>void }){
  const [budget,setBudget]=React.useState(5);
  const [query,setQuery]=React.useState("american, burgers, sandwiches");
  const [includeCoupons,setIncludeCoupons]=React.useState(true);
  const [pickupOnly,setPickupOnly]=React.useState(false);
  const [showAboveBudget,setShowAboveBudget]=React.useState(true);
  const [selectedId,setSelectedId]=React.useState<string|null>(null);

  const [walkMaxMi,setWalkMaxMi]=React.useState(1.0);
  const [gasPrice,setGasPrice]=React.useState(3.75);
  const [customMPG,setCustomMPG]=React.useState<number|undefined>(undefined);
  const inferredMPG=32; const activeMPG=customMPG&&customMPG>0?customMPG:inferredMPG;

  const cuisines=React.useMemo(()=>query.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean),[query]);
  const results=React.useMemo(()=>{
    const matches=(i:MenuItem)=>cuisines.length===0||cuisines.some(k=>i.cuisine.join(" ").toLowerCase().includes(k));
    return MOCK_ITEMS.filter(matches).filter(i=>pickupOnly?i.pickupAvailable:true).map(i=>{
      const subtotal=i.basePrice+i.estFeesTax;
      const {coupon,discount}=includeCoupons?bestCoupon(subtotal,i.coupons):{coupon:null,discount:0};
      const adjusted=Math.max(0, subtotal-discount);
      return {...i, subtotal, coupon, discount, adjusted, fitsBudget: adjusted<=budget};
    }).filter(r=>showAboveBudget?true:r.fitsBudget).sort((a,b)=>a.adjusted-b.adjusted);
  },[budget,cuisines,includeCoupons,pickupOnly,showAboveBudget]);

  const selected=results.find(r=>r.id===selectedId)||null;

  return (<div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-white to-slate-50">
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-3xl md:text-4xl font-semibold tracking-tight">OnBaJet</h1><p className="text-slate-600">Find eats that fit your price—then squeeze the total with smart deals.</p></div>
        {onSignOut && <Button variant="secondary" onClick={onSignOut} className="rounded-2xl">Sign out</Button>}
      </div>
      <Card className="rounded-2xl shadow-sm"><CardContent className="p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-[1fr_220px] gap-4">
          <div><label className="text-sm font-medium text-slate-700">Cuisine keywords</label>
            <div className="flex gap-2 mt-2">
              <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="e.g., american, burgers, sandwiches" />
              <Button className="rounded-xl">Search</Button>
            </div></div>
          <div><label className="text-sm font-medium text-slate-700 flex items-center justify-between">Max budget <span className="font-semibold">${budget.toFixed(2)}</span></label>
            <div className="px-2"><Slider value={budget} min={2} max={15} step={0.5} onChange={setBudget} /></div></div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="secondary" onClick={()=>setIncludeCoupons(v=>!v)} className="rounded-xl">{includeCoupons?"Coupons: On":"Coupons: Off"}</Button>
          <Button variant="secondary" onClick={()=>setPickupOnly(v=>!v)} className="rounded-xl">{pickupOnly?"Pickup only":"Pickup or delivery"}</Button>
          <Button variant="secondary" onClick={()=>setShowAboveBudget(v=>!v)} className="rounded-xl">{showAboveBudget?"Show all (incl above budget)":"Within budget only"}</Button>
        </div>
      </CardContent></Card>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map(r=>(<Card key={r.id} className={`rounded-2xl shadow-sm h-full ${r.fitsBudget?"border-emerald-300":""}`}>
          <CardContent className="p-5 space-y-3 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-semibold">{r.name}</div><div className="text-sm text-slate-600">{r.vendor} • {r.cuisine.join(", ")} • {r.distanceMi?.toFixed(1)} mi</div></div>
              <Badge>{r.pickupAvailable?"Pickup":"Delivery"}</Badge>
            </div>
            <div className="text-sm grid grid-cols-2 gap-1">
              <div>Base</div><div className="text-right">{formatUSD(r.basePrice)}</div>
              <div>Fees &amp; tax</div><div className="text-right">{formatUSD(r.estFeesTax)}</div>
              {r.coupon && (<><div className="text-slate-500">Coupon ({r.coupon.label})</div><div className="text-right text-rose-600">- {formatUSD(r.discount)}</div></>)}
              <div className="font-medium">Adjusted total</div><div className="text-right font-semibold">{formatUSD(r.adjusted)}</div>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className={`text-xs ${r.fitsBudget?"text-emerald-700":"text-slate-500"}`}>{r.fitsBudget?"Within budget":`Over by ${formatUSD(Math.max(0, r.adjusted-budget))}`}</div>
              <div className="flex items-center gap-3">
                <a href={r.url ?? "#"} className="text-sm underline underline-offset-4">View</a>
                <Button className="rounded-xl" onClick={()=>setSelectedId(r.id)}>Choose</Button>
              </div>
            </div>
          </CardContent></Card>))}
      </div>

      {selected && (<Card className="rounded-2xl shadow-sm border-emerald-300 mt-8"><CardContent className="p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div><div className="text-sm uppercase tracking-wide text-slate-500">Travel + Cost Optimizer</div>
            <h2 className="text-xl font-semibold">Best way to get your <span className="underline">{selected.name}</span></h2>
            <div className="text-slate-600 text-sm">Distance ~ {selected.distanceMi?.toFixed(1)} mi one-way</div></div>
          <Button variant="secondary" className="rounded-xl" onClick={()=>setSelectedId(null)}>Close</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2"><div className="text-sm font-medium">Walk comfort range</div>
            <div className="px-1"><Slider value={walkMaxMi} min={0.25} max={3} step={0.25} onChange={setWalkMaxMi} /></div>
            <div className="text-xs text-slate-600">Current: ~{walkMaxMi.toFixed(2)} mi one-way</div></div>
          <div className="space-y-2"><div className="text-sm font-medium">Gas price</div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <Input type="number" step="0.01" value={gasPrice} onChange={(e)=>setGasPrice(Number(e.target.value))} />
              <div className="text-sm text-slate-600">USD/gal</div></div></div>
          <div className="space-y-2"><div className="text-sm font-medium">MPG (override optional)</div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <Input type="number" step="0.1" value={customMPG ?? ""} onChange={(e)=>setCustomMPG(e.target.value?Number(e.target.value):undefined)} placeholder="e.g., 32" />
              <Badge>Auto: {inferredMPG}</Badge></div></div>
        </div>
        <div className="grid md:grid-cols-[1fr_320px] gap-4">
          <Card className="rounded-2xl shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">Recommendation</div>
            <div className="space-y-2">{(() => {
              const d = selected.distanceMi ?? 0;
              const rt = d*2;
              const pickupFuel=estimateFuelCost(rt, activeMPG||0, gasPrice);
              const deliveryFees=selected.pickupAvailable?Math.max(2.49, selected.estFeesTax*0.5):3.99;
              const deliveryTotal=selected.adjusted+deliveryFees;
              const pickupTotal=selected.adjusted+(selected.pickupAvailable?pickupFuel:0);
              const canWalk=d<=walkMaxMi; const canBike=d<=Math.max(2, walkMaxMi*2.5);
              const modes=[
                {mode:"Walk",enabled:canWalk,total:selected.adjusted,note:`~${d.toFixed(1)} mi one-way`},
                {mode:"Bike",enabled:canBike,total:selected.adjusted,note:`~${d.toFixed(1)} mi one-way`},
                {mode:"Pickup (Car)",enabled:true,total:pickupTotal,note:`Fuel ${formatUSD(pickupFuel)} for ${rt.toFixed(1)} mi`},
                {mode:"Delivery",enabled:true,total:deliveryTotal,note:`Fees ${formatUSD(deliveryFees)}`}
              ].filter(m=>m.enabled).sort((a,b)=>a.total-b.total);
              return modes.map((m,idx)=>(
                <div key={m.mode} className={`flex items-center justify-between border rounded-xl px-3 py-2 ${idx===0?"border-emerald-400 bg-emerald-50":"border-slate-200"}`}>
                  <div><div className="font-medium">{idx===0?"Best: ":""}{m.mode}</div><div className="text-xs text-slate-600">{m.note}</div></div>
                  <div className="text-sm font-semibold">{formatUSD(m.total)}</div>
                </div>
              ));
            })()}</div>
          </CardContent></Card>
          <Card className="rounded-2xl shadow-sm"><CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium">Cost breakdown</div>
            <div className="text-sm grid grid-cols-2 gap-1">
              <div>Item adjusted</div><div className="text-right">{formatUSD(selected.adjusted)}</div>
              <div>Pickup fuel est</div><div className="text-right">{formatUSD(estimateFuelCost((selected.distanceMi??0)*2, activeMPG||0, gasPrice))}</div>
              <div>Delivery fees est</div><div className="text-right">{formatUSD(selected.pickupAvailable?Math.max(2.49, selected.estFeesTax*0.5):3.99)}</div>
            </div>
            <div className="text-sm grid grid-cols-2 gap-1 pt-2 border-t">
              <div className="font-medium">Pickup total</div><div className="text-right font-semibold">{formatUSD(selected.adjusted+(selected.pickupAvailable?estimateFuelCost((selected.distanceMi??0)*2, activeMPG||0, gasPrice):0))}</div>
              <div className="font-medium">Delivery total</div><div className="text-right font-semibold">{formatUSD(selected.adjusted+(selected.pickupAvailable?Math.max(2.49, selected.estFeesTax*0.5):3.99))}</div>
            </div>
          </CardContent></Card>
        </div>
        <div className="text-xs text-slate-500">Prototype with mocked data. In production: EPA MPG, local gas prices, routed distance via Maps APIs.</div>
      </CardContent></Card>)}
    </div>
  </div>);
}
