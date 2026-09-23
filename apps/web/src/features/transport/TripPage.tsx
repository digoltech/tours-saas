"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
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
  getDrivers,
  getRoutes,
  getTrips,
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function load() {
    try {
      const result = await getTrips({ page: String(page), search, status });
      setTrips(result.data);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load trips");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page, search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        getRoutes({ limit: "100", status: "ACTIVE" }),
        getBuses({ limit: "100", status: "ACTIVE" }),
        getDrivers({ limit: "100", status: "ACTIVE" }),
        user?.agencyId ? getBranches(user.agencyId) : Promise.resolve([]),
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
  }, [user?.agencyId]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      await createTrip({
        ...form,
        agencyId: user?.agencyId,
        travelDate: new Date(`${form.travelDate}T00:00:00.000Z`).toISOString(),
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
      });
      setForm({});
      setOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save trip");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Trips"
        description="Schedule reusable routes with active buses and drivers."
        action={
          <Button onClick={() => setOpen((value) => !value)}>
            <Plus size={16} /> Add trip
          </Button>
        }
      />
      {open && (
        <Card className="management-form">
          <div className="form-grid">
            <label>
              Trip code
              <input
                value={form.tripCode ?? ""}
                onChange={(e) => update("tripCode", e.target.value)}
              />
            </label>
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
            <label>
              Route
              <select
                value={form.routeId ?? ""}
                onChange={(e) => update("routeId", e.target.value)}
              >
                <option value="">Select route</option>
                {routes.map((route) => (
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
                    (bus) => !form.branchId || bus.branch.id === form.branchId,
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
                      !form.branchId || driver.branch.id === form.branchId,
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
            {saving ? "Saving..." : "Save trip"}
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
        {trips.length === 0 ? (
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
                  <th />
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
