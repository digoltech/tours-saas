"use client";

import type { ReactNode } from "react";
import { useTranslations } from "./LocaleProvider";

export function LocalizedValue({ value }: { value: ReactNode }) {
  const t = useTranslations();
  return typeof value === "string" ? t(value) : value;
}
