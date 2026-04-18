import * as React from "react";
export default function Slider({ value, min, max, step, onChange }:{ value:number; min:number; max:number; step?:number; onChange:(v:number)=>void; }) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return <input type="range" min={min} max={max} step={step ?? 1} value={v} onChange={e => { const n = Number(e.target.value); setV(n); onChange(n); }} className="w-full" />;
}
