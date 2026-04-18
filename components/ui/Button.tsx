import * as React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };
export default function Button({ className = "", variant = "primary", ...p }: Props) {
  const base = "px-3 py-2 text-sm rounded-xl transition";
  const styles = variant === "secondary" ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800";
  return <button className={`${base} ${styles} ${className}`} {...p} />;
}
