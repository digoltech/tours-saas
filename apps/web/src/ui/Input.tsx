import { cn } from "../lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("field-label")} htmlFor={id}>
      {label}
      <input id={id} {...props} />
    </label>
  );
}
