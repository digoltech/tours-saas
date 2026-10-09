"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  Clock3,
  MapPin,
  Route as RouteIcon,
  Ticket,
  UserRound,
} from "lucide-react";
import { localizeText } from "../../../../../src/i18n/errors";
import { useFormattingLocale } from "../../../../../src/i18n/format-client";
import { Translate } from "../../../../../src/i18n/Translate";
import { Badge } from "../../../../../src/ui/Badge";
import { useConfirmation } from "../../../../../src/ui/ConfirmationModal";
import { Button } from "../../../../../src/ui/Button";
import { Card } from "../../../../../src/ui/Card";
import { RecordPage, EditRecordLink } from "../../../../../src/ui/RecordPage";
import { useAuth } from "../../../../../src/features/auth/components/AuthProvider";
import {
  getTrip,
  cancelTrip,
  type Trip,
} from "../../../../../src/features/auth/services/api-client";
import "../../../../../src/styles/experience.css";

type TripDetail = Trip & {
  route: Trip["route"] & {
    stops: {
      id: string;
      name: string;
      city?: string | null;
      sequence: number;
      estimatedMinutesFromOrigin?: number | null;
    }[];
  };
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const locale = useFormattingLocale();
  const confirm = useConfirmation();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    void getTrip(id)
      .then(setTrip)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : localizeText("Unable to load trip"),
        ),
      );
  }, [id]);

  async function cancel() {
    if (cancelling) return;
    if (
      !(await confirm({
        title: "Cancel trip?",
        description: `${trip?.tripCode ?? "This trip"} will no longer operate. Confirm that you want to cancel it.`,
        confirmLabel: "Cancel trip",
      }))
    )
      return;
    setCancelling(true);
    setError("");
    try {
      await cancelTrip(id);
      setTrip(await getTrip(id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to cancel trip",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <RecordPage
      title={trip?.tripCode ?? "Trip detail"}
      description={
        trip
          ? `${trip.route.name} · ${new Date(trip.travelDate).toLocaleDateString(locale)}`
          : "Loading trip"
      }
      backHref="/dashboard/trips"
      eyebrow="Trip details"
      summary={
        trip
          ? [
              { label: "Status", value: trip.status.replaceAll("_", " ") },
              {
                label: "Bus",
                value: trip.bus.busNumber,
                href: `/dashboard/buses/${trip.bus.id}`,
              },
              { label: "Branch", value: trip.branch.name },
            ]
          : undefined
      }
      actions={
        (user?.role === "SUPER_ADMIN" ||
          user?.permissions.includes("trip:update")) && (
          <EditRecordLink href={`/dashboard/trips/${id}/edit`} />
        )
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {trip && (
        <div className="trip-profile">
          {(user?.role === "SUPER_ADMIN" ||
            user?.permissions.includes("trip:cancel")) &&
            trip.status !== "CANCELLED" && (
              <Card className="record-section">
                <h2>Trip status</h2>
                <p className="record-help">
                  Cancel this trip if it will no longer operate.
                </p>
                <Button
                  variant="secondary"
                  disabled={cancelling}
                  onClick={() => void cancel()}
                >
                  Cancel trip
                </Button>
              </Card>
            )}
          <Card className="trip-profile-hero">
            <div className="trip-profile-hero-top">
              <span className="eyebrow">
                <Translate text="Scheduled operation" />
              </span>
              <Badge>{trip.status.replaceAll("_", " ")}</Badge>
            </div>
            <div className="trip-profile-route">
              <span>
                <MapPin size={18} />
                {trip.route.source}
              </span>
              <span className="trip-profile-line" aria-hidden="true">
                <span />
              </span>
              <span>
                <MapPin size={18} />
                {trip.route.destination}
              </span>
            </div>
            <div className="trip-profile-main">
              <div>
                <span>
                  <CalendarDays size={17} />
                  <Translate text="Travel date" />
                </span>
                <strong>
                  {new Date(trip.travelDate).toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })}
                </strong>
              </div>
              <div>
                <span>
                  <Clock3 size={17} />
                  <Translate text="Departure" />
                </span>
                <strong>
                  {new Date(trip.departureTime).toLocaleString(locale, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </strong>
              </div>
              <div>
                <span>
                  <Clock3 size={17} />
                  <Translate text="Arrival" />
                </span>
                <strong>
                  {new Date(trip.arrivalTime).toLocaleString(locale, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </strong>
              </div>
              <div>
                <span>
                  <Ticket size={17} />
                  <Translate text="Fare" />
                </span>
                <strong>₹{Number(trip.fare).toLocaleString(locale)}</strong>
              </div>
            </div>
          </Card>
          <div className="trip-profile-grid">
            <Card className="trip-profile-panel">
              <p className="eyebrow">
                <Translate text="Assigned resources" />
              </p>
              <h2>
                <Translate text="Bus & crew" />
              </h2>
              <div className="trip-resource">
                <span className="trip-resource-icon">
                  <BusFront size={22} />
                </span>
                <div>
                  <small>
                    <Translate text="Bus" />
                  </small>
                  <strong>{trip.bus.busNumber}</strong>
                  <span>
                    {trip.bus.registrationNumber} ·{" "}
                    {trip.bus.busType.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
              <div className="trip-resource">
                <span className="trip-resource-icon">
                  <UserRound size={22} />
                </span>
                <div>
                  <small>
                    <Translate text="Driver" />
                  </small>
                  <strong>
                    {trip.driver.firstName} {trip.driver.lastName}
                  </strong>
                  <span>{trip.driver.phone}</span>
                </div>
              </div>
              <div className="trip-resource">
                <span className="trip-resource-icon">
                  <RouteIcon size={22} />
                </span>
                <div>
                  <small>
                    <Translate text="Branch" />
                  </small>
                  <Link href={`/dashboard/branches/${trip.branch.id}`}>
                    {trip.branch.name} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </Card>
            <Card className="trip-profile-panel">
              <p className="eyebrow">
                <Translate text="Route sequence" />
              </p>
              <h2>
                <Translate text="Stops" />
              </h2>
              {trip.route.stops.length ? (
                <ol className="trip-stops">
                  {trip.route.stops.map((stop, index) => (
                    <li key={stop.id}>
                      <span className="trip-stop-marker">{index + 1}</span>
                      <div>
                        <strong>{stop.name}</strong>
                        <span>
                          {stop.city ?? ""}
                          {stop.estimatedMinutesFromOrigin != null
                            ? ` · ${stop.estimatedMinutesFromOrigin} min from origin`
                            : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  <Translate text="No stops configured." />
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </RecordPage>
  );
}
