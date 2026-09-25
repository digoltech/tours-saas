"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
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
  updateBus,
  updateDriver,
  updateRoute,
  getBuses,
  getDrivers,
  getRoutes,
  type Branch,
  type Bus,
  type Driver,
  type Route,
  getBranches,
  getAgencies,
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
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
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
  }, [resource, page, search, statusFilter]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const loadBranches = async () => {
      if (user?.agencyId) return getBranches(user.agencyId);
      if (user?.role === "SUPER_ADMIN") {
        const agencies = await getAgencies() as { id: string }[];
        const lists = await Promise.all(agencies.map((agency) => getBranches(agency.id)));
        return lists.flat();
      }
      return [];
    };
    void loadBranches().then((value) => setBranches(value as Branch[])).catch(() => setBranches([]));
  }, [user?.agencyId, user?.role]);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    void getAgencies().then((rows) => { const values = rows as { id: string; name: string }[]; setAgencies(values); setSelectedAgencyId((current) => current || values[0]?.id || ""); }).catch(() => setAgencies([]));
  }, [user?.role]);

  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    const requiredFields = resource === "buses"
      ? [[form.busNumber, "Bus number"], [form.registrationNumber, "Registration number"], [form.busType, "Bus type"], [form.totalSeats, "Seat count"], [form.branchId, "Branch"]]
      : resource === "drivers"
        ? [[form.firstName, "First name"], [form.lastName, "Last name"], [form.phone, "Phone"], [form.licenseNumber, "License number"], [form.branchId, "Branch"]]
        : [[form.name, "Route name"], [form.code, "Route code"], [form.source, "Source"], [form.destination, "Destination"]];
    const missing = requiredFields.find(([value]) => !value?.trim());
    if (missing) { setError(`${missing[1]} is required.`); return; }
    if (resource === "buses" && Number(form.totalSeats) < 1) { setError("Seat count must be at least 1."); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email address."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        agencyId: user?.agencyId ?? (selectedAgencyId || undefined),
        totalSeats: form.totalSeats ? Number(form.totalSeats) : undefined,
        ...(resource === "drivers" && form.licenseExpiryDate && !form.licenseExpiryDate.includes("T") ? { licenseExpiryDate: `${form.licenseExpiryDate}T00:00:00.000Z` } : {}),
      };
      if (resource === "buses") {
        if (editing) await updateBus(editing.id, payload); else await createBus(payload);
      }
      if (resource === "drivers") {
        if (editing) await updateDriver(editing.id, payload); else await createDriver(payload);
      }
      if (resource === "routes") {
        if (editing) await updateRoute(editing.id, payload); else await createRoute(payload);
      }
      setForm({});
      setOpen(false);
      setEditing(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save record",
      );
    } finally {
      setSaving(false);
    }
  }
  function edit(row: Row) {
    setEditing(row);
    if (resource === "buses") {
      const bus = row as Bus;
      setForm({ busNumber: bus.busNumber, registrationNumber: bus.registrationNumber, operatorName: bus.operatorName ?? "", busType: bus.busType, totalSeats: String(bus.totalSeats), branchId: bus.branch.id, status: bus.status });
    } else if (resource === "drivers") {
      const driver = row as Driver;
      setForm({ firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone, email: driver.email ?? "", licenseNumber: driver.licenseNumber, licenseExpiryDate: driver.licenseExpiryDate?.slice(0, 10) ?? "", branchId: driver.branch.id, status: driver.status });
    } else {
      const route = row as Route;
      setForm({ name: route.name, code: route.code, source: route.source, destination: route.destination, description: route.description ?? "", status: route.status });
    }
    setOpen(true);
  }
  async function deactivate(id: string) {
    try {
      if (resource === "buses") await deactivateBusById(id);
      if (resource === "drivers") await deactivateDriverById(id);
      if (resource === "routes") await deactivateRouteById(id);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update record",
      );
    }
  }
  function showDetails(row: Row) { setSelected(row); }
  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(
      `${resource === "buses" ? "bus" : resource.slice(0, -1)}:create`,
    );
  const permissionBase = resource === "buses" ? "bus" : resource === "drivers" ? "driver" : "route";
  const can = (action: string) => user?.role === "SUPER_ADMIN" || user?.permissions.includes(`${permissionBase}:${action}`);
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
          <div className="card-heading"><div><p className="eyebrow">{editing ? "Update record" : "New record"}</p><h2>{editing ? "Edit" : "Add"} {resource.slice(0, -1)}</h2></div></div>
          <div className="form-grid">
            {user?.role === "SUPER_ADMIN" && <label>Agency<select value={selectedAgencyId} onChange={(e) => { setSelectedAgencyId(e.target.value); update("branchId", ""); }}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
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
                  {branches.filter((branch) => user?.role !== "SUPER_ADMIN" || branch.agencyId === selectedAgencyId).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editing && <label>Status<select value={form.status ?? "ACTIVE"} onChange={(e) => update("status", e.target.value)}><option>ACTIVE</option><option>INACTIVE</option></select></label>}
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Save record"}
          </Button>
          <Button variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
        </Card>
      )}
      {error && (
        <div className="state-message state-error">
          <strong>{error}</strong>
        </div>
      )}
      {selected && <Card className="management-form"><div className="card-heading"><div><p className="eyebrow">{resource.slice(0, -1)} details</p><h2>{resource === "buses" ? (selected as Bus).busNumber : resource === "drivers" ? `${(selected as Driver).firstName} ${(selected as Driver).lastName}` : (selected as Route).name}</h2></div><Badge>{selected.status}</Badge></div><p>{resource === "buses" ? `${(selected as Bus).registrationNumber} · ${(selected as Bus).busType} · ${(selected as Bus).totalSeats} seats · ${(selected as Bus).branch.name}` : resource === "drivers" ? `${(selected as Driver).phone} · License ${(selected as Driver).licenseNumber} · ${(selected as Driver).branch.name}` : `${(selected as Route).source} to ${(selected as Route).destination}`}</p><Button variant="secondary" disabled={!can("update")} onClick={() => edit(selected)}><Pencil size={15} /> Edit</Button><Button variant="secondary" onClick={() => setSelected(null)}>Close</Button></Card>}
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {resource === "buses" ? (
                      <>
                        <td><button className="text-link" onClick={() => showDetails(row)}>{(row as Bus).busNumber}</button></td>
                        <td>{(row as Bus).registrationNumber}</td>
                        <td>{(row as Bus).busType}</td>
                        <td>{(row as Bus).totalSeats}</td>
                        <td>{(row as Bus).branch.name}</td>
                      </>
                    ) : resource === "drivers" ? (
                      <>
                        <td>
                          <button className="text-link" onClick={() => showDetails(row)}>{(row as Driver).firstName} {(row as Driver).lastName}</button>
                        </td>
                        <td>{(row as Driver).phone}</td>
                        <td>{(row as Driver).licenseNumber}</td>
                        <td>{(row as Driver).branch.name}</td>
                      </>
                    ) : (
                      <>
                        <td><Link href={`/routes/${row.id}`}>{(row as Route).name}</Link></td>
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
                      <button className="button button-ghost" onClick={() => edit(row)} disabled={!can("update")} aria-label={`Edit ${resource.slice(0, -1)}`}><Pencil size={15} /></button>
                      <button
                        className="button button-ghost"
                        disabled={row.status === "INACTIVE" || !can("delete")}
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
