"use client";
import { DataTable } from "../../../../src/ui/DataTable";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getCustomers,
  type CustomerRecord,
} from "../../../../src/features/auth/services/api-client";
import { PageHeader } from "../../../../src/ui/PageHeader";
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
      {error && <div className="state-message state-error" role="alert">{error}</div>}
      <DataTable title="Customers" data={rows} rowKey={(customer) => customer.id} loading={loading}
        searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search name, phone or email"
        pagination={{ page, pageSize: 20, total, totalPages: pages, onPageChange: setPage }}
        columns={[
          { id: "name", header: "Customer", render: (customer) => <Link className="text-link" href={`/dashboard/customers/${encodeURIComponent(customer.id)}`}>{customer.firstName} {customer.lastName}</Link> },
          { id: "phone", header: "Phone", render: (customer) => customer.phone },
          { id: "email", header: "Email", render: (customer) => customer.email ?? "—" },
          { id: "bookings", header: "Bookings", render: (customer) => customer.bookings },
          { id: "latest", header: "Latest booking", render: (customer) => customer.latestBooking ? <><Link className="text-link" href={`/dashboard/bookings/${encodeURIComponent(customer.latestBooking.pnr)}`}>{customer.latestBooking.pnr}</Link><br /><small>{customer.latestBooking.route}</small></> : "—" },
        ]}
      />
    </>
  );
}
