"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";
import { useTranslations } from "../i18n/LocaleProvider";
import "../styles/confirmation-modal.css";

export type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};
type ConfirmAction = (options: ConfirmationOptions) => Promise<boolean>;
const ConfirmationContext = createContext<ConfirmAction | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [pending, setPending] = useState<ConfirmationOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    dialog.current?.close();
    setPending(null);
    resolve?.(confirmed);
  }, []);
  const confirmAction = useCallback<ConfirmAction>((options) => {
    if (resolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(options);
    });
  }, []);
  useEffect(() => {
    if (!pending) return;
    const element = dialog.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    cancelButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [pending]);
  // Navigation also dismisses pending confirmations so an old page cannot mutate a record.
  useEffect(() => () => finish(false), [pathname, finish]);
  return (
    <ConfirmationContext.Provider value={confirmAction}>
      {children}
      {pending && (
        <dialog
          ref={dialog}
          className="confirmation-modal"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onCancel={(event) => {
            event.preventDefault();
            finish(false);
          }}
          onClose={() => {
            if (resolver.current) finish(false);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) finish(false);
          }}
        >
          <div className="confirmation-modal-content">
            <button
              type="button"
              className="confirmation-modal-close"
              aria-label={t("Close confirmation")}
              onClick={() => finish(false)}
            >
              <X size={19} />
            </button>
            <span className="confirmation-modal-icon">
              <AlertTriangle size={26} aria-hidden="true" />
            </span>
            <h2 id={titleId}>{t(pending.title)}</h2>
            <p id={descriptionId}>{t(pending.description)}</p>
            <div className="confirmation-modal-actions">
              <button
                ref={cancelButton}
                type="button"
                className="button button-secondary"
                onClick={() => finish(false)}
              >
                {t("Cancel")}
              </button>
              <Button
                variant={
                  pending.destructive === false ? "primary" : "destructive"
                }
                onClick={() => finish(true)}
              >
                {t(pending.confirmLabel ?? "Confirm")}
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm)
    throw new Error("useConfirmation must be used inside ConfirmationProvider");
  return confirm;
}

export async function confirmStatusChange(
  confirm: ConfirmAction,
  name: string,
  previous: string | undefined,
  next: string | undefined,
) {
  if (!previous || !next || previous === next) return true;
  const action =
    next === "INACTIVE"
      ? "Deactivate"
      : next === "ACTIVE"
        ? "Reactivate"
        : next === "CANCELLED"
          ? "Cancel trip"
          : "Change status";
  return confirm({
    title: `${action}?`,
    description: `${name}: ${previous.replaceAll("_", " ")} → ${next.replaceAll("_", " ")}. Confirm to save this status change.`,
    confirmLabel: action,
    destructive: next !== "ACTIVE",
  });
}
