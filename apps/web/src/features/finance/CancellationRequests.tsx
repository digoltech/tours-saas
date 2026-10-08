"use client";
import { DataTable } from "../../ui/DataTable";
import { localizeText } from "../../i18n/errors";
import { getFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import "../../styles/finance.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EditRecordLink } from "../../ui/RecordPage";
import { getCancellationRequests } from "../auth/services/api-client";

export function CancellationRequests() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof getCancellationRequests>>
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    try {
      setRows(await getCancellationRequests());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load cancellation requests"),
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section className="cancellation-requests-style-49">
      <div className="card-heading">
        <div>
          <p className="eyebrow">
            <Translate text={"CUSTOMER REQUESTS"} />
          </p>
          <h2>
            <Translate text={"Cancellation review"} />
          </h2>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <DataTable
        title="Cancellation review"
        data={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No pending cancellation requests."
        searchPlaceholder="Search booking PNR or reason"
        searchText={(row) =>
          `${row.booking.pnr} ${row.reason ?? ""} ${row.booking.trip.route.source} ${row.booking.trip.route.destination}`
        }
        columns={[
          {
            id: "pnr",
            header: "PNR",
            render: (row) => (
              <Link
                className="text-link"
                href={`/dashboard/cancellations/${row.id}`}
              >
                {row.booking.pnr}
              </Link>
            ),
          },
          {
            id: "reason",
            header: "Reason",
            render: (row) => row.reason || "No reason provided",
          },
          {
            id: "date",
            header: "Requested",
            render: (row) =>
              new Date(row.createdAt).toLocaleString(getFormattingLocale()),
          },
          {
            id: "route",
            header: "Route",
            render: (row) =>
              `${row.booking.trip.route.source} → ${row.booking.trip.route.destination}`,
          },
          {
            id: "action",
            header: "Actions",
            render: (row) => (
              <EditRecordLink
                href={`/dashboard/cancellations/${row.id}/edit`}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
