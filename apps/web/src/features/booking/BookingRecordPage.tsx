"use client";
import {
  useConfirmation,
  type ConfirmationOptions,
} from "../../ui/ConfirmationModal";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { FinanceMethod } from "@a-one-tours/shared";
import { useAuth } from "../auth/components/AuthProvider";
import {
  getBookingByPnr,
  requestBookingCancellation,
  recordBookingPayment,
  recordBookingRefund,
  type BookingRecord,
} from "../auth/services/api-client";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { TicketView } from "./TicketView";
import { TicketExportMenu } from "./TicketExportMenu";
import {
  EditRecordLink,
  RecordFields,
  RecordPage,
  RecordSection,
} from "../../ui/RecordPage";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";

export function BookingRecordPage({
  pnr,
  mode = "detail",
  confirmed = false,
}: {
  pnr: string;
  confirmed?: boolean;
  mode?: "detail" | "edit";
}) {
  const t = useTranslations();
  const confirm = useConfirmation();
  const locale = useFormattingLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<FinanceMethod>("CASH");
  const [reference, setReference] = useState("");
  const can = (permission: string) =>
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.permissions.includes(permission));
  const href = `/dashboard/bookings/${encodeURIComponent(pnr)}`;
  useEffect(() => {
    let active = true;
    void getBookingByPnr(pnr)
      .then((value) => {
        if (active) setBooking(value);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load booking",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pnr]);
  async function act(
    operation: () => Promise<unknown>,
    confirmation: ConfirmationOptions,
  ) {
    if (saving || !(await confirm(confirmation))) return;
    setSaving(true);
    setError("");
    try {
      await operation();
      router.push(href);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update booking",
      );
      setSaving(false);
    }
  }
  function transaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking || !Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return;
    void act(
      () =>
        booking.status === "CANCELLED"
          ? recordBookingRefund(booking.id, {
              amount: Number(amount),
              method,
              reference,
            })
          : recordBookingPayment(booking.id, {
              amount: Number(amount),
              method,
              reference,
            }),
      {
        title:
          booking.status === "CANCELLED" ? "Record refund?" : "Record payment?",
        description: `${booking.pnr} · ${booking.currency} ${Number(amount).toLocaleString(locale)} · ${method.replaceAll("_", " ")}. Confirm to record this transaction.`,
        confirmLabel:
          booking.status === "CANCELLED" ? "Record refund" : "Record payment",
        destructive: false,
      },
    );
  }
  return (
    <RecordPage
      title={mode === "edit" ? `Manage booking ${pnr}` : pnr}
      description="Passenger ticket, journey details and booking status."
      backHref={mode === "edit" ? href : "/dashboard/bookings"}
      backLabel={mode === "edit" ? "Back to details" : "Back to list"}
      eyebrow="Booking details"
      summary={
        booking
          ? [
              {
                label: "Total",
                value: `${booking.currency} ${Number(booking.totalAmount).toLocaleString(locale)}`,
              },
              { label: "Passengers", value: booking.passengers.length },
              {
                label: "Travel date",
                value: new Date(booking.trip.travelDate).toLocaleDateString(
                  locale,
                  { timeZone: "UTC" },
                ),
              },
              {
                label: "Trip",
                value: booking.trip.tripCode,
                href: `/dashboard/trips/${booking.trip.id}`,
              },
            ]
          : undefined
      }
      actions={
        booking && (
          <>
            <Badge>{booking.status}</Badge>
            {mode === "detail" && <EditRecordLink href={`${href}/edit`} />}
            <TicketExportMenu booking={booking} />
          </>
        )
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {loading ? (
        <div className="state-message" role="status">
          {t("Loading bookings…")}
        </div>
      ) : (
        booking && (
          <>
            {mode === "edit" && (
              <RecordSection title="Journey">
                <RecordFields
                  fields={[
                    { label: "PNR", value: booking.pnr },
                    {
                      label: "Trip",
                      value: (
                        <Link
                          className="text-link"
                          href={`/dashboard/trips/${booking.trip.id}`}
                        >
                          {booking.trip.tripCode}
                        </Link>
                      ),
                    },
                    {
                      label: "Route",
                      value: `${booking.trip.route.source} → ${booking.trip.route.destination}`,
                    },
                    {
                      label: "Travel date",
                      value: new Date(
                        booking.trip.travelDate,
                      ).toLocaleDateString(locale),
                    },
                    {
                      label: "Total",
                      value: `${booking.currency} ${Number(booking.totalAmount).toLocaleString(locale)}`,
                    },
                    { label: "Passengers", value: booking.passengers.length },
                  ]}
                />
              </RecordSection>
            )}
            {mode === "detail" ? (
              <TicketView booking={booking} confirmed={confirmed} />
            ) : (
              <>
                {booking.status === "CONFIRMED" && (
                  <RecordSection
                    title="Request cancellation"
                    description="Send a reason to the agency for review."
                  >
                    <form
                      className="record-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void act(
                          () => requestBookingCancellation(booking.id, reason),
                          {
                            title: "Request cancellation?",
                            description: `Send a cancellation request for ${booking.pnr} to the agency for review. Your ticket remains confirmed until approval.`,
                            confirmLabel: "Request cancellation",
                          },
                        );
                      }}
                    >
                      <label>
                        {t("Reason")}
                        <textarea
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          disabled={
                            booking.cancellationRequest?.status === "PENDING"
                          }
                        />
                      </label>
                      <div className="record-form-footer">
                        <Link className="button button-secondary" href={href}>
                          {t("Cancel")}
                        </Link>
                        <Button
                          type="submit"
                          loading={saving}
                          disabled={
                            booking.cancellationRequest?.status === "PENDING"
                          }
                        >
                          <Save size={15} />
                          {t(
                            booking.cancellationRequest?.status === "PENDING"
                              ? "Cancellation pending"
                              : "Request cancellation",
                          )}
                        </Button>
                      </div>
                    </form>
                  </RecordSection>
                )}
                {((booking.status === "CONFIRMED" && can("finance:payment")) ||
                  (booking.status === "CANCELLED" &&
                    can("finance:refund"))) && (
                  <RecordSection
                    title={
                      booking.status === "CANCELLED"
                        ? "Record refund"
                        : "Record payment"
                    }
                  >
                    <form className="record-form" onSubmit={transaction}>
                      <div className="record-form-grid">
                        <label>
                          {t("Amount")} *
                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                          />
                        </label>
                        <label>
                          {t("Method")}
                          <select
                            value={method}
                            onChange={(event) =>
                              setMethod(event.target.value as FinanceMethod)
                            }
                          >
                            {[
                              "CASH",
                              "BANK_TRANSFER",
                              "CARD",
                              "UPI",
                              "OTHER",
                            ].map((value) => (
                              <option key={value} value={value}>
                                {value.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t("Reference")}
                          <input
                            value={reference}
                            onChange={(event) =>
                              setReference(event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <Button type="submit" loading={saving}>
                        <Save size={15} />
                        {t("Save record")}
                      </Button>
                    </form>
                  </RecordSection>
                )}
                {booking.status !== "CONFIRMED" &&
                  !(
                    booking.status === "CANCELLED" && can("finance:refund")
                  ) && (
                    <RecordSection title="Booking status">
                      <p>{t("This ticket has no available changes.")}</p>
                    </RecordSection>
                  )}
              </>
            )}
          </>
        )
      )}
    </RecordPage>
  );
}
