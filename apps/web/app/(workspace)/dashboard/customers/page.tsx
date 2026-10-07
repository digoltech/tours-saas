"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Phone,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  getCustomers,
  type CustomerRecord,
} from "../../../../src/features/auth/services/api-client";
import { PageHeader } from "../../../../src/ui/PageHeader";
import { Card } from "../../../../src/ui/Card";
import { Badge } from "../../../../src/ui/Badge";
import "../../../../src/styles/experience.css";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getCustomers({ search, page });
      setRows(result.data);
      setTotal(result.meta.total);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  return (
    <>
      <PageHeader
        title="Customers"
        description="Passengers and contact details from your bookings."
      />
      <Card className="customer-directory">
        <div className="customer-directory-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone or email"
              aria-label="Search customers"
            />
          </label>
          <Badge>{total} customers</Badge>
        </div>
        {error && (
          <div className="state-message state-error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="state-message">Loading customers…</div>
        ) : rows.length ? (
          <div className="customer-list">
            {rows.map((customer) => (
              <article className="customer-card" key={customer.id}>
                <span className="customer-avatar">
                  <UserRound size={22} />
                </span>
                <div className="customer-main">
                  <h2>
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <span>
                    <Phone size={14} />
                    {customer.phone}
                  </span>
                  {customer.email && <small>{customer.email}</small>}
                </div>
                <div className="customer-last">
                  <span>
                    <Ticket size={15} />
                    {customer.bookings}{" "}
                    {customer.bookings === 1 ? "booking" : "bookings"}
                  </span>
                  {customer.latestBooking && (
                    <small>
                      {customer.latestBooking.route} ·{" "}
                      {customer.latestBooking.pnr}
                    </small>
                  )}
                </div>
                <Link
                  href={
                    customer.latestBooking
                      ? `/dashboard/bookings?pnr=${encodeURIComponent(customer.latestBooking.pnr)}`
                      : "/dashboard/bookings"
                  }
                  className="button button-secondary"
                >
                  View ticket <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="journey-empty">
            <UserRound size={28} />
            <strong>No customers found</strong>
            <span>Passengers will appear here after their first booking.</span>
          </div>
        )}
        <div className="customer-pagination">
          <span>
            Page {page} of {pages}
          </span>
          <div>
            <button
              className="button button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="button button-secondary"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
