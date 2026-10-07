"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { useFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";
import { useTranslations } from "../../i18n/LocaleProvider";

import "../../styles/transport.css";

import { cn } from "../../lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Ban, BusFront, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Search, Save, Users, X } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import "../../styles/experience.css";
import { useAuth } from "../auth/components/AuthProvider";
import {
  cancelTrip,
  createTrip,
  createRecurringTrips,
  getBuses,
  getBranches,
  getAgencies,
  getDrivers,
  getRoutes,
  getTrips,
  previewRecurringTrips,
  updateTrip,
  type Branch,
  type Bus,
  type Driver,
  type Route,
  type Trip,
  type PageResult,
  type RecurringTripInput,
} from "../auth/services/api-client";

export function TripPage({
  initialPage,
  initialError = "",
}: {
  initialPage?: PageResult<Trip> | null;
  initialError?: string;
}) {
  const t = useTranslations();
  const formattingLocale = useFormattingLocale();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(initialPage?.data ?? []);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(initialPage?.meta.totalPages ?? 1);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(initialPage === undefined);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const skipInitialLoad = useRef(initialPage !== undefined);
  const [form, setForm] = useState<Record<string, string>>({});
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [recurrencePreview, setRecurrencePreview] = useState<Awaited<ReturnType<typeof previewRecurringTrips>>>([]);
  const update = (key: string, value: string) =>
    { setRecurrencePreview([]); setForm((current) => ({ ...current, [key]: value })); };
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
      setError(cause instanceof Error ? cause.message : localizeText("Unable to load trips"));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);
  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!open) return;
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
              : localizeText("Unable to load trip options"),
          ),
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, user?.agencyId, user?.role]);
  async function save() {
    const required = [[form.tripCode, "Trip code"], [form.branchId, "Branch"], [form.routeId, "Route"], [form.busId, "Bus"], [form.driverId, "Driver"], [form.travelDate, "Travel date"], [form.departureTime, "Departure"], [form.arrivalTime, "Arrival"]] as const;
    const missing = required.find(([value]) => !value.trim());
    if (missing) { setError(`${missing[1]} is required.`); return; }
    if (user?.role === "SUPER_ADMIN" && !form.agencyId) { setError(localizeText("Agency is required.")); return; }
    if (!Number.isFinite(Number(form.fare ?? "0")) || Number(form.fare ?? "0") < 0) { setError(localizeText("Fare must be zero or greater.")); return; }
    if (new Date(form.arrivalTime) <= new Date(form.departureTime)) { setError(localizeText("Arrival must be after departure.")); return; }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        agencyId: user?.agencyId ?? form.agencyId,
        travelDate: new Date(`${form.travelDate}T00:00:00.000Z`).toISOString(),
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
      };
      if (editingId) await updateTrip(editingId, payload);
      else if (repeatWeekly) {
        const schedule = recurrencePayload();
        const preview = await previewRecurringTrips(schedule);
        setRecurrencePreview(preview);
        setSaving(false);
        return;
      } else await createTrip(payload);
      setForm({});
      setOpen(false);
      setEditingId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : localizeText("Unable to save trip"));
    } finally {
      setSaving(false);
    }
  }
  function recurrencePayload(): RecurringTripInput {
    return {
      agencyId: user?.agencyId ?? form.agencyId,
      branchId: form.branchId ?? "", routeId: form.routeId ?? "", busId: form.busId ?? "", driverId: form.driverId ?? "",
      tripCode: form.tripCode ?? "", startDate: form.travelDate ?? "", endDate: repeatEndDate, weekdays,
      departureTime: new Date(form.departureTime ?? "").toISOString(), arrivalTime: new Date(form.arrivalTime ?? "").toISOString(), fare: Number(form.fare ?? 0),
    };
  }
  async function generateRecurring() {
    setSaving(true); setError("");
    try { const result = await createRecurringTrips(recurrencePayload()); setMessage(`${result.created.length} ${t("trips created")}; ${result.skipped.length} ${t("skipped")}. ${result.skipped.slice(0, 3).map((item) => `${item.date}: ${item.reason}`).join(" · ")}`); setForm({}); setOpen(false); setRepeatWeekly(false); setRecurrencePreview([]); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to generate recurring trips")); }
    finally { setSaving(false); }
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
      />
      {open && (
        <Card className={cn("management-form")}>
          <div className={cn("card-heading")}>
            <div>
              <p className={cn("eyebrow")}>
                <LocalizedValue value={editingId ? "Update schedule" : "New schedule"} />
              </p>
              <h2><LocalizedValue value={editingId ? "Edit trip" : "Create trip"} /></h2>
            </div>
          </div>
          <div className={cn("form-grid")}>
            {user?.role === "SUPER_ADMIN" && (
              <label>
                <Translate text={"Agency"} /><select
                  value={form.agencyId ?? ""}
                  onChange={(e) => {
                    update("agencyId", e.target.value);
                    update("branchId", "");
                  }}
                >
                  <option value=""><Translate text={"Select agency"} /></option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <Translate text={"Trip code"} /><input
                value={form.tripCode ?? ""}
                onChange={(e) => update("tripCode", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Fare per seat (INR)"} /><input
                type="number"
                min="0"
                step="0.01"
                value={form.fare ?? "0"}
                onChange={(e) => update("fare", e.target.value)}
              />
            </label>
            {editingId && (
              <label>
                <Translate text={"Status"} /><select
                  value={form.status ?? "SCHEDULED"}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option><Translate text={"SCHEDULED"} /></option>
                  <option><Translate text={"IN_PROGRESS"} /></option>
                  <option><Translate text={"COMPLETED"} /></option>
                  <option><Translate text={"CANCELLED"} /></option>
                </select>
              </label>
            )}
            <label>
              <Translate text={"Branch"} /><select
                value={form.branchId ?? ""}
                onChange={(e) => update("branchId", e.target.value)}
              >
                <option value=""><Translate text={"Select branch"} /></option>
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
              <Translate text={"Route"} /><select
                value={form.routeId ?? ""}
                onChange={(e) => update("routeId", e.target.value)}
              >
                <option value=""><Translate text={"Select route"} /></option>
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
              <Translate text={"Bus"} /><select
                value={form.busId ?? ""}
                onChange={(e) => update("busId", e.target.value)}
              >
                <option value=""><Translate text={"Select active bus"} /></option>
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
              <Translate text={"Driver"} /><select
                value={form.driverId ?? ""}
                onChange={(e) => update("driverId", e.target.value)}
              >
                <option value=""><Translate text={"Select active driver"} /></option>
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
              <Translate text={"Travel date"} /><input
                type="date"
                value={form.travelDate ?? ""}
                onChange={(e) => update("travelDate", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Departure"} /><input
                type="datetime-local"
                value={form.departureTime ?? ""}
                onChange={(e) => update("departureTime", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Arrival"} /><input
                type="datetime-local"
                value={form.arrivalTime ?? ""}
                onChange={(e) => update("arrivalTime", e.target.value)}
              />
            </label>
          </div>
          {!editingId && <section className="trip-style-370"><label className="trip-style-370-2"><input type="checkbox" checked={repeatWeekly} onChange={(event) => { setRepeatWeekly(event.target.checked); setRecurrencePreview([]); }} /><Translate text={"Repeat weekly"} /></label>{repeatWeekly && <div className="trip-style-370-3"><label><Translate text={"Repeat until"} /><input type="date" min={form.travelDate} value={repeatEndDate} onChange={(event) => { setRepeatEndDate(event.target.value); setRecurrencePreview([]); }} /></label><fieldset><legend className="trip-style-370-4"><Translate text={"Days of week"} /></legend><div className="trip-style-370-5">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label className="trip-style-370-6" key={day}><input type="checkbox" checked={weekdays.includes(index)} onChange={(event) => { setWeekdays((current) => event.target.checked ? [...current, index].sort() : current.filter((value) => value !== index)); setRecurrencePreview([]); }} />{day}</label>)}</div></fieldset>{recurrencePreview.length > 0 && <div className="trip-style-370-7"><strong>{recurrencePreview.filter((item) => item.create).length} <Translate text={"trips can be created ·"} />{" "}{recurrencePreview.filter((item) => !item.create).length} <Translate text={"skipped"} /></strong><ul className="trip-style-370-8">{recurrencePreview.map((item) => <li key={item.date} className={item.create ? "trip-style-370-9" : "trip-style-370-10"}>{item.date} · {item.tripCode}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ul><Button className="trip-style-370-11" onClick={() => void generateRecurring()} disabled={saving}><Translate text={"Create valid trips"} /></Button></div>}</div>}</section>}
          <div className="trip-style-371">
            <Button onClick={() => void save()} disabled={saving}>
              <Save size={15} />
              <LocalizedValue value={saving ? "Saving..." : editingId ? "Save changes" : repeatWeekly ? "Preview weekly trips" : "Save trip"} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              <X size={15} /> <Translate text={"Cancel"} /></Button>
          </div>
        </Card>
      )}
      {message && <div className="state-message" role="status"><strong><LocalizedValue value={message} /></strong></div>}
      {error && (
        <div className={cn("state-message state-error")}>
          <strong>{error}</strong>
        </div>
      )}
      <Card className={cn("management-card")}>
        <div className={cn("management-toolbar")}>
          <label className={cn("search-field")}>
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
            <option value=""><Translate text={"All statuses"} /></option>
            <option value="SCHEDULED"><Translate text={"SCHEDULED"} /></option>
            <option value="IN_PROGRESS"><Translate text={"IN_PROGRESS"} /></option>
            <option value="COMPLETED"><Translate text={"COMPLETED"} /></option>
            <option value="CANCELLED"><Translate text={"CANCELLED"} /></option>
          </select>
          {can("create") && <Button onClick={() => { setEditingId(null); setForm({}); setRepeatWeekly(false); setRepeatEndDate(""); setWeekdays([]); setRecurrencePreview([]); setOpen((value) => !value); }}><Plus size={16} /> <Translate text={"Add trip"} /></Button>}
        </div>
        {loading ? (
          <div className={cn("state-message")}><Translate text={"Loading trips..."} /></div>
        ) : trips.length === 0 ? (
          <div className={cn("state-message")}>
            <strong><Translate text={"No trips found"} /></strong>
            <span><Translate text={"Schedule a trip or adjust the filters."} /></span>
          </div>
        ) : (
          <div className="trip-directory">
            {trips.map((trip) => <article className="trip-directory-card" key={trip.id}>
              <div className="trip-directory-visual">{trip.bus.photos?.[0] ? <img src={trip.bus.photos[0]} alt={`${trip.bus.busNumber} bus`} loading="lazy" /> : <BusFront size={48} strokeWidth={1.3} aria-hidden="true" />}</div>
              <div className="trip-directory-content">
                <div className="trip-directory-head"><span className="journey-code">{trip.tripCode}</span><Badge>{trip.status.replaceAll("_", " ")}</Badge></div>
                <h3><Link href={`/dashboard/trips/${trip.id}`}>{trip.route.source} <span aria-hidden="true">→</span> {trip.route.destination}</Link></h3>
                <p>{trip.route.name}</p>
                <div className="trip-directory-meta"><span><CalendarDays size={15} />{new Date(trip.travelDate).toLocaleDateString(formattingLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span><span><Clock3 size={15} />{new Date(trip.departureTime).toLocaleTimeString(formattingLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} – {new Date(trip.arrivalTime).toLocaleTimeString(formattingLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span><span><MapPin size={15} />{trip.branch.name}</span></div>
                <div className="trip-directory-footer"><span><BusFront size={15} />{trip.bus.busNumber}</span><span><Users size={15} />{trip.driver.firstName} {trip.driver.lastName}</span><span>₹{Number(trip.fare).toLocaleString(formattingLocale)}</span></div>
              </div>
              <div className="trip-directory-actions"><Link className="button button-secondary" href={`/dashboard/trips/${trip.id}`}><Translate text="View trip" /> <ArrowRight size={15} /></Link>{can("update") && <button className="button button-ghost" onClick={() => editTrip(trip)}><Pencil size={15} /> <Translate text="Edit" /></button>}{can("cancel") && <button className="button button-ghost" disabled={trip.status === "CANCELLED"} onClick={() => void cancelTrip(trip.id).then(load).catch((cause) => setError(cause instanceof Error ? cause.message : localizeText("Unable to cancel trip")))}><Ban size={15} /> <Translate text="Cancel trip" /></button>}</div>
            </article>)}
          </div>
        )}
        <div className={cn("management-toolbar")}>
          <span>
            <Translate text={"Page"} />{" "}{page} <Translate text={"of"} />{" "}{pages}
          </span>
          <div className="trip-style-514">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={15} /> <Translate text={"Previous"} /></Button>
            <Button
              variant="secondary"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              <Translate text={"Next"} />{" "}<ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
