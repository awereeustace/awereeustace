import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("rounded-lg border bg-white p-4 shadow-sm", className)}
    {...props}
  />
);
