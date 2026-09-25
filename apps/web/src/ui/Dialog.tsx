import { cn } from "../lib/utils";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={cn("dialog-backdrop")} role="presentation" onClick={onClose}>
      <dialog
        className={cn("dialog")}
        open
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        {children}
        <button
          className={cn("button button-secondary")}
          type="button"
          onClick={onClose}
        >
          <X size={15} /> Close
        </button>
      </dialog>
    </div>
  );
}
