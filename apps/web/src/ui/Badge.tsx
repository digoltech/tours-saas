import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { cn } from "../lib/utils";

export function Badge({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cn("badge", className)} style={style}>
      {children}
    </span>
  );
}
