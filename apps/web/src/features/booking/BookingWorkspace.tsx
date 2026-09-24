"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bus, Clock3, Printer, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import {
  BookingPassengerInput,
  BookingRecord,
  BookingTrip,
  SeatAvailability,
  confirmBooking,
  createSeatHold,
  getSeatAvailability,
  getBookingByPnr,
  getBookingDashboardSummary,
  releaseSeatHold,
  searchBookingTrips,
} from "../auth/services/api-client";
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

export function BookingWorkspace() {
  const [source, setSource] = useState("");
  const [lookupPnr, setLookupPnr] = useState("");
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

  const loadAvailability = useCallback(async (tripId: string) => {
    try {
      setAvailability(await getSeatAvailability(tripId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to refresh seat availability",
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
        setError("Your seat hold expired. Select the seats again.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pnr = new URLSearchParams(window.location.search).get("pnr");
      if (!pnr) return;
      setLookupPnr(pnr);
      void getBookingByPnr(pnr)
        .then(setBooking)
        .catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : "Unable to find this PNR",
          ),
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      setError(cause instanceof Error ? cause.message : "Unable to find trips");
    } finally {
      setLoading(false);
    }
  }
  async function lookupTicket() {
    setError("");
    try {
      setBooking(await getBookingByPnr(lookupPnr.trim()));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to find this PNR",
      );
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
      setError(cause instanceof Error ? cause.message : "Unable to load trip");
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
      setError(cause instanceof Error ? cause.message : "Unable to lock seats");
      await loadAvailability(availability.trip.id);
    } finally {
      setSaving(false);
    }
  }
  async function cancelHold() {
    if (hold) await releaseSeatHold(hold.holdToken).catch(() => undefined);
    setHold(null);
    setSelectedSeats([]);
    setPassengers([]);
    if (availability) await loadAvailability(availability.trip.id);
  }
  async function submit() {
    if (!availability || !hold) return;
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
      setHold(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to confirm booking",
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
          title="Booking confirmed"
          description="The seats are booked and the ticket is ready to print."
          action={
            <Button onClick={() => window.print()}>
              <Printer size={16} /> Print ticket
            </Button>
          }
        />
        <div id="printable-ticket">
          <Card className="ticket-card">
            <p className="eyebrow">A-One Tours & Travels · E-ticket</p>
            <div className="card-heading">
              <div>
                <h2>PNR {booking.pnr}</h2>
                <p>
                  {booking.trip.tripCode} · {booking.trip.route.source} to{" "}
                  {booking.trip.route.destination}
                </p>
              </div>
              <Badge>CONFIRMED</Badge>
            </div>
            <div className="form-grid">
              <p>
                <strong>Travel date</strong>
                <br />
                {new Date(booking.trip.travelDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Departure</strong>
                <br />
                {new Date(booking.trip.departureTime).toLocaleString()}
              </p>
              <p>
                <strong>Bus</strong>
                <br />
                {booking.trip.bus.busNumber}
              </p>
              <p>
                <strong>Boarding</strong>
                <br />
                {booking.boardingStop.name}
              </p>
              <p>
                <strong>Drop-off</strong>
                <br />
                {booking.dropOffStop.name}
              </p>
              <p>
                <strong>Total</strong>
                <br />
                {booking.currency} {Number(booking.totalAmount).toFixed(2)}
              </p>
            </div>
            <h3>Passengers</h3>
            {booking.passengers.map((p) => (
              <p key={p.seatName}>
                {p.firstName} {p.lastName} · Seat {p.seatName} · {p.phone}
              </p>
            ))}
            <p className="muted">Present this PNR at boarding.</p>
          </Card>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setBooking(null);
            setAvailability(null);
            setTrips([]);
          }}
        >
          Create another booking
        </Button>
      </>
    );

  return (
    <>
      <PageHeader
        title="Agent bookings"
        description="Search scheduled trips, reserve seats, and issue a passenger ticket."
      />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      <Card className="management-form">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void lookupTicket();
          }}
        >
          <div className="form-grid">
            <label>
              Look up an existing PNR
              <input
                value={lookupPnr}
                onChange={(e) => setLookupPnr(e.target.value)}
                placeholder="Enter PNR"
              />
            </label>
          </div>
          <Button
            variant="secondary"
            disabled={!lookupPnr.trim()}
            type="submit"
          >
            Find ticket
          </Button>
        </form>
      </Card>
      <Card className="management-form">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <div className="form-grid">
            <label>
              From
              <input
                value={source}
                required
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source city"
              />
            </label>
            <label>
              To
              <input
                value={destination}
                required
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination city"
              />
            </label>
            <label>
              Travel date
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
            <Search size={16} /> {loading ? "Searching..." : "Search buses"}
          </Button>
        </form>
      </Card>
      {trips.length > 0 && (
        <Card className="management-card">
          <h2>Available buses</h2>
          {trips.map((trip) => (
            <div className="setup-row" key={trip.id}>
              <Bus size={19} />
              <div>
                <strong>
                  {trip.route.source} → {trip.route.destination} ·{" "}
                  {trip.bus.busNumber}
                </strong>
                <span>
                  {new Date(trip.departureTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {trip.bus.busType} · {trip.availableSeats} seats · ₹
                  {Number(trip.fare).toFixed(2)} / seat
                </span>
              </div>
              <Button variant="secondary" onClick={() => void chooseTrip(trip)}>
                Select bus <ArrowRight size={15} />
              </Button>
            </div>
          ))}
        </Card>
      )}
      {availability && (
        <Card className="seat-layout-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">{availability.trip.tripCode}</p>
              <h2>Select seats</h2>
            </div>
            <Badge>{availability.trip.bus.busType}</Badge>
          </div>
          <div
            className="seat-grid"
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
                  className={`seat-button ${unavailable ? "seat-unavailable" : ""} ${selected ? "seat-selected" : ""}`}
                  onClick={() => toggleSeat(seat.name)}
                >
                  {unavailable ? "×" : selected ? "✓" : seat.name}
                </button>
              );
            })}
          </div>
          <div className="seat-legend">
            <span>
              <i /> Available
            </span>
            <span>
              <i className="seat-legend-unavailable" /> Held or booked
            </span>
            <span>Selected: {selectedSeats.join(", ") || "none"}</span>
          </div>
          {!hold && (
            <Button
              onClick={() => void lockSeats()}
              disabled={!selectedSeats.length || saving}
            >
              {saving
                ? "Locking seats..."
                : "Lock selected seats for 10 minutes"}
            </Button>
          )}
        </Card>
      )}
      {hold && availability && (
        <Card className="management-form">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="card-heading">
              <div>
                <p className="eyebrow">Seat hold active</p>
                <h2>
                  <Clock3 size={18} />{" "}
                  <span role="timer" aria-live="off">
                    {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, "0")}
                  </span>{" "}
                  remaining
                </h2>
              </div>
              <Button variant="secondary" onClick={() => void cancelHold()}>
                Release seats
              </Button>
            </div>
            <div className="form-grid">
              <label>
                Boarding point
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
                  <option value="">Select boarding</option>
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
                Drop-off point
                <select
                  required
                  value={dropOffStopId}
                  onChange={(e) => setDropOffStopId(e.target.value)}
                >
                  <option value="">Select drop-off</option>
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
            <h3>Passenger details</h3>
            {passengers.map((passenger, index) => (
              <div
                className="form-grid passenger-form"
                key={passenger.seatName}
              >
                <strong>Seat {passenger.seatName}</strong>
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
                    {field === "documentReference"
                      ? "Document reference"
                      : field === "documentType"
                        ? "Document type"
                        : field[0].toUpperCase() + field.slice(1)}
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
                        <option value="">Select gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
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
                        <option value="">No document</option>
                        <option value="National ID">National ID</option>
                        <option value="Passport">Passport</option>
                        <option value="Other">Other</option>
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
            <div className="form-grid">
              <label>
                Discount type
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as "FIXED" | "PERCENTAGE")
                  }
                >
                  <option value={cap?.type ?? "PERCENTAGE"}>
                    {cap?.type === "FIXED" ? "Fixed amount" : "Percentage"}
                  </option>
                </select>
              </label>
              <label>
                Discount {discountType === "PERCENTAGE" ? "%" : "₹"} (cap{" "}
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
            <p>
              <strong>Fare:</strong> ₹{baseFare.toFixed(2)} ·{" "}
              <strong>Discount:</strong> ₹{discount.toFixed(2)} ·{" "}
              <strong>Total:</strong> ₹
              {Math.max(0, baseFare - discount).toFixed(2)}
            </p>
            <Button
              type="submit"
              disabled={
                saving ||
                discountValue > (cap?.type === discountType ? cap.value : 0)
              }
            >
              {saving ? "Confirming..." : "Confirm booking and issue ticket"}
            </Button>
          </form>
        </Card>
      )}
      {trips.length === 0 && !loading && (
        <p className="muted">
          Search by source, destination, and date to view available trips.
        </p>
      )}
      <BookingHistory />
    </>
  );
}

export function AgentBookingsDashboard() {
  const [todayBookings, setTodayBookings] = useState(0);
  const [todayValue, setTodayValue] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState(0);
  const [dashboardError, setDashboardError] = useState("");
  useEffect(() => {
    getBookingDashboardSummary()
      .then((summary) => {
        setTodayBookings(summary.todayBookings);
        setTodayValue(summary.todaySales);
        setUpcomingTrips(summary.upcomingTrips);
      })
      .catch((cause) =>
        setDashboardError(
          cause instanceof Error
            ? cause.message
            : "Unable to load dashboard activity",
        ),
      );
  }, []);
  return (
    <>
      <PageHeader
        title="Agent dashboard"
        description="Find a scheduled trip and create a confirmed passenger booking."
        action={
          <Link className="button button-primary" href="/bookings">
            New booking <ArrowRight size={16} />
          </Link>
        }
      />
      {dashboardError && (
        <div className="state-message state-error" role="alert">
          {dashboardError}
        </div>
      )}
      <div className="metric-grid metric-grid-three">
        <Card className="metric-card">
          <p>Bookings today</p>
          <strong>{todayBookings}</strong>
          <span>Confirmed passenger bookings</span>
        </Card>
        <Card className="metric-card">
          <p>Sales today</p>
          <strong>₹{todayValue.toFixed(2)}</strong>
          <span>Confirmed booking value</span>
        </Card>
        <Card className="metric-card">
          <p>Upcoming trips</p>
          <strong>{upcomingTrips}</strong>
          <span>Scheduled departures ahead</span>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card className="setup-card">
          <p className="eyebrow">Booking desk</p>
          <h2>Ready to book a trip?</h2>
          <p className="muted">
            Search live scheduled trips, lock seats while you enter passenger
            details, and print the ticket with its PNR.
          </p>
          <Link className="button button-primary" href="/bookings">
            Start booking <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
      <BookingHistory compact />
    </>
  );
}
