"use client";

import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { cn } from "../lib/utils";
import { useTranslations } from "../i18n/LocaleProvider";

export function Badge({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useTranslations();
  return (
    <span className={cn("badge", className)} style={style}>
      {typeof children === "string" ? t(children) : children}
    </span>
  );
}
