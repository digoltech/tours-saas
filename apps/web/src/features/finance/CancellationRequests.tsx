"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import {
  getCancellationRequests,
  reviewCancellationRequest,
} from "../auth/services/api-client";

export function CancellationRequests() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof getCancellationRequests>>
  >([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function refresh() {
    try {
      setRows(await getCancellationRequests());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load cancellation requests",
      );
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function review(id: string, approve: boolean) {
    setBusy(id);
    setError("");
    try {
      await reviewCancellationRequest(id, approve);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to review request",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="mb-5">
      <div className="card-heading">
        <div>
          <p className="eyebrow">CUSTOMER REQUESTS</p>
          <h2>Cancellation review</h2>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 ? (
        <Card>No pending cancellation requests.</Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{row.booking.pnr}</strong>
                  <p>{row.reason || "No reason provided"}</p>
                  <span className="muted">
                    Requested {new Date(row.createdAt).toLocaleString()} ·{" "}
                    {row.booking.trip.route.source} to{" "}
                    {row.booking.trip.route.destination}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={busy === row.id}
                    onClick={() => void review(row.id, true)}
                  >
                    <Check size={15} /> Approve
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy === row.id}
                    onClick={() => void review(row.id, false)}
                  >
                    <X size={15} /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
