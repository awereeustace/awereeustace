import * as React from "react";
import { cn } from "@/lib/utils";

export default function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700",
        className
      )}
      {...props}
    />
  );
}
