import * as React from "react";
export function Card({ className = "", ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`rounded-2xl border bg-white ${className}`} {...p} />; }
export function CardContent({ className = "", ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={className} {...p} />; }
