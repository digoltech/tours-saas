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
  ArrowLeft,
  ArrowRight,
  Bus,
  Clock3,
  Lock,
  Search,
  Ticket,
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
import { useAuth } from "../auth/components/AuthProvider";
import { useTranslations } from "../../i18n/LocaleProvider";
import "../../styles/booking-flow.css";
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
  age: NaN,
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
  const t = useTranslations();
  const { user } = useAuth();
  const canPay =
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes("finance:payment");
  const [step, setStep] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"LATER" | "FULL" | "PARTIAL">(
    "LATER",
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "BANK_TRANSFER" | "CARD" | "UPI" | "OTHER"
  >("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [searched, setSearched] = useState(false);
  const steps = ["Journey", "Bus & timing", "Seats", "Passengers", "Payment"];
  function goToStep(next: number) {
    setStep(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
        setStep(2);
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
    if (hold) await releaseSeatHold(hold.holdToken).catch(() => undefined);
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
      setSearched(true);
      goToStep(1);
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
    setSaving(true);
    try {
      const data = await getSeatAvailability(trip.id);
      setAvailability(data);
      setDiscountType(data.discountCap.type);
      setDiscountValue(0);
      goToStep(2);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load trip"),
      );
    } finally {
      setSaving(false);
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
      goToStep(3);
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
    goToStep(2);
    if (availability) await loadAvailability(availability.trip.id);
  }
  async function submit() {
    if (!availability || !hold || saving) return;
    if (
      !(await confirm({
        title: "Confirm booking?",
        description: `${availability.trip.route.source} → ${availability.trip.route.destination} · ${date} · Seats ${selectedSeats.join(", ")} · ${passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}. Confirm to reserve these seats and issue the ticket. Payment: ${paymentMode === "LATER" ? "record later" : paymentMode === "FULL" ? "full amount received" : `₹${paymentAmount} received`} ${paymentMode !== "LATER" ? paymentMethod : ""}.`,
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
        passengers: passengers.map((passenger) => ({
          ...passenger,
          firstName: passenger.firstName.trim(),
          lastName: passenger.lastName.trim(),
          phone: passenger.phone.replace(/[ ()-]/g, ""),
          email: passenger.email?.trim(),
        })),
        ...(paymentMode !== "LATER"
          ? {
              initialPayment: {
                mode: paymentMode,
                ...(paymentMode === "PARTIAL"
                  ? { amount: Number(paymentAmount) }
                  : {}),
                method: paymentMethod,
                reference: paymentReference.trim(),
              },
            }
          : {}),
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

  const tax =
    Math.round(
      Math.max(
        0,
        availability?.pricing?.gstAfterDiscount === false
          ? baseFare
          : baseFare - discount,
      ) * (availability?.pricing?.taxRate ?? 0),
    ) / 100;
  const totalFare =
    Math.round((Math.max(0, baseFare - discount) + tax) * 100) / 100;
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
        title="New ticket booking"
        description="Search scheduled trips, reserve seats, and issue a passenger ticket."
      />
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      <div className="booking-flow">
        <div className="booking-flow-heading">
          <div>
            <p className="eyebrow">{t("BOOKING DESK")}</p>
            <h1>{t("Book a bus ticket")}</h1>
            <p>{t("Choose your journey, reserve seats and issue a ticket.")}</p>
          </div>
          <Link href="/dashboard/bookings" className="button button-secondary">
            {t("Back to bookings")}
          </Link>
        </div>
        <nav className="booking-steps" aria-label={t("Booking steps")}>
          {steps.map((label, index) => (
            <div
              key={label}
              className={
                index === step
                  ? "booking-step current"
                  : index < step
                    ? "booking-step complete"
                    : "booking-step"
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              <strong>{t(label)}</strong>
            </div>
          ))}
        </nav>
        {step > 0 && (
          <div className="booking-journey-bar">
            <div>
              <strong>
                {source} → {destination}
              </strong>
              <span>
                {date}
                {availability ? ` · ${availability.trip.bus.busNumber}` : ""}
                {selectedSeats.length
                  ? ` · ${t("Seats")}: ${selectedSeats.join(", ")}`
                  : ""}
              </span>
            </div>
            {step !== 3 && (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => goToStep(step === 4 ? 3 : step - 1)}
              >
                <ArrowLeft size={16} />
                {t(step === 4 ? "Passenger details" : "Back")}
              </Button>
            )}
          </div>
        )}
        {hold && (
          <div className="booking-hold-bar">
            <Clock3 size={16} />
            <span>
              {t("Seat hold active")} · {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void cancelHold()}
            >
              {t("Change seats")}
            </Button>
          </div>
        )}
        {step === 0 && (
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
                <LocalizedValue
                  value={loading ? "Searching..." : "Search buses"}
                />
              </Button>
            </form>
          </Card>
        )}
        {step === 1 && trips.length > 0 && (
          <Card className={cn("management-card")}>
            <h2>
              <Translate text={"Available buses"} />
            </h2>
            {trips.map((trip) => (
              <div className="booking-bus-result" key={trip.id}>
                <Bus size={19} />
                <div>
                  <p className="eyebrow">
                    {trip.bus.operatorName || trip.bus.busNumber}
                  </p>
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
                    →{" "}
                    {new Date(trip.arrivalTime).toLocaleTimeString(
                      getFormattingLocale(),
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                    · {trip.bus.busType.replaceAll("_", " ")} ·{" "}
                    {trip.availableSeats} <Translate text={"seats · ₹"} />
                    {formatDecimal(Number(trip.fare))}{" "}
                    <Translate text={"/ seat"} />
                  </span>
                </div>
                <Button
                  variant="secondary"
                  disabled={saving || trip.availableSeats === 0}
                  onClick={() => void chooseTrip(trip)}
                >
                  <Translate text={"Select bus"} /> <ArrowRight size={15} />
                </Button>
              </div>
            ))}
          </Card>
        )}
        {step === 2 && availability && (
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
        {step === 3 && hold && availability && (
          <Card className={cn("management-form")}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const invalid = passengers.some(
                  (passenger) =>
                    !passenger.firstName.trim() ||
                    !passenger.lastName.trim() ||
                    !Number.isInteger(passenger.age) ||
                    passenger.age < 0 ||
                    passenger.age > 120 ||
                    !["Female", "Male", "Other"].includes(passenger.gender) ||
                    !/^\+?\d{7,15}$/.test(
                      passenger.phone.replace(/[ ()-]/g, ""),
                    ),
                );
                if (invalid) {
                  setError(
                    t("Enter valid required details for every passenger."),
                  );
                  return;
                }
                const restricted = passengers.some((passenger) => {
                  const seat = availability.seats.find(
                    (seat) => seat.name === passenger.seatName,
                  );
                  return (
                    (seat?.restriction === "FEMALE" &&
                      passenger.gender !== "Female") ||
                    (seat?.restriction === "MALE" &&
                      passenger.gender !== "Male") ||
                    (seat?.restriction === "SENIOR" && passenger.age < 60)
                  );
                });
                if (restricted) {
                  setError(
                    t(
                      "Passenger details must match the selected seat eligibility.",
                    ),
                  );
                  return;
                }
                goToStep(4);
              }}
            >
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
                              : field === "firstName"
                                ? "First name"
                                : field === "lastName"
                                  ? "Last name"
                                  : field[0].toUpperCase() + field.slice(1)
                        }
                      />
                      {[
                        "firstName",
                        "lastName",
                        "age",
                        "gender",
                        "phone",
                      ].includes(field) && (
                        <span className="record-required"> *</span>
                      )}
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
                          step={field === "age" ? 1 : undefined}
                          min={field === "age" ? 0 : undefined}
                          max={field === "age" ? 120 : undefined}
                          pattern={
                            field === "phone"
                              ? "\\+?[0-9]{7,15}"
                              : ["firstName", "lastName"].includes(field)
                                ? ".*\\S.*"
                                : undefined
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
                          value={
                            field === "age" && Number.isNaN(passenger.age)
                              ? ""
                              : (passenger[field] ?? "")
                          }
                          onChange={(e) =>
                            setPassengers((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      [field]:
                                        field === "age"
                                          ? e.target.value === ""
                                            ? NaN
                                            : Number(e.target.value)
                                          : field === "phone"
                                            ? e.target.value.replace(
                                                /[ ()-]/g,
                                                "",
                                              )
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
              <Button type="submit">
                {t("Continue to payment")} <ArrowRight size={16} />
              </Button>
            </form>
          </Card>
        )}
        {step === 4 && hold && availability && (
          <Card className="management-form">
            <h2>{t("Review & payment")}</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
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
                  ₹{formatDecimal(totalFare)}
                </p>
                <p className="muted">
                  {t("Tax / GST")}: ₹{formatDecimal(tax)}
                </p>
              </div>
              <div className="booking-payment-entry">
                <h3>{t("Payment entry")}</h3>
                <p className="muted">
                  {t(
                    "Record money already received, or leave payment pending.",
                  )}
                </p>
                <label>
                  {t("Payment status")}
                  <select
                    value={paymentMode}
                    onChange={(event) =>
                      setPaymentMode(event.target.value as typeof paymentMode)
                    }
                  >
                    <option value="LATER">{t("Payment pending")}</option>
                    {canPay && (
                      <>
                        <option value="FULL">
                          {t("Full payment received")}
                        </option>
                        <option value="PARTIAL">
                          {t("Partial payment received")}
                        </option>
                      </>
                    )}
                  </select>
                </label>
                {paymentMode !== "LATER" && (
                  <div className="form-grid">
                    {paymentMode === "PARTIAL" && (
                      <label>
                        {t("Amount received")} *
                        <input
                          type="number"
                          required
                          min="0.01"
                          max={totalFare}
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) =>
                            setPaymentAmount(event.target.value)
                          }
                        />
                      </label>
                    )}
                    <label>
                      {t("Method")} *
                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value as typeof paymentMethod,
                          )
                        }
                      >
                        {["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"].map(
                          (method) => (
                            <option key={method} value={method}>
                              {t(method.replaceAll("_", " "))}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      {t("Reference")}
                      <input
                        value={paymentReference}
                        maxLength={200}
                        onChange={(event) =>
                          setPaymentReference(event.target.value)
                        }
                      />
                    </label>
                  </div>
                )}
                <p className="record-help">
                  {t(
                    "Full payment includes the final tax calculated by the agency. No online charge is made.",
                  )}
                </p>
              </div>
              <div className="booking-passenger-review">
                {passengers.map((passenger) => (
                  <p key={passenger.seatName}>
                    <strong>{passenger.seatName}</strong> {passenger.firstName}{" "}
                    {passenger.lastName} · {passenger.age} ·{" "}
                    {t(passenger.gender)} · {passenger.phone}
                  </p>
                ))}
              </div>
              <Button
                type="submit"
                disabled={
                  saving ||
                  discountValue < 0 ||
                  discount > baseFare ||
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
        {step === 1 && searched && trips.length === 0 && !loading && (
          <p className={cn("muted")}>
            <Translate
              text={"No buses found. Try another journey or travel date."}
            />
          </p>
        )}
      </div>
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
        title="Employee dashboard"
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
