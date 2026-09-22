import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field-label" htmlFor={id}>
      {label}
      <input id={id} {...props} />
    </label>
  );
}
