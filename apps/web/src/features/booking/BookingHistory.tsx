"use client";

import { cn } from "../../lib/utils";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import {
  BookingRecord,
  getBookings,
  requestBookingCancellation,
} from "../auth/services/api-client";

export function BookingHistory({ compact = false }: { compact?: boolean }) {
  const [pnr, setPnr] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getBookings({
        page: String(page),
        limit: compact ? "5" : "20",
        pnr,
        tripCode,
        date,
      });
      setRows(result.data);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load bookings",
      );
    } finally {
      setLoading(false);
    }
  }, [compact, date, page, pnr, tripCode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openTicket(row: BookingRecord) {
    window.location.assign(`/bookings?pnr=${encodeURIComponent(row.pnr)}`);
  }
  async function requestCancellation(row: BookingRecord) {
    const input = window.prompt(
      `Reason for cancelling booking ${row.pnr} (optional):`,
    );
    if (input === null) return;
    const reason = input;
    try {
      await requestBookingCancellation(row.id, reason);
      setNotice(`Cancellation request for ${row.pnr} sent for agency review.`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to request cancellation",
      );
    }
  }

  return (
    <section
      aria-labelledby={
        compact ? "recent-bookings-title" : "booking-history-title"
      }
    >
      <div className={cn("card-heading")}>
        <div>
          <p className={cn("eyebrow")}>Operations</p>
          <h2 id={compact ? "recent-bookings-title" : "booking-history-title"}>
            {compact ? "Recent bookings" : "Booking history"}
          </h2>
        </div>
      </div>
      {!compact && (
        <Card className={cn("management-form")}>
          <div className={cn("form-grid")}>
            <label>
              PNR
              <input
                value={pnr}
                onChange={(event) => {
                  setPnr(event.target.value);
                  setPage(1);
                }}
                placeholder="Search PNR"
              />
            </label>
            <label>
              Trip code
              <input
                value={tripCode}
                onChange={(event) => {
                  setTripCode(event.target.value);
                  setPage(1);
                }}
                placeholder="Search trip"
              />
            </label>
            <label>
              Travel date
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <Search size={16} /> Apply filters
          </Button>
        </Card>
      )}
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className={cn("state-message")} role="status">
          {notice}
        </div>
      )}
      <Card className={cn("management-card")}>
        {loading ? (
          <div className={cn("state-message")} role="status">
            Loading bookings…
          </div>
        ) : rows.length === 0 ? (
          <div className={cn("state-message")}>
            <strong>No bookings found</strong>
            <span>Bookings you create will appear here.</span>
          </div>
        ) : (
          <div className={cn("table-wrapper")}>
            <table>
              <caption className={cn("visually-hidden")}>
                {compact ? "Recent bookings" : "Booking history"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">PNR</th>
                  <th scope="col">Trip</th>
                  <th scope="col">Route</th>
                  <th scope="col">Travel date</th>
                  <th scope="col">Passengers</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.pnr}</strong>
                    </td>
                    <td>{row.trip.tripCode}</td>
                    <td>
                      {row.trip.route.source} → {row.trip.route.destination}
                    </td>
                    <td>
                      {new Date(row.trip.travelDate).toLocaleDateString()}
                    </td>
                    <td>{row.passengers.length}</td>
                    <td>
                      {row.currency} {Number(row.totalAmount).toFixed(2)}
                    </td>
                    <td>
                      <Badge>{row.status}</Badge>
                    </td>
                    <td>
                      <button
                        className={cn("text-link")}
                        type="button"
                        aria-label={`Open ticket for PNR ${row.pnr}`}
                        onClick={() => void openTicket(row)}
                      >
                        View <ArrowRight size={14} />
                      </button>
                      {!compact && row.status === "CONFIRMED" && (
                        <button
                          className={cn("text-link", "ml-3")}
                          type="button"
                          disabled={
                            row.cancellationRequest?.status === "PENDING"
                          }
                          onClick={() => void requestCancellation(row)}
                        >
                          {row.cancellationRequest?.status === "PENDING"
                            ? "Cancellation pending"
                            : "Request cancellation"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!compact && rows.length > 0 && (
          <div className={cn("management-toolbar")}>
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={15} /> Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= pages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
