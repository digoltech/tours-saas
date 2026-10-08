"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  getCancellationRequests,
  getFinanceLedger,
  reviewCancellationRequest,
} from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";
import { useConfirmation } from "../../ui/ConfirmationModal";
import { Button } from "../../ui/Button";
import {
  EditRecordLink,
  RecordFields,
  RecordPage,
  RecordSection,
} from "../../ui/RecordPage";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";
type Cancellation = Awaited<ReturnType<typeof getCancellationRequests>>[number];
export function FinanceRecordPage({
  id,
  kind,
  mode = "detail",
}: {
  id: string;
  kind: "cancellation" | "ledger";
  mode?: "detail" | "edit";
}) {
  const t = useTranslations();
  const confirm = useConfirmation();
  const locale = useFormattingLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<Cancellation | null>(null);
  const [entry, setEntry] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const canReview =
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.permissions.includes("finance:cancel"));
  useEffect(() => {
    let active = true;
    async function load() {
      if (kind === "cancellation") {
        const found = (await getCancellationRequests()).find(
          (row) => row.id === id,
        );
        if (!found)
          throw new Error(
            "This request has already been reviewed or is unavailable.",
          );
        if (active) setRequest(found);
      } else {
        const found = (await getFinanceLedger()).find((row) => row.id === id);
        if (!found) throw new Error("Ledger entry not found.");
        if (active) setEntry(found);
      }
    }
    void load()
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load record",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, kind]);
  async function review(approve: boolean) {
    if (!canReview || saving) return;
    if (
      !(await confirm({
        title: approve ? "Approve cancellation?" : "Reject cancellation?",
        description: approve
          ? `${request?.booking.pnr}: approving cancels the ticket and releases its seats. Cancellation fees follow the agency policy.`
          : `${request?.booking.pnr}: rejecting closes this request and keeps the ticket confirmed.`,
        confirmLabel: approve ? "Approve" : "Reject",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await reviewCancellationRequest(id, approve, note);
      router.push("/dashboard/finance");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to review request",
      );
      setSaving(false);
    }
  }
  return (
    <RecordPage
      title={
        request
          ? request.booking.pnr
          : kind === "ledger"
            ? "Ledger entry"
            : "Cancellation request"
      }
      description={
        kind === "ledger"
          ? "Recorded financial transaction and account details."
          : "Review the passenger request before approving a cancellation."
      }
      backHref={
        mode === "edit"
          ? `/dashboard/cancellations/${id}`
          : "/dashboard/finance"
      }
      backLabel={mode === "edit" ? "Back to details" : "Back to list"}
      actions={
        request &&
        mode === "detail" &&
        canReview && (
          <EditRecordLink href={`/dashboard/cancellations/${id}/edit`} />
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
          {t("Loading records...")}
        </div>
      ) : (
        <>
          {request && (
            <RecordSection title="Request details">
              <RecordFields
                fields={[
                  {
                    label: "Booking",
                    value: (
                      <Link
                        className="text-link"
                        href={`/dashboard/bookings/${encodeURIComponent(request.booking.pnr)}`}
                      >
                        {request.booking.pnr}
                      </Link>
                    ),
                  },
                  {
                    label: "Route",
                    value: `${request.booking.trip.route.source} → ${request.booking.trip.route.destination}`,
                  },
                  {
                    label: "Total",
                    value: Number(request.booking.totalAmount).toLocaleString(
                      locale,
                    ),
                  },
                  {
                    label: "Requested",
                    value: new Date(request.createdAt).toLocaleString(locale),
                  },
                  {
                    label: "Reason",
                    value: request.reason || t("No reason provided"),
                  },
                ]}
              />
            </RecordSection>
          )}
          {request && mode === "edit" && canReview && (
            <RecordSection title="Review decision">
              <label className="record-form">
                {t("Review note")}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={saving}
                />
              </label>
              <div className="record-form-footer">
                <Button
                  onClick={() => void review(false)}
                  variant="secondary"
                  disabled={saving}
                >
                  <X size={15} />
                  {t("Reject")}
                </Button>
                <Button onClick={() => void review(true)} disabled={saving}>
                  <Check size={15} />
                  {t("Approve")}
                </Button>
              </div>
            </RecordSection>
          )}
          {entry && (
            <RecordSection title="Transaction">
              <RecordFields
                fields={[
                  "id",
                  "description",
                  "type",
                  "party",
                  "amount",
                  "currency",
                  "method",
                  "reference",
                  "createdAt",
                ]
                  .filter((key) => entry[key] != null)
                  .map((key) => ({
                    label:
                      key === "createdAt"
                        ? "Date"
                        : key.charAt(0).toUpperCase() + key.slice(1),
                    value:
                      key === "createdAt"
                        ? new Date(String(entry[key])).toLocaleString(locale)
                        : String(entry[key]),
                  }))}
              />
            </RecordSection>
          )}
        </>
      )}
    </RecordPage>
  );
}
