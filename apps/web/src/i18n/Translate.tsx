"use client";

import { useTranslations } from "./LocaleProvider";

export function Translate({ text }: { text: string }) {
  const t = useTranslations();
  return t(text);
}
