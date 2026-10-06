"use client";

import { cn } from "../../../lib/utils";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "../../../i18n/LocaleProvider";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export function PasswordInput({ label, id, className, ...props }: PasswordInputProps) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("field-label password-field")}>
      <label htmlFor={id}>{t(label)}</label>
      <div className={cn("password-input-wrap")}>
        <input id={id} className={cn(className)} type={visible ? "text" : "password"} {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} />
        <button type="button" className={cn("password-visibility")} onClick={() => setVisible((value) => !value)} aria-label={t(visible ? "Hide password" : "Show password")} aria-pressed={visible}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
