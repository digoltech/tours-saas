"use client";

import { cn } from "../lib/utils";
import type { InputHTMLAttributes } from "react";
import { useTranslations } from "../i18n/LocaleProvider";

export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const t = useTranslations();
  return (
    <label className={cn("field-label")} htmlFor={id}>
      {t(label)}
      <input id={id} {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} aria-label={props["aria-label"] ? t(props["aria-label"]) : undefined} />
    </label>
  );
}
