import { cn } from "../lib/utils";
import type { ReactNode } from "react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className={cn("state-message")} role="status">
      {label}...
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("state-message")}>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
export function ErrorState({
  message = "Something went wrong.",
}: {
  message?: string;
}) {
  return (
    <div className={cn("state-message state-error")} role="alert">
      {message}
    </div>
  );
}
