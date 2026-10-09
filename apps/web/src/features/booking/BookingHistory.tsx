"use client";
import { DataTable } from "../../ui/DataTable";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { formatDecimal, getFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import "../../styles/booking.css";

import { cn } from "../../lib/utils";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../auth/components/AuthProvider";
import { EditRecordLink, ViewRecordLink } from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { BookingRecord, getBookings } from "../auth/services/api-client";

export function BookingHistory({
  compact = false,
  initialSearch = "",
}: {
  compact?: boolean;
  initialSearch?: string;
}) {
  const { user } = useAuth();
  const [pnr, setPnr] = useState(initialSearch);
  const [tripCode, setTripCode] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getBookings({
        page: String(page),
        limit: compact ? "5" : "20",
        search: pnr,
        tripCode,
        date,
      });
      setRows(result.data);
      setPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load bookings"),
      );
    } finally {
      setLoading(false);
    }
  }, [compact, date, page, pnr, tripCode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section
      aria-labelledby={
        compact ? "recent-bookings-title" : "booking-history-title"
      }
    >
      <div className={cn("card-heading")}>
        <div>
          <p className={cn("eyebrow")}>
            <Translate text={"Operations"} />
          </p>
          <h2 id={compact ? "recent-bookings-title" : "booking-history-title"}>
            <LocalizedValue
              value={compact ? "Recent bookings" : "Booking history"}
            />
          </h2>
        </div>
      </div>
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      <DataTable
        title={compact ? "Recent bookings" : "Booking history"}
        data={rows}
        rowKey={(row) => row.id}
        loading={loading}
        toolbarActions={
          !compact &&
          (user?.role === "SUPER_ADMIN" ||
            user?.permissions.includes("booking:create")) && (
            <Link
              prefetch={false}
              className="button button-primary"
              href="/dashboard/bookings/new"
            >
              Add booking
            </Link>
          )
        }
        searchValue={pnr}
        onSearchChange={setPnr}
        searchPlaceholder="Search PNR, email or phone number"
        filters={
          compact
            ? []
            : [
                {
                  id: "trip",
                  label: "Trip code",
                  value: tripCode,
                  onChange: setTripCode,
                },
                {
                  id: "date",
                  label: "Travel date",
                  type: "date",
                  value: date,
                  onChange: setDate,
                },
              ]
        }
        pagination={{
          page,
          pageSize: compact ? 5 : 20,
          total,
          totalPages: pages,
          onPageChange: setPage,
        }}
        columns={[
          { id: "0", header: "PNR" },
          { id: "1", header: "Trip" },
          { id: "2", header: "Route" },
          { id: "3", header: "Travel date" },
          { id: "4", header: "Passengers" },
          { id: "5", header: "Total" },
          { id: "6", header: "Status" },
          { id: "7", header: "Actions" },
        ]}
        renderRow={(row) => (
          <tr key={row.id}>
            <td>
              <Link
                prefetch={false}
                className="text-link"
                href={`/dashboard/bookings/${encodeURIComponent(row.pnr)}`}
              >
                {row.pnr}
              </Link>
            </td>
            <td>{row.trip.tripCode}</td>
            <td>
              {row.trip.route.source} → {row.trip.route.destination}
            </td>
            <td>
              {new Date(row.trip.travelDate).toLocaleDateString(
                getFormattingLocale(),
              )}
            </td>
            <td>{row.passengers.length}</td>
            <td>
              {row.currency} {formatDecimal(Number(row.totalAmount))}
            </td>
            <td>
              <Badge>{row.status}</Badge>
            </td>
            <td>
              <div className="table-actions">
                <ViewRecordLink
                  href={`/dashboard/bookings/${encodeURIComponent(row.pnr)}`}
                />
                <EditRecordLink
                  href={`/dashboard/bookings/${encodeURIComponent(row.pnr)}/edit`}
                />
              </div>
            </td>
          </tr>
        )}
      />
    </section>
  );
}
