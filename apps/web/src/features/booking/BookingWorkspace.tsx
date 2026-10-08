"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import {
  formatDecimal,
  getFormattingLocale,
  useFormatDecimal,
  useFormattingLocale,
} from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import "../../styles/booking.css";

import { cn } from "../../lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bus,
  Clock3,
  Lock,
  Search,
  Ticket,
  Unlock,
} from "lucide-react";
import { useConfirmation } from "../../ui/ConfirmationModal";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { UpcomingTrips } from "../management/UpcomingTrips";
import {
  BookingPassengerInput,
  BookingRecord,
  BookingTrip,
  SeatAvailability,
  type Trip,
  confirmBooking,
  createSeatHold,
  getSeatAvailability,
  getBookingByPnr,
  releaseSeatHold,
  searchBookingTrips,
} from "../auth/services/api-client";
import { TicketLookup } from "./TicketLookup";
import { TicketView } from "./TicketView";
import { TicketExportMenu } from "./TicketExportMenu";
import { BookingHistory } from "./BookingHistory";

type Passenger = BookingPassengerInput;
type Hold = { holdToken: string; expiresAt: string };
const today = new Date().toISOString().slice(0, 10);
const emptyPassenger = (seatName: string): Passenger => ({
  seatName,
  firstName: "",
  lastName: "",
  age: 18,
  gender: "",
  phone: "",
  email: "",
  documentType: "",
  documentReference: "",
});

export function BookingWorkspace({
  hideHistory = false,
}: {
  hideHistory?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirmation();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(today);
  const [trips, setTrips] = useState<BookingTrip[]>([]);
  const [availability, setAvailability] = useState<SeatAvailability | null>(
    null,
  );
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hold, setHold] = useState<Hold | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [boardingStopId, setBoardingStopId] = useState("");
  const [dropOffStopId, setDropOffStopId] = useState("");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const availabilityTripId = availability?.trip.id;

  useEffect(() => {
    const pnr = new URLSearchParams(window.location.search).get("pnr");
    if (!pnr) return;
    void getBookingByPnr(pnr)
      .then(setBooking)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : localizeText("Unable to load booking"),
        ),
      );
  }, []);

  const loadAvailability = useCallback(async (tripId: string) => {
    try {
      setAvailability(await getSeatAvailability(tripId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to refresh seat availability"),
      );
    }
  }, []);
  useEffect(() => {
    if (!availabilityTripId) return;
    const timer = window.setInterval(
      () => void loadAvailability(availabilityTripId),
      4000,
    );
    return () => window.clearInterval(timer);
  }, [availabilityTripId, loadAvailability]);
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (!left) {
        setHold(null);
        setSelectedSeats([]);
        setPassengers([]);
        setError(
          localizeText("Your seat hold expired. Select the seats again."),
        );
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);
  async function search() {
    setError("");
    setLoading(true);
    setAvailability(null);
    setHold(null);
    setBooking(null);
    setSelectedSeats([]);
    try {
      setTrips(
        await searchBookingTrips({
          source: source.trim(),
          destination: destination.trim(),
          date,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to find trips"),
      );
    } finally {
      setLoading(false);
    }
  }
  async function chooseTrip(trip: BookingTrip) {
    setError("");
    setSelectedSeats([]);
    setHold(null);
    setBooking(null);
    try {
      const data = await getSeatAvailability(trip.id);
      setAvailability(data);
      setDiscountType(data.discountCap.type);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load trip"),
      );
    }
  }
  function toggleSeat(name: string) {
    if (hold) return;
    setSelectedSeats((current) =>
      current.includes(name)
        ? current.filter((seat) => seat !== name)
        : [...current, name],
    );
  }
  async function lockSeats() {
    if (!availability || !selectedSeats.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await createSeatHold(availability.trip.id, selectedSeats);
      setHold(result);
      setPassengers(selectedSeats.map(emptyPassenger));
      setIdempotencyKey(crypto.randomUUID());
      const stops = availability.trip.route.stops;
      setBoardingStopId(
        stops.find((stop) =>
          stop.points.some(
            (p) => p.pointType === "BOARDING" || p.pointType === "BOTH",
          ),
        )?.id ?? "",
      );
      setDropOffStopId(
        [...stops]
          .reverse()
          .find((stop) =>
            stop.points.some(
              (p) => p.pointType === "DROP_OFF" || p.pointType === "BOTH",
            ),
          )?.id ?? "",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to lock seats"),
      );
      await loadAvailability(availability.trip.id);
    } finally {
      setSaving(false);
    }
  }
  async function cancelHold() {
    if (
      !(await confirm({
        title: "Release held seats?",
        description:
          "Release the selected seats and clear the passenger information entered for this hold.",
        confirmLabel: "Release seats",
      }))
    )
      return;
    if (hold) await releaseSeatHold(hold.holdToken).catch(() => undefined);
    setHold(null);
    setSelectedSeats([]);
    setPassengers([]);
    if (availability) await loadAvailability(availability.trip.id);
  }
  async function submit() {
    if (!availability || !hold || saving) return;
    if (
      !(await confirm({
        title: "Confirm booking?",
        description: `${availability.trip.route.source} → ${availability.trip.route.destination} · ${date} · Seats ${selectedSeats.join(", ")} · ${passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}. Confirm to reserve these seats and issue the ticket. Payment is collected separately.`,
        confirmLabel: "Confirm booking",
        destructive: false,
      }))
    )
      return;
    if (new Date(hold.expiresAt).getTime() <= Date.now()) {
      setError(localizeText("Your seat hold expired. Select the seats again."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await confirmBooking({
        tripId: availability.trip.id,
        holdToken: hold.holdToken,
        idempotencyKey,
        boardingStopId,
        dropOffStopId,
        ...(discountValue > 0 ? { discountType, discountValue } : {}),
        passengers,
      });
      setBooking(result);
      router.push(
        `/dashboard/bookings/${encodeURIComponent(result.pnr)}?confirmed=1`,
      );
      setHold(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to confirm booking"),
      );
    } finally {
      setSaving(false);
    }
  }
  const points = availability?.trip.route.stops ?? [];
  const boardingSequence = points.find(
    (stop) => stop.id === boardingStopId,
  )?.sequence;
  const dropOffSequence = points.find(
    (stop) => stop.id === dropOffStopId,
  )?.sequence;
  const cap = availability?.discountCap;
  const baseFare =
    Number(availability?.trip.fare ?? 0) * Math.max(1, selectedSeats.length);
  const discount =
    discountType === "PERCENTAGE"
      ? (baseFare * discountValue) / 100
      : discountValue;

  if (booking)
    return (
      <>
        <PageHeader
          title="Ticket details"
          description="Review the journey, passengers and current booking status."
          action={<TicketExportMenu booking={booking} />}
        />
        <TicketView booking={booking} />
        <Link className="button button-secondary" href="/dashboard/bookings">
          Back to bookings
        </Link>
      </>
    );

  return (
    <>
      <PageHeader
        title="Agent bookings"
        description="Search scheduled trips, reserve seats, and issue a passenger ticket."
      />
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      <TicketLookup />
      <Card className={cn("management-form")}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <div className={cn("form-grid")}>
            <label>
              <Translate text={"From"} />
              <input
                value={source}
                required
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source city"
              />
            </label>
            <label>
              <Translate text={"To"} />
              <input
                value={destination}
                required
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination city"
              />
            </label>
            <label>
              <Translate text={"Travel date"} />
              <input
                type="date"
                min={today}
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <Button
            type="submit"
            disabled={loading || !source.trim() || !destination.trim()}
          >
            <Search size={16} />{" "}
            <LocalizedValue value={loading ? "Searching..." : "Search buses"} />
          </Button>
        </form>
      </Card>
      {trips.length > 0 && (
        <Card className={cn("management-card")}>
          <h2>
            <Translate text={"Available buses"} />
          </h2>
          {trips.map((trip) => (
            <div className={cn("setup-row")} key={trip.id}>
              <Bus size={19} />
              <div>
                <strong>
                  {trip.route.source} → {trip.route.destination} ·{" "}
                  {trip.bus.busNumber}
                </strong>
                <span>
                  {new Date(trip.departureTime).toLocaleTimeString(
                    getFormattingLocale(),
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}{" "}
                  · {trip.bus.busType} · {trip.availableSeats}{" "}
                  <Translate text={"seats · ₹"} />
                  {formatDecimal(Number(trip.fare))}{" "}
                  <Translate text={"/ seat"} />
                </span>
              </div>
              <Button variant="secondary" onClick={() => void chooseTrip(trip)}>
                <Translate text={"Select bus"} /> <ArrowRight size={15} />
              </Button>
            </div>
          ))}
        </Card>
      )}
      {availability && (
        <Card className={cn("seat-layout-card")}>
          <div className={cn("card-heading")}>
            <div>
              <p className={cn("eyebrow")}>{availability.trip.tripCode}</p>
              <h2>
                <Translate text={"Select seats"} />
              </h2>
            </div>
            <Badge>{availability.trip.bus.busType}</Badge>
          </div>
          <p className={cn("muted booking-seat-help")}>
            <Translate
              text={
                "Seat labels show the berth type and any passenger eligibility. Check these before assigning passengers."
              }
            />
          </p>
          <div
            className={cn("seat-grid")}
            role="group"
            aria-label={"Seat selection for " + availability.trip.tripCode}
            style={{
              gridTemplateColumns: `repeat(${availability.columns}, minmax(44px, 1fr))`,
            }}
          >
            {availability.seats.map((seat) => {
              const unavailable =
                seat.status !== "AVAILABLE" &&
                !selectedSeats.includes(seat.name);
              const selected = selectedSeats.includes(seat.name);
              return (
                <button
                  key={seat.name}
                  type="button"
                  disabled={unavailable || !!hold}
                  aria-pressed={selected}
                  aria-label={
                    "Seat " +
                    seat.name +
                    ", " +
                    (unavailable
                      ? "unavailable"
                      : selected
                        ? "selected"
                        : "available")
                  }
                  className={cn(
                    `seat-button seat-${seat.type.toLowerCase().replaceAll("_", "-")} ${unavailable ? "seat-unavailable" : ""} ${selected ? "seat-selected" : ""}`,
                  )}
                  onClick={() => toggleSeat(seat.name)}
                >
                  <b>{unavailable ? "×" : selected ? "✓" : seat.name}</b>
                  <small>
                    {seat.type
                      .replaceAll("_", " ")
                      .toLowerCase()
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </small>
                  {seat.restriction !== "ALL" && (
                    <small className={cn("booking-seat-restriction")}>
                      <LocalizedValue
                        value={
                          seat.restriction === "SENIOR"
                            ? "Senior only"
                            : `${seat.restriction.toLowerCase()} only`
                        }
                      />
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className={cn("seat-legend")}>
            <span>
              <i /> <Translate text={"Available"} />
            </span>
            <span>
              <i className={cn("seat-legend-unavailable")} />{" "}
              <Translate text={"Held or booked"} />
            </span>
            <span className={cn("booking-seat-restriction")}>
              <Translate text={"Female only"} />
            </span>
            <span className={cn("booking-seat-restriction booking-senior")}>
              <Translate text={"Senior only"} />
            </span>
            <span>
              <Translate text={"Selected:"} />{" "}
              {selectedSeats.join(", ") || "none"}
            </span>
          </div>
          {!hold && (
            <Button
              onClick={() => void lockSeats()}
              disabled={!selectedSeats.length || saving}
            >
              <Lock size={15} />{" "}
              <LocalizedValue
                value={
                  saving
                    ? "Locking seats..."
                    : "Lock selected seats for 10 minutes"
                }
              />
            </Button>
          )}
        </Card>
      )}
      {hold && availability && (
        <Card className={cn("management-form")}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className={cn("card-heading")}>
              <div>
                <p className={cn("eyebrow")}>
                  <Translate text={"Seat hold active"} />
                </p>
                <h2>
                  <Clock3 size={18} />{" "}
                  <span role="timer" aria-live="off">
                    {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, "0")}
                  </span>{" "}
                  <Translate text={"remaining"} />
                </h2>
              </div>
              <Button variant="secondary" onClick={() => void cancelHold()}>
                <Unlock size={15} /> <Translate text={"Release seats"} />
              </Button>
            </div>
            <div className={cn("form-grid")}>
              <label>
                <Translate text={"Boarding point"} />
                <select
                  required
                  value={boardingStopId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const nextSequence = points.find(
                      (stop) => stop.id === nextId,
                    )?.sequence;
                    if (
                      nextSequence !== undefined &&
                      dropOffSequence !== undefined &&
                      nextSequence >= dropOffSequence
                    )
                      setDropOffStopId("");
                    setBoardingStopId(nextId);
                  }}
                >
                  <option value="">
                    <Translate text={"Select boarding"} />
                  </option>
                  {points
                    .filter(
                      (s) =>
                        s.points.some(
                          (p) =>
                            p.pointType === "BOARDING" ||
                            p.pointType === "BOTH",
                        ) &&
                        (dropOffSequence === undefined ||
                          s.sequence < dropOffSequence),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <Translate text={"Drop-off point"} />
                <select
                  required
                  value={dropOffStopId}
                  onChange={(e) => setDropOffStopId(e.target.value)}
                >
                  <option value="">
                    <Translate text={"Select drop-off"} />
                  </option>
                  {points
                    .filter(
                      (s) =>
                        s.points.some(
                          (p) =>
                            p.pointType === "DROP_OFF" ||
                            p.pointType === "BOTH",
                        ) &&
                        (boardingSequence === undefined ||
                          s.sequence > boardingSequence),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <h3>
              <Translate text={"Passenger details"} />
            </h3>
            {passengers.map((passenger, index) => (
              <div
                className={cn("form-grid passenger-form")}
                key={passenger.seatName}
              >
                <strong>
                  <Translate text={"Seat"} /> {passenger.seatName}
                </strong>
                {(
                  [
                    "firstName",
                    "lastName",
                    "age",
                    "gender",
                    "phone",
                    "email",
                    "documentType",
                    "documentReference",
                  ] as const
                ).map((field) => (
                  <label key={field}>
                    <LocalizedValue
                      value={
                        field === "documentReference"
                          ? "Document reference"
                          : field === "documentType"
                            ? "Document type"
                            : field[0].toUpperCase() + field.slice(1)
                      }
                    />
                    {field === "gender" ? (
                      <select
                        required
                        value={passenger.gender}
                        onChange={(e) =>
                          setPassengers((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, gender: e.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">
                          <Translate text={"Select gender"} />
                        </option>
                        <option value="Female">
                          <Translate text={"Female"} />
                        </option>
                        <option value="Male">
                          <Translate text={"Male"} />
                        </option>
                        <option value="Other">
                          <Translate text={"Other"} />
                        </option>
                      </select>
                    ) : field === "documentType" ? (
                      <select
                        value={passenger.documentType ?? ""}
                        onChange={(e) =>
                          setPassengers((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, documentType: e.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">
                          <Translate text={"No document"} />
                        </option>
                        <option value="National ID">
                          <Translate text={"National ID"} />
                        </option>
                        <option value="Passport">
                          <Translate text={"Passport"} />
                        </option>
                        <option value="Other">
                          <Translate text={"Other"} />
                        </option>
                      </select>
                    ) : (
                      <input
                        type={
                          field === "age"
                            ? "number"
                            : field === "email"
                              ? "email"
                              : field === "phone"
                                ? "tel"
                                : "text"
                        }
                        min={field === "age" ? 0 : undefined}
                        max={field === "age" ? 120 : undefined}
                        pattern={
                          field === "phone" ? "[+]?[0-9 ()-]{7,20}" : undefined
                        }
                        required={[
                          "firstName",
                          "lastName",
                          "age",
                          "phone",
                        ].includes(field)}
                        autoComplete={
                          field === "firstName" ||
                          field === "lastName" ||
                          field === "email" ||
                          field === "phone"
                            ? field
                            : undefined
                        }
                        value={passenger[field] ?? ""}
                        onChange={(e) =>
                          setPassengers((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    [field]:
                                      field === "age"
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            ))}
            <div className={cn("form-grid")}>
              <label>
                <Translate text={"Discount type"} />
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as "FIXED" | "PERCENTAGE")
                  }
                >
                  <option value={cap?.type ?? "PERCENTAGE"}>
                    <LocalizedValue
                      value={
                        cap?.type === "FIXED" ? "Fixed amount" : "Percentage"
                      }
                    />
                  </option>
                </select>
              </label>
              <label>
                <Translate text={"Discount"} />{" "}
                {discountType === "PERCENTAGE" ? "%" : "₹"}{" "}
                <Translate text={"(cap"} />{" "}
                {cap?.type === discountType ? cap.value : 0})
                <input
                  type="number"
                  min="0"
                  max={cap?.type === discountType ? cap.value : 0}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="booking-review">
              <h3>
                <Translate text="Review your booking" />
              </h3>
              <p>
                {availability.trip.route.source} →{" "}
                {availability.trip.route.destination} · {date}
              </p>
              <p>
                <Translate text="Selected:" /> {selectedSeats.join(", ")}
              </p>
              <p>
                <strong>
                  <Translate text={"Fare:"} />
                </strong>{" "}
                ₹{formatDecimal(baseFare)} ·{" "}
                <strong>
                  <Translate text={"Discount:"} />
                </strong>{" "}
                ₹{formatDecimal(discount)} ·{" "}
                <strong>
                  <Translate text={"Total:"} />
                </strong>{" "}
                ₹{formatDecimal(Math.max(0, baseFare - discount))}
              </p>
              <p className="muted">
                <Translate text="Applicable taxes are calculated when the booking is confirmed." />
              </p>
            </div>
            <p className={cn("muted")}>
              <strong>
                <Translate text={"Payment methods:"} />
              </strong>{" "}
              <Translate
                text={
                  "Cash, bank transfer, card, UPI, or other. Payment is collected offline and recorded in Finance; no online charge is made at checkout."
                }
              />
            </p>
            <Button
              type="submit"
              disabled={
                saving ||
                discountValue > (cap?.type === discountType ? cap.value : 0)
              }
            >
              <LocalizedValue
                value={
                  saving ? (
                    "Confirming..."
                  ) : (
                    <>
                      <Ticket size={15} />{" "}
                      <Translate text={"Confirm booking and issue ticket"} />
                    </>
                  )
                }
              />
            </Button>
          </form>
        </Card>
      )}
      {trips.length === 0 && !loading && (
        <p className={cn("muted")}>
          <Translate
            text={
              "Search by source, destination, and date to view available trips."
            }
          />
        </p>
      )}
      {!hideHistory && <BookingHistory />}
    </>
  );
}

export function AgentBookingsDashboard({
  summary,
  summaryError,
  trips,
  tripsError,
}: {
  summary: {
    todayBookings: number;
    todaySales: number;
    upcomingTrips: number;
  } | null;
  summaryError?: string;
  trips: Trip[];
  tripsError?: string;
}) {
  const formatDecimal = useFormatDecimal();
  const formattingLocale = useFormattingLocale();
  return (
    <>
      <PageHeader
        title="Agent dashboard"
        description="Find a scheduled trip and create a confirmed passenger booking."
      />
      {summaryError && (
        <div className={cn("state-message state-error")} role="alert">
          {summaryError}
        </div>
      )}
      <div className={cn("metric-grid metric-grid-three")}>
        <Card className={cn("metric-card")}>
          <p>
            <Translate text={"Bookings today"} />
          </p>
          <strong>
            {summary?.todayBookings.toLocaleString(formattingLocale) ?? "—"}
          </strong>
          <span>
            <Translate text={"Confirmed passenger bookings"} />
          </span>
        </Card>
        <Card className={cn("metric-card")}>
          <p>
            <Translate text={"Sales today"} />
          </p>
          <strong>
            {summary ? `₹${formatDecimal(summary.todaySales)}` : "—"}
          </strong>
          <span>
            <Translate text={"Confirmed booking value"} />
          </span>
        </Card>
        <Card className={cn("metric-card")}>
          <p>
            <Translate text={"Upcoming trips"} />
          </p>
          <strong>
            {summary?.upcomingTrips.toLocaleString(formattingLocale) ?? "—"}
          </strong>
          <span>
            <Translate text={"Scheduled departures ahead"} />
          </span>
        </Card>
      </div>
      <UpcomingTrips initialTrips={trips} initialError={tripsError} />
      <div className={cn("dashboard-grid")}>
        <Card className={cn("setup-card")}>
          <p className={cn("eyebrow")}>
            <Translate text={"Booking desk"} />
          </p>
          <h2>
            <Translate text={"Ready to book a trip?"} />
          </h2>
          <p className={cn("muted")}>
            <Translate
              text={
                "Search live scheduled trips, lock seats while you enter passenger details, and print the ticket with its PNR."
              }
            />
          </p>
          <Link
            className={cn("button button-primary")}
            href="/dashboard/bookings/new"
          >
            <Translate text={"Start booking"} /> <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
      <BookingHistory compact />
    </>
  );
}
