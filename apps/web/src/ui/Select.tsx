import { cn } from "../lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({
  label,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn("field-label")} htmlFor={id}>
      {label}
      <select id={id} {...props}>
        {children}
      </select>
    </label>
  );
}
