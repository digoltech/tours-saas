"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import {
  createBus,
  createDriver,
  createRoute,
  deactivateBusById,
  deactivateDriverById,
  deactivateRouteById,
  getBuses,
  getDrivers,
  getRoutes,
  type Branch,
  type Bus,
  type Driver,
  type Route,
  getBranches,
} from "../auth/services/api-client";

type Resource = "buses" | "drivers" | "routes";
type Row = Bus | Driver | Route;
const copy = {
  buses: [
    "Buses",
    "Keep the fleet available and assigned to the right branch.",
  ],
  drivers: ["Drivers", "Manage licensed drivers and their branch assignments."],
  routes: ["Routes", "Maintain reusable journeys and their ordered stops."],
} as const;

export function TransportPage({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result =
        resource === "buses"
          ? await getBuses({ page: String(page), search, status: statusFilter })
          : resource === "drivers"
            ? await getDrivers({
                page: String(page),
                search,
                status: statusFilter,
              })
            : await getRoutes({
                page: String(page),
                search,
                status: statusFilter,
              });
      setRows(result.data as Row[]);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load records",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resource, page, search, statusFilter]);
  useEffect(() => {
    if (user?.agencyId)
      void getBranches(user.agencyId)
        .then((value) => setBranches(value as Branch[]))
        .catch(() => undefined);
  }, [user?.agencyId]);

  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        agencyId: user?.agencyId,
        totalSeats: form.totalSeats ? Number(form.totalSeats) : undefined,
      };
      if (resource === "buses") await createBus(payload);
      if (resource === "drivers") await createDriver(payload);
      if (resource === "routes") await createRoute(payload);
      setForm({});
      setOpen(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save record",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deactivate(id: string) {
    try {
      if (resource === "buses") await deactivateBusById(id);
      if (resource === "drivers") await deactivateDriverById(id);
      if (resource === "routes") await deactivateRouteById(id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update record",
      );
    }
  }
  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(
      `${resource === "buses" ? "bus" : resource.slice(0, -1)}:create`,
    );
  return (
    <>
      <PageHeader
        title={copy[resource][0]}
        description={copy[resource][1]}
        action={
          canCreate ? (
            <Button onClick={() => setOpen((value) => !value)}>
              <Plus size={16} /> Add {resource.slice(0, -1)}
            </Button>
          ) : undefined
        }
      />
      {open && (
        <Card className="management-form">
          <div className="form-grid">
            {resource === "buses" && (
              <>
                <label>
                  Bus number
                  <input
                    value={form.busNumber ?? ""}
                    onChange={(e) => update("busNumber", e.target.value)}
                  />
                </label>
                <label>
                  Registration number
                  <input
                    value={form.registrationNumber ?? ""}
                    onChange={(e) =>
                      update("registrationNumber", e.target.value)
                    }
                  />
                </label>
                <label>
                  Operator
                  <input
                    value={form.operatorName ?? ""}
                    onChange={(e) => update("operatorName", e.target.value)}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={form.busType ?? "SEATER"}
                    onChange={(e) => update("busType", e.target.value)}
                  >
                    <option>SEATER</option>
                    <option>SLEEPER</option>
                    <option>SEATER_SLEEPER</option>
                  </select>
                </label>
                <label>
                  Total seats
                  <input
                    type="number"
                    min="1"
                    value={form.totalSeats ?? ""}
                    onChange={(e) => update("totalSeats", e.target.value)}
                  />
                </label>
              </>
            )}
            {resource === "drivers" && (
              <>
                <label>
                  First name
                  <input
                    value={form.firstName ?? ""}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={form.lastName ?? ""}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </label>
                <label>
                  License number
                  <input
                    value={form.licenseNumber ?? ""}
                    onChange={(e) => update("licenseNumber", e.target.value)}
                  />
                </label>
                <label>
                  License expiry
                  <input
                    type="date"
                    value={form.licenseExpiryDate ?? ""}
                    onChange={(e) =>
                      update(
                        "licenseExpiryDate",
                        `${e.target.value}T00:00:00.000Z`,
                      )
                    }
                  />
                </label>
              </>
            )}
            {resource === "routes" && (
              <>
                <label>
                  Route name
                  <input
                    value={form.name ?? ""}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <label>
                  Code
                  <input
                    value={form.code ?? ""}
                    onChange={(e) => update("code", e.target.value)}
                  />
                </label>
                <label>
                  Source
                  <input
                    value={form.source ?? ""}
                    onChange={(e) => update("source", e.target.value)}
                  />
                </label>
                <label>
                  Destination
                  <input
                    value={form.destination ?? ""}
                    onChange={(e) => update("destination", e.target.value)}
                  />
                </label>
                <label>
                  Description
                  <input
                    value={form.description ?? ""}
                    onChange={(e) => update("description", e.target.value)}
                  />
                </label>
              </>
            )}
            {resource !== "routes" && (
              <label>
                Branch
                <select
                  value={form.branchId ?? ""}
                  onChange={(e) => update("branchId", e.target.value)}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save record"}
          </Button>
        </Card>
      )}
      {error && (
        <div className="state-message state-error">
          <strong>{error}</strong>
        </div>
      )}
      <Card className="management-card">
        <div className="management-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${resource}`}
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        {loading ? (
          <div className="state-message">Loading records...</div>
        ) : rows.length === 0 ? (
          <div className="state-message">
            <strong>No {resource} found</strong>
            <span>Adjust your filters or add a record.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {resource === "buses" ? (
                    <>
                      <th>Bus</th>
                      <th>Registration</th>
                      <th>Type</th>
                      <th>Seats</th>
                      <th>Branch</th>
                    </>
                  ) : resource === "drivers" ? (
                    <>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>License</th>
                      <th>Branch</th>
                    </>
                  ) : (
                    <>
                      <th>Route</th>
                      <th>Code</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Stops</th>
                    </>
                  )}
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {resource === "buses" ? (
                      <>
                        <td>{(row as Bus).busNumber}</td>
                        <td>{(row as Bus).registrationNumber}</td>
                        <td>{(row as Bus).busType}</td>
                        <td>{(row as Bus).totalSeats}</td>
                        <td>{(row as Bus).branch.name}</td>
                      </>
                    ) : resource === "drivers" ? (
                      <>
                        <td>
                          {(row as Driver).firstName} {(row as Driver).lastName}
                        </td>
                        <td>{(row as Driver).phone}</td>
                        <td>{(row as Driver).licenseNumber}</td>
                        <td>{(row as Driver).branch.name}</td>
                      </>
                    ) : (
                      <>
                        <td>{(row as Route).name}</td>
                        <td>{(row as Route).code}</td>
                        <td>{(row as Route).source}</td>
                        <td>{(row as Route).destination}</td>
                        <td>{(row as Route)._count?.stops ?? 0}</td>
                      </>
                    )}
                    <td>
                      <Badge>{row.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="button button-ghost"
                        disabled={row.status === "INACTIVE"}
                        onClick={() => void deactivate(row.id)}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="management-toolbar">
          <span>
            Page {page} of {pages}
          </span>
          <div>
            <Button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
