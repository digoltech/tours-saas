"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomers, type CustomerRecord } from "../auth/services/api-client";
import { RecordFields, RecordPage, RecordSection } from "../../ui/RecordPage";
import { useTranslations } from "../../i18n/LocaleProvider";

export function CustomerRecordPage({ id }: { id: string }) {
  const customerId = decodeURIComponent(id);
  const t = useTranslations();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      let page = 1;
      while (active) {
        const result = await getCustomers({
          search: customerId.split(":")[0],
          limit: 50,
          page,
        });
        const found = result.data.find((row) => row.id === customerId);
        if (found) {
          if (active) setCustomer(found);
          return;
        }
        if (page >= result.meta.totalPages)
          throw new Error("Customer not found.");
        page += 1;
      }
    }
    void load()
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load customer",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);
  return (
    <RecordPage
      title={
        customer
          ? `${customer.firstName} ${customer.lastName}`
          : "Customer details"
      }
      description="Passenger information from your bookings."
      backHref="/dashboard/customers"
      backLabel="Back to list"
      eyebrow="Customer profile"
      summary={
        customer
          ? [
              { label: "Bookings", value: customer.bookings },
              { label: "Phone", value: customer.phone || "—" },
              {
                label: "Latest booking",
                value: customer.latestBooking?.pnr ?? "—",
                ...(customer.latestBooking
                  ? {
                      href: `/dashboard/bookings/${encodeURIComponent(customer.latestBooking.pnr)}`,
                    }
                  : {}),
              },
            ]
          : undefined
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
        customer && (
          <>
            <RecordSection title="Contact information">
              <RecordFields
                fields={[
                  {
                    label: "Name",
                    value: `${customer.firstName} ${customer.lastName}`,
                  },
                  { label: "Phone", value: customer.phone },
                  { label: "Email", value: customer.email },
                  { label: "Bookings", value: customer.bookings },
                ]}
              />
            </RecordSection>
            <RecordSection title="Latest booking">
              {customer.latestBooking ? (
                <>
                  <Link
                    className="record-related-link"
                    href={`/dashboard/bookings/${encodeURIComponent(customer.latestBooking.pnr)}`}
                  >
                    {customer.latestBooking.pnr}
                  </Link>
                  <p className="record-help">{customer.latestBooking.route}</p>
                </>
              ) : (
                <p>{t("No bookings found")}</p>
              )}
            </RecordSection>
          </>
        )
      )}
    </RecordPage>
  );
}
