"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Ticket } from "lucide-react";
import Link from "next/link";
import { getBookings, type BookingRecord } from "../auth/services/api-client";
import { useFormattingLocale } from "../../i18n/format-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { Button } from "../../ui/Button";
import "../../styles/ticket.css";
import "../../styles/booking-flow.css";
export function TicketLookup() {
  const t = useTranslations();
  const locale = useFormattingLocale();
  const router = useRouter();
  const id = useId();
  const [pnr, setPnr] = useState("");
  const [matches, setMatches] = useState<BookingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = pnr.trim();
    setPnr(value);
    setError("");
    setBusy(true);
    setMatches([]);
    try {
      const result = await getBookings({ search: value, limit: "20" });
      setTotal(result.meta.total);
      if (result.data.length === 1)
        router.push(
          `/dashboard/bookings/${encodeURIComponent(result.data[0].pnr)}`,
        );
      else if (!result.data.length)
        setError("No tickets found for this search.");
      else setMatches(result.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to find tickets",
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
          <p>{t("Search with a PNR, passenger email or phone number.")}</p>
        </div>
      </div>
      <form onSubmit={search}>
        <label htmlFor={id}>{t("PNR, email or phone number")}</label>
        <div className="ticket-lookup-controls">
          <input
            id={id}
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            required
            maxLength={200}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("Enter PNR, email or phone number")}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            aria-invalid={!!error}
          />
          <Button type="submit" loading={busy} disabled={!pnr.trim() || busy}>
            <Search size={17} />
            {t("Find ticket")}
          </Button>
        </div>
        <p id={`${id}-help`} className="ticket-lookup-help">
          {t("Enter any of these details to find matching passenger tickets.")}
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
      {matches.length > 0 && (
        <div className="ticket-search-results" aria-live="polite">
          <p>
            {total} {t("matching tickets")}
          </p>
          {matches.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/bookings/${encodeURIComponent(booking.pnr)}`}
              className="record-related-link"
            >
              <span>
                <strong>{booking.pnr}</strong>
                <small>
                  {booking.trip.route.source} → {booking.trip.route.destination}{" "}
                  · {new Date(booking.trip.travelDate).toLocaleDateString(locale, { timeZone: "UTC" })} ·{" "}
                  {booking.passengers
                    .map((passenger) => passenger.firstName)
                    .join(", ")}
                </small>
              </span>
              <span>{t(booking.status)} →</span>
            </Link>
          ))}
          {total > matches.length && (
            <Link
              href={`/dashboard/bookings?search=${encodeURIComponent(pnr.trim())}`}
            >
              {t("View all results")}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
