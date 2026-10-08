"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Ticket } from "lucide-react";
import { getBookingByPnr } from "../auth/services/api-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { Button } from "../../ui/Button";
import "../../styles/ticket.css";
export function TicketLookup() {
  const t = useTranslations();
  const router = useRouter();
  const id = useId();
  const [pnr, setPnr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = pnr.trim().replace(/\s/g, "").toUpperCase();
    setPnr(value);
    setError("");
    setBusy(true);
    try {
      const booking = await getBookingByPnr(value);
      router.push(`/dashboard/bookings/${encodeURIComponent(booking.pnr)}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to find this PNR",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ticket-lookup" aria-labelledby={`${id}-title`}>
      <div className="ticket-lookup-heading">
        <span className="ticket-lookup-icon">
          <Ticket size={25} />
        </span>
        <div>
          <h2 id={`${id}-title`}>{t("Find a ticket")}</h2>
          <p>
            {t(
              "Enter a booking reference to view its journey, passengers and current status.",
            )}
          </p>
        </div>
      </div>
      <form onSubmit={search}>
        <label htmlFor={id}>{t("Booking reference / PNR")}</label>
        <div className="ticket-lookup-controls">
          <input
            id={id}
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            required
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("Enter PNR")}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            aria-invalid={!!error}
          />
          <Button type="submit" loading={busy} disabled={!pnr.trim() || busy}>
            <Search size={17} />
            {t("Find ticket")}
          </Button>
        </div>
        <p id={`${id}-help`} className="ticket-lookup-help">
          {t(
            "You can find the PNR on your booking confirmation or ticket email.",
          )}
        </p>
        {error && (
          <p
            id={`${id}-error`}
            className="state-message state-error"
            role="alert"
          >
            {t(error)}
          </p>
        )}
      </form>
    </section>
  );
}
