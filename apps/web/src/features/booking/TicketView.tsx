"use client";
import { CheckCircle2 } from "lucide-react";
import { createTicketDocument, renderTicketMarkup } from "@a-one-tours/shared/ticket";
import type { BookingRecord } from "../auth/services/api-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import "../../styles/ticket.css";
export function TicketView({
  booking,
  confirmed = false,
}: {
  booking: BookingRecord;
  confirmed?: boolean;
}) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  return (
    <div className="ticket-view">
      {confirmed && booking.status === "CONFIRMED" && (
        <div className="ticket-success" role="status">
          <CheckCircle2 size={28} />
          <div>
            <strong>{t("Booking confirmed")}</strong>
            <p>
              {t(
                "Your seats are reserved. Save or print the ticket for boarding.",
              )}
            </p>
          </div>
        </div>
      )}
      <div
        className="ticket-document"
        dangerouslySetInnerHTML={{
          __html: renderTicketMarkup(
            createTicketDocument(booking),
            "standard",
            locale,
            t,
          ),
        }}
      />
    </div>
  );
}
