import * as React from "react";
import { cn } from "@/lib/utils";

type SliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
};

export default function Slider({ value, min, max, step, onChange, className }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("w-full cursor-pointer accent-blue-600", className)}
    />
  );
}
