"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Download, Printer, X, FileText, Ticket, Receipt } from "lucide-react";
import {
  createTicketDocument,
  renderTicketMarkup,
  ticketFormats,
  type TicketFormat,
} from "@a-one-tours/shared/ticket";
import type { BookingRecord } from "../auth/services/api-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import { Button } from "../../ui/Button";
import {
  downloadTicketHtml,
  downloadTicketPdf,
  printTicket,
} from "./ticket-export";
import "../../styles/ticket.css";
export function TicketExportMenu({ booking }: { booking: BookingRecord }) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<TicketFormat>("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ticket = createTicketDocument(booking);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  async function exportTicket(action: "print" | "pdf" | "html") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "print") await printTicket(ticket, format, locale, t);
      else if (action === "pdf")
        await downloadTicketPdf(ticket, format, locale, t);
      else downloadTicketHtml(ticket, format, locale, t);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to export ticket",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Printer size={16} />
        {t("Print / download")}
      </Button>
      {open && (
        <dialog
          ref={dialog}
          className="ticket-export-modal"
          aria-labelledby={id}
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setOpen(false);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <header className="ticket-export-heading">
            <div>
              <p>
                {t("TICKET EXPORT")} · {booking.pnr}
              </p>
              <h2 id={id}>{t("Print or save your ticket")}</h2>
              <span>
                {t("Choose a layout, preview it, then print or download.")}
              </span>
            </div>
            <button
              type="button"
              className="ticket-export-close"
              aria-label={t("Close print options")}
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          <div className="ticket-export-body">
            <fieldset className="ticket-formats">
              <legend>{t("Ticket format")}</legend>
              {(["standard", "ticket", "thermal"] as const).map((value) => {
                const Icon =
                  value === "standard"
                    ? FileText
                    : value === "ticket"
                      ? Ticket
                      : Receipt;
                const spec = ticketFormats[value];
                return (
                  <label
                    key={value}
                    className={`ticket-format ${format === value ? "ticket-format-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`${id}-format`}
                      value={value}
                      checked={format === value}
                      disabled={busy}
                      onChange={() => setFormat(value)}
                    />
                    <Icon size={23} />
                    <strong>{t(spec.label)}</strong>
                    <small>
                      {value === "thermal"
                        ? "80 mm"
                        : `${spec.widthMm} × ${spec.heightMm} mm`}
                    </small>
                    <span>{t(spec.description)}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className="ticket-preview-label">
              {t("Preview")}
              <span>{t("Journey times are shown in IST.")}</span>
            </div>
            <div className="ticket-preview-scroll">
              <div
                className={`ticket-preview ticket-preview-${format}`}
                dangerouslySetInnerHTML={{
                  __html: renderTicketMarkup(
                    ticket,
                    format,
                    locale,
                    t,
                    format === "standard",
                  ),
                }}
              />
            </div>
            {error && (
              <p className="state-message state-error" role="alert">
                {t(error)}
              </p>
            )}
          </div>
          <footer className="ticket-export-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void exportTicket("html")}
            >
              <FileText size={16} />
              {t("Download HTML")}
            </Button>
            <div>
              <Button
                variant="secondary"
                loading={busy}
                disabled={busy}
                onClick={() => void exportTicket("pdf")}
              >
                <Download size={16} />
                {t("Download PDF")}
              </Button>
              <Button
                disabled={busy}
                onClick={() => void exportTicket("print")}
              >
                <Printer size={16} />
                {t("Print ticket")}
              </Button>
            </div>
          </footer>
        </dialog>
      )}
    </>
  );
}
