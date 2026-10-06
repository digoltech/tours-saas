"use client";
import { localizeText } from "../../i18n/errors";
import { getFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import "../../styles/finance.css";

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
          : localizeText("Unable to load cancellation requests"),
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
        cause instanceof Error ? cause.message : localizeText("Unable to review request"),
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="cancellation-requests-style-49">
      <div className="card-heading">
        <div>
          <p className="eyebrow"><Translate text={"CUSTOMER REQUESTS"} /></p>
          <h2><Translate text={"Cancellation review"} /></h2>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 ? (
        <Card><Translate text={"No pending cancellation requests."} /></Card>
      ) : (
        <div className="cancellation-requests-style-60">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="cancellation-requests-style-63">
                <div>
                  <strong>{row.booking.pnr}</strong>
                  <p>{row.reason || "No reason provided"}</p>
                  <span className="muted">
                    <Translate text={"Requested"} />{" "}{new Date(row.createdAt).toLocaleString(getFormattingLocale())} ·{" "}
                    {row.booking.trip.route.source} <Translate text={"to"} />{" "}
                    {row.booking.trip.route.destination}
                  </span>
                </div>
                <div className="cancellation-requests-style-73">
                  <Button
                    disabled={busy === row.id}
                    onClick={() => void review(row.id, true)}
                  >
                    <Check size={15} /> <Translate text={"Approve"} /></Button>
                  <Button
                    variant="secondary"
                    disabled={busy === row.id}
                    onClick={() => void review(row.id, false)}
                  >
                    <X size={15} /> <Translate text={"Reject"} /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
