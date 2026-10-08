"use client";
import { DataTable } from "../../ui/DataTable";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { useFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";
import { useTranslations } from "../../i18n/LocaleProvider";

import "../../styles/transport.css";

import { cn } from "../../lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { EditRecordLink, RecordPage } from "../../ui/RecordPage";
import {
  useConfirmation,
  confirmStatusChange,
} from "../../ui/ConfirmationModal";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import "../../styles/experience.css";
import { useAuth } from "../auth/components/AuthProvider";
import {
  createTrip,
  createRecurringTrips,
  getBuses,
  getBranches,
  getAgencies,
  getDrivers,
  getRoutes,
  getTrips,
  getTrip,
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
  mode = "list",
  tripId,
}: {
  initialPage?: PageResult<Trip> | null;
  initialError?: string;
  mode?: "list" | "new" | "edit";
  tripId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const confirm = useConfirmation();
  const [originalStatus, setOriginalStatus] = useState<string>();
  const [optionsReady, setOptionsReady] = useState(false);
  const [recordReady, setRecordReady] = useState(!tripId);
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
  const [travelDateFilter, setTravelDateFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(initialPage?.meta.totalPages ?? 1);
  const [total, setTotal] = useState(initialPage?.meta.total ?? 0);
  const [open, setOpen] = useState(mode !== "list");
  const [editingId, setEditingId] = useState<string | null>(tripId ?? null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(initialPage === undefined);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const skipInitialLoad = useRef(initialPage !== undefined);
  const [form, setForm] = useState<Record<string, string>>({});
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [recurrencePreview, setRecurrencePreview] = useState<
    Awaited<ReturnType<typeof previewRecurringTrips>>
  >([]);
  const update = (key: string, value: string) => {
    setRecurrencePreview([]);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const can = (action: string) =>
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(`trip:${action}`);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getTrips({
        page: String(page),
        search,
        status,
        travelDate: travelDateFilter,
        routeId: routeFilter,
      });
      setTrips(result.data);
      setPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load trips"),
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, travelDateFilter, routeFilter]);
  useEffect(() => {
    if (mode !== "list") return;
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, mode]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        getRoutes({ limit: "100", status: tripId ? "" : "ACTIVE" }),
        getBuses({ limit: "100", status: tripId ? "" : "ACTIVE" }),
        getDrivers({ limit: "100", status: tripId ? "" : "ACTIVE" }),
        user?.agencyId
          ? getBranches(user.agencyId)
          : user?.role === "SUPER_ADMIN"
            ? getAgencies().then((rows) => {
                const values = rows as { id: string; name: string }[];
                setAgencies(values);
                if (!tripId) update("agencyId", values[0]?.id ?? "");
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
          setOptionsReady(true);
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
  }, [tripId, user?.agencyId, user?.role]);
  async function save() {
    if (!can(editingId ? "update" : "create") || !optionsReady || !recordReady)
      return;
    const required = [
      [form.tripCode, "Trip code"],
      [form.branchId, "Branch"],
      [form.routeId, "Route"],
      [form.busId, "Bus"],
      [form.driverId, "Driver"],
      [form.travelDate, "Travel date"],
      [form.departureTime, "Departure"],
      [form.arrivalTime, "Arrival"],
    ] as const;
    const missing = required.find(([value]) => !value?.trim());
    if (missing) {
      setError(`${missing[1]} is required.`);
      return;
    }
    if (user?.role === "SUPER_ADMIN" && !form.agencyId) {
      setError(localizeText("Agency is required."));
      return;
    }
    if (
      !Number.isFinite(Number(form.fare ?? "0")) ||
      Number(form.fare ?? "0") < 0
    ) {
      setError(localizeText("Fare must be zero or greater."));
      return;
    }
    if (new Date(form.arrivalTime) <= new Date(form.departureTime)) {
      setError(localizeText("Arrival must be after departure."));
      return;
    }
    if (
      !(await confirmStatusChange(
        confirm,
        form.tripCode ?? "Trip",
        originalStatus,
        form.status,
      ))
    )
      return;
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
      let savedId = editingId;
      if (editingId) await updateTrip(editingId, payload);
      else if (repeatWeekly) {
        const schedule = recurrencePayload();
        const preview = await previewRecurringTrips(schedule);
        setRecurrencePreview(preview);
        setSaving(false);
        return;
      } else savedId = (await createTrip(payload)).id;
      router.push(`/dashboard/trips/${savedId}`);
      router.refresh();
      setForm({});
      setOpen(false);
      setEditingId(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to save trip"),
      );
    } finally {
      setSaving(false);
    }
  }
  function recurrencePayload(): RecurringTripInput {
    return {
      agencyId: user?.agencyId ?? form.agencyId,
      branchId: form.branchId ?? "",
      routeId: form.routeId ?? "",
      busId: form.busId ?? "",
      driverId: form.driverId ?? "",
      tripCode: form.tripCode ?? "",
      startDate: form.travelDate ?? "",
      endDate: repeatEndDate,
      weekdays,
      departureTime: new Date(form.departureTime ?? "").toISOString(),
      arrivalTime: new Date(form.arrivalTime ?? "").toISOString(),
      fare: Number(form.fare ?? 0),
    };
  }
  async function generateRecurring() {
    if (
      saving ||
      !(await confirm({
        title: "Generate recurring trips?",
        description:
          "Create all available trips in the reviewed schedule. Existing trips will be skipped.",
        confirmLabel: "Generate trips",
        destructive: false,
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      const result = await createRecurringTrips(recurrencePayload());
      setMessage(
        `${result.created.length} ${t("trips created")}; ${result.skipped.length} ${t("skipped")}. ${result.skipped
          .slice(0, 3)
          .map((item) => `${item.date}: ${item.reason}`)
          .join(" · ")}`,
      );
      setForm({});
      setOpen(false);
      setRepeatWeekly(false);
      setRecurrencePreview([]);
      router.push("/dashboard/trips");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to generate recurring trips"),
      );
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (!tripId) return;
    let active = true;
    void getTrip(tripId)
      .then((trip) => {
        if (!active) return;
        const localDate = (value: string) => {
          const date = new Date(value);
          date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
          return date.toISOString().slice(0, 16);
        };
        setOriginalStatus(trip.status);
        setForm({
          tripCode: trip.tripCode,
          agencyId:
            (trip as Trip & { agencyId?: string }).agencyId ??
            user?.agencyId ??
            "",
          branchId: trip.branch.id,
          routeId: trip.route.id,
          busId: trip.bus.id,
          driverId: trip.driver.id,
          travelDate: trip.travelDate.slice(0, 10),
          departureTime: localDate(trip.departureTime),
          arrivalTime: localDate(trip.arrivalTime),
          status: trip.status,
          fare: String(trip.fare),
        });
        setRecordReady(true);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load trip",
          );
      });
    return () => {
      active = false;
    };
  }, [tripId, user?.agencyId]);
  const content = (
    <>
      {mode === "list" && (
        <PageHeader
          title="Trips"
          description="Schedule reusable routes with active buses and drivers."
        />
      )}
      {open && can(editingId ? "update" : "create") && recordReady && (
        <Card className="record-section record-form">
          <div className={cn("card-heading")}>
            <div>
              <p className={cn("eyebrow")}>
                <LocalizedValue
                  value={editingId ? "Update schedule" : "New schedule"}
                />
              </p>
              <h2>
                <LocalizedValue
                  value={editingId ? "Edit trip" : "Create trip"}
                />
              </h2>
            </div>
          </div>
          <div className="record-form-grid">
            {user?.role === "SUPER_ADMIN" && (
              <label>
                <Translate text={"Agency"} />
                <select
                  value={form.agencyId ?? ""}
                  onChange={(e) => {
                    update("agencyId", e.target.value);
                    update("branchId", "");
                  }}
                >
                  <option value="">
                    <Translate text={"Select agency"} />
                  </option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <Translate text={"Trip code"} />
              <input
                value={form.tripCode ?? ""}
                onChange={(e) => update("tripCode", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Fare per seat (INR)"} />
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
                <Translate text={"Status"} />
                <select
                  value={form.status ?? "SCHEDULED"}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option>
                    <Translate text={"SCHEDULED"} />
                  </option>
                  <option>
                    <Translate text={"IN_PROGRESS"} />
                  </option>
                  <option>
                    <Translate text={"COMPLETED"} />
                  </option>
                  <option>
                    <Translate text={"CANCELLED"} />
                  </option>
                </select>
              </label>
            )}
            <label>
              <Translate text={"Branch"} />
              <select
                value={form.branchId ?? ""}
                onChange={(e) => update("branchId", e.target.value)}
              >
                <option value="">
                  <Translate text={"Select branch"} />
                </option>
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
              <Translate text={"Route"} />
              <select
                value={form.routeId ?? ""}
                onChange={(e) => update("routeId", e.target.value)}
              >
                <option value="">
                  <Translate text={"Select route"} />
                </option>
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
              <Translate text={"Bus"} />
              <select
                value={form.busId ?? ""}
                onChange={(e) => update("busId", e.target.value)}
              >
                <option value="">
                  <Translate text={"Select active bus"} />
                </option>
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
              <Translate text={"Driver"} />
              <select
                value={form.driverId ?? ""}
                onChange={(e) => update("driverId", e.target.value)}
              >
                <option value="">
                  <Translate text={"Select active driver"} />
                </option>
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
              <Translate text={"Travel date"} />
              <input
                type="date"
                value={form.travelDate ?? ""}
                onChange={(e) => update("travelDate", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Departure"} />
              <input
                type="datetime-local"
                value={form.departureTime ?? ""}
                onChange={(e) => update("departureTime", e.target.value)}
              />
            </label>
            <label>
              <Translate text={"Arrival"} />
              <input
                type="datetime-local"
                value={form.arrivalTime ?? ""}
                onChange={(e) => update("arrivalTime", e.target.value)}
              />
            </label>
          </div>
          {!editingId && (
            <section className="trip-style-370">
              <label className="trip-style-370-2">
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(event) => {
                    setRepeatWeekly(event.target.checked);
                    setRecurrencePreview([]);
                  }}
                />
                <Translate text={"Repeat weekly"} />
              </label>
              {repeatWeekly && (
                <div className="trip-style-370-3">
                  <label>
                    <Translate text={"Repeat until"} />
                    <input
                      type="date"
                      min={form.travelDate}
                      value={repeatEndDate}
                      onChange={(event) => {
                        setRepeatEndDate(event.target.value);
                        setRecurrencePreview([]);
                      }}
                    />
                  </label>
                  <fieldset>
                    <legend className="trip-style-370-4">
                      <Translate text={"Days of week"} />
                    </legend>
                    <div className="trip-style-370-5">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day, index) => (
                          <label className="trip-style-370-6" key={day}>
                            <input
                              type="checkbox"
                              checked={weekdays.includes(index)}
                              onChange={(event) => {
                                setWeekdays((current) =>
                                  event.target.checked
                                    ? [...current, index].sort()
                                    : current.filter(
                                        (value) => value !== index,
                                      ),
                                );
                                setRecurrencePreview([]);
                              }}
                            />
                            {day}
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                  {recurrencePreview.length > 0 && (
                    <div className="trip-style-370-7">
                      <strong>
                        {recurrencePreview.filter((item) => item.create).length}{" "}
                        <Translate text={"trips can be created ·"} />{" "}
                        {
                          recurrencePreview.filter((item) => !item.create)
                            .length
                        }{" "}
                        <Translate text={"skipped"} />
                      </strong>
                      <ul className="trip-style-370-8">
                        {recurrencePreview.map((item) => (
                          <li
                            key={item.date}
                            className={
                              item.create
                                ? "trip-style-370-9"
                                : "trip-style-370-10"
                            }
                          >
                            {item.date} · {item.tripCode}
                            {item.reason ? ` · ${item.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="trip-style-370-11"
                        onClick={() => void generateRecurring()}
                        disabled={saving}
                      >
                        <Translate text={"Create valid trips"} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
          <div className="trip-style-371">
            <Button
              onClick={() => void save()}
              disabled={saving || !optionsReady || !recordReady}
            >
              <Save size={15} />
              <LocalizedValue
                value={
                  saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : repeatWeekly
                        ? "Preview weekly trips"
                        : "Save trip"
                }
              />
            </Button>
            <Link
              className="button button-secondary"
              href={tripId ? `/dashboard/trips/${tripId}` : "/dashboard/trips"}
            >
              <Translate text="Cancel" />
            </Link>
          </div>
        </Card>
      )}
      {message && (
        <div className="state-message" role="status">
          <strong>
            <LocalizedValue value={message} />
          </strong>
        </div>
      )}
      {error && (
        <div className={cn("state-message state-error")}>
          <strong>{error}</strong>
        </div>
      )}
      {mode === "list" && (
        <DataTable
          title="Trips"
          data={trips}
          rowKey={(trip) => trip.id}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search trip code or route"
          filters={[
            {
              id: "status",
              label: "Status",
              value: status,
              onChange: setStatus,
              options: [
                "SCHEDULED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") })),
            },
            {
              id: "date",
              label: "Travel date",
              type: "date",
              value: travelDateFilter,
              onChange: setTravelDateFilter,
            },
            {
              id: "route",
              label: "Route",
              value: routeFilter,
              onChange: setRouteFilter,
              options: routes.map((route) => ({
                value: route.id,
                label: route.name,
              })),
            },
          ]}
          pagination={{
            page,
            pageSize: initialPage?.meta.limit ?? 20,
            total,
            totalPages: pages,
            onPageChange: setPage,
          }}
          toolbarActions={
            can("create") && (
              <Link
                className="button button-primary"
                href="/dashboard/trips/new"
              >
                <Plus size={16} />
                <Translate text="Add trip" />
              </Link>
            )
          }
          columns={[
            {
              id: "code",
              header: "Trip",
              render: (trip) => (
                <Link
                  className="text-link"
                  href={`/dashboard/trips/${trip.id}`}
                >
                  <strong>{trip.tripCode}</strong>
                </Link>
              ),
            },
            {
              id: "route",
              header: "Route",
              render: (trip) => (
                <>
                  {trip.route.source} → {trip.route.destination}
                  <br />
                  <small>{trip.route.name}</small>
                </>
              ),
            },
            {
              id: "date",
              header: "Travel date",
              render: (trip) =>
                new Date(trip.travelDate).toLocaleDateString(formattingLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }),
            },
            {
              id: "time",
              header: "Departure / arrival",
              render: (trip) =>
                `${new Date(trip.departureTime).toLocaleTimeString(formattingLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} – ${new Date(trip.arrivalTime).toLocaleTimeString(formattingLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`,
            },
            { id: "bus", header: "Bus", render: (trip) => trip.bus.busNumber },
            {
              id: "driver",
              header: "Driver",
              render: (trip) =>
                `${trip.driver.firstName} ${trip.driver.lastName}`,
            },
            {
              id: "branch",
              header: "Branch",
              render: (trip) => trip.branch.name,
            },
            {
              id: "fare",
              header: "Fare",
              render: (trip) =>
                `₹${Number(trip.fare).toLocaleString(formattingLocale)}`,
            },
            {
              id: "status",
              header: "Status",
              render: (trip) => (
                <Badge>{trip.status.replaceAll("_", " ")}</Badge>
              ),
            },
            {
              id: "actions",
              header: "Actions",
              render: (trip) =>
                can("update") ? (
                  <EditRecordLink href={`/dashboard/trips/${trip.id}/edit`} />
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}
      {mode !== "list" && !can(editingId ? "update" : "create") && (
        <div className="state-message">
          {t("You do not have permission to change this record.")}
        </div>
      )}
      {mode === "edit" && !recordReady && !error && (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      )}
    </>
  );
  return mode === "list" ? (
    content
  ) : (
    <RecordPage
      title={mode === "edit" ? "Edit trip" : "Create trip"}
      description="Choose the route, crew and departure schedule for this trip."
      backHref={tripId ? `/dashboard/trips/${tripId}` : "/dashboard/trips"}
      backLabel={tripId ? "Back to details" : "Back to list"}
      eyebrow={mode === "edit" ? "Edit schedule" : "New schedule"}
    >
      {content}
    </RecordPage>
  );
}
