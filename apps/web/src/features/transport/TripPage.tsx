"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import {
  cancelTrip,
  createTrip,
  getBuses,
  getBranches,
  getAgencies,
  getDrivers,
  getRoutes,
  getTrips,
  updateTrip,
  type Branch,
  type Bus,
  type Driver,
  type Route,
  type Trip,
} from "../auth/services/api-client";

export function TripPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const can = (action: string) =>
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(`trip:${action}`);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getTrips({ page: String(page), search, status });
      setTrips(result.data);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load trips");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        getRoutes({ limit: "100", status: "ACTIVE" }),
        getBuses({ limit: "100", status: "ACTIVE" }),
        getDrivers({ limit: "100", status: "ACTIVE" }),
        user?.agencyId
          ? getBranches(user.agencyId)
          : user?.role === "SUPER_ADMIN"
            ? getAgencies().then((rows) => {
                const values = rows as { id: string; name: string }[];
                setAgencies(values);
                update("agencyId", values[0]?.id ?? "");
                return Promise.all(
                  values.map((agency) => getBranches(agency.id)),
                ).then((lists) => lists.flat());
              })
            : Promise.resolve([]),
      ])
        .then(([routePage, busPage, driverPage, branchRows]) => {
          setRoutes(routePage.data);
          setBuses(busPage.data);
          setDrivers(driverPage.data);
          setBranches(branchRows as Branch[]);
        })
        .catch((cause) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load trip options",
          ),
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user?.agencyId, user?.role]);
  async function save() {
    const required = [[form.tripCode, "Trip code"], [form.branchId, "Branch"], [form.routeId, "Route"], [form.busId, "Bus"], [form.driverId, "Driver"], [form.travelDate, "Travel date"], [form.departureTime, "Departure"], [form.arrivalTime, "Arrival"]] as const;
    const missing = required.find(([value]) => !value.trim());
    if (missing) { setError(`${missing[1]} is required.`); return; }
    if (user?.role === "SUPER_ADMIN" && !form.agencyId) { setError("Agency is required."); return; }
    if (!Number.isFinite(Number(form.fare ?? "0")) || Number(form.fare ?? "0") < 0) { setError("Fare must be zero or greater."); return; }
    if (new Date(form.arrivalTime) <= new Date(form.departureTime)) { setError("Arrival must be after departure."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        agencyId: user?.agencyId ?? form.agencyId,
        travelDate: new Date(`${form.travelDate}T00:00:00.000Z`).toISOString(),
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
      };
      if (editingId) await updateTrip(editingId, payload);
      else await createTrip(payload);
      setForm({});
      setOpen(false);
      setEditingId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save trip");
    } finally {
      setSaving(false);
    }
  }
  function editTrip(trip: Trip) {
    setEditingId(trip.id);
    setForm({
      tripCode: trip.tripCode,
      branchId: trip.branch.id,
      routeId: trip.route.id,
      busId: trip.bus.id,
      driverId: trip.driver.id,
      travelDate: trip.travelDate.slice(0, 10),
      departureTime: new Date(trip.departureTime).toISOString().slice(0, 16),
      arrivalTime: new Date(trip.arrivalTime).toISOString().slice(0, 16),
      status: trip.status,
      fare: String(trip.fare ?? 0),
    });
    setOpen(true);
  }
  return (
    <>
      <PageHeader
        title="Trips"
        description="Schedule reusable routes with active buses and drivers."
        action={
          can("create") ? (
            <Button onClick={() => setOpen((value) => !value)}>
              <Plus size={16} /> Add trip
            </Button>
          ) : undefined
        }
      />
      {open && (
        <Card className="management-form">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                {editingId ? "Update schedule" : "New schedule"}
              </p>
              <h2>{editingId ? "Edit trip" : "Create trip"}</h2>
            </div>
          </div>
          <div className="form-grid">
            {user?.role === "SUPER_ADMIN" && (
              <label>
                Agency
                <select
                  value={form.agencyId ?? ""}
                  onChange={(e) => {
                    update("agencyId", e.target.value);
                    update("branchId", "");
                  }}
                >
                  <option value="">Select agency</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Trip code
              <input
                value={form.tripCode ?? ""}
                onChange={(e) => update("tripCode", e.target.value)}
              />
            </label>
            <label>
              Fare per seat (INR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fare ?? "0"}
                onChange={(e) => update("fare", e.target.value)}
              />
            </label>
            {editingId && (
              <label>
                Status
                <select
                  value={form.status ?? "SCHEDULED"}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option>SCHEDULED</option>
                  <option>IN_PROGRESS</option>
                  <option>COMPLETED</option>
                  <option>CANCELLED</option>
                </select>
              </label>
            )}
            <label>
              Branch
              <select
                value={form.branchId ?? ""}
                onChange={(e) => update("branchId", e.target.value)}
              >
                <option value="">Select branch</option>
                {branches
                  .filter(
                    (branch) =>
                      user?.role !== "SUPER_ADMIN" ||
                      branch.agencyId === form.agencyId,
                  )
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Route
              <select
                value={form.routeId ?? ""}
                onChange={(e) => update("routeId", e.target.value)}
              >
                <option value="">Select route</option>
                {routes
                  .filter(
                    (route) =>
                      user?.role !== "SUPER_ADMIN" ||
                      (route as Route & { agencyId?: string }).agencyId ===
                        form.agencyId,
                  )
                  .map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Bus
              <select
                value={form.busId ?? ""}
                onChange={(e) => update("busId", e.target.value)}
              >
                <option value="">Select active bus</option>
                {buses
                  .filter(
                    (bus) =>
                      (!form.branchId || bus.branch.id === form.branchId) &&
                      (user?.role !== "SUPER_ADMIN" ||
                        (bus as Bus & { agencyId?: string }).agencyId ===
                          form.agencyId),
                  )
                  .map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.busNumber} · {bus.registrationNumber}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Driver
              <select
                value={form.driverId ?? ""}
                onChange={(e) => update("driverId", e.target.value)}
              >
                <option value="">Select active driver</option>
                {drivers
                  .filter(
                    (driver) =>
                      (!form.branchId || driver.branch.id === form.branchId) &&
                      (user?.role !== "SUPER_ADMIN" ||
                        (driver as Driver & { agencyId?: string }).agencyId ===
                          form.agencyId),
                  )
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Travel date
              <input
                type="date"
                value={form.travelDate ?? ""}
                onChange={(e) => update("travelDate", e.target.value)}
              />
            </label>
            <label>
              Departure
              <input
                type="datetime-local"
                value={form.departureTime ?? ""}
                onChange={(e) => update("departureTime", e.target.value)}
              />
            </label>
            <label>
              Arrival
              <input
                type="datetime-local"
                value={form.arrivalTime ?? ""}
                onChange={(e) => update("arrivalTime", e.target.value)}
              />
            </label>
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Save trip"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              setEditingId(null);
            }}
          >
            Cancel
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
              placeholder="Search trip code or route"
            />
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option>SCHEDULED</option>
            <option>IN_PROGRESS</option>
            <option>COMPLETED</option>
            <option>CANCELLED</option>
          </select>
        </div>
        {loading ? (
          <div className="state-message">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="state-message">
            <strong>No trips found</strong>
            <span>Schedule a trip or adjust the filters.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Route</th>
                  <th>Travel date</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Bus</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td>
                      <Link href={`/trips/${trip.id}`}>{trip.tripCode}</Link>
                    </td>
                    <td>{trip.route.name}</td>
                    <td>{new Date(trip.travelDate).toLocaleDateString()}</td>
                    <td>
                      {new Date(trip.departureTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {new Date(trip.arrivalTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{trip.bus.busNumber}</td>
                    <td>
                      {trip.driver.firstName} {trip.driver.lastName}
                    </td>
                    <td>
                      <Badge>{trip.status}</Badge>
                    </td>
                    <td>
                      {can("update") && (
                        <button
                          className="button button-ghost"
                          aria-label="Edit trip"
                          onClick={() => editTrip(trip)}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {can("cancel") && (
                        <button
                          className="button button-ghost"
                          disabled={trip.status === "CANCELLED"}
                          onClick={() =>
                            void cancelTrip(trip.id)
                              .then(load)
                              .catch((cause) =>
                                setError(
                                  cause instanceof Error
                                    ? cause.message
                                    : "Unable to cancel trip",
                                ),
                              )
                          }
                        >
                          Cancel
                        </button>
                      )}
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
