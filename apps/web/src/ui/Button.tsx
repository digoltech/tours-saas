"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { useTranslations } from "../i18n/LocaleProvider";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
} & VariantProps<typeof buttonVariants>;

const buttonVariants = cva("button", {
  variants: {
    variant: {
      primary: "button-primary",
      secondary: "button-secondary",
      ghost: "button-ghost",
      destructive: "button-destructive",
    },
  },
  defaultVariants: { variant: "primary" },
});

export function Button({
  children,
  className = "",
  variant,
  loading = false,
  loadingLabel,
  ...props
}: ButtonProps) {
  const t = useTranslations();
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      type="button"
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
    >
      {loading ? <><span className="button-spinner" aria-hidden="true" />{loadingLabel ? t(loadingLabel) : children}</> : children}
    </button>
  );
}
