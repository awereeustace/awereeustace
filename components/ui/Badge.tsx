import * as React from "react";
export default function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border bg-slate-100 ${className}`}>{children}</span>;
}
