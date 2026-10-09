"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";
import { localizeText } from "../../i18n/errors";
import { useFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { SkeletonList } from "../../ui/Skeleton";
import { getTrips, type Trip } from "../auth/services/api-client";
import "../../styles/experience.css";

export function UpcomingTrips({
  initialTrips,
  initialError = "",
}: {
  initialTrips?: Trip[];
  initialError?: string;
}) {
  const locale = useFormattingLocale();
  const [trips, setTrips] = useState<Trip[]>(initialTrips ?? []);
  const [loading, setLoading] = useState(initialTrips === undefined);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (initialTrips !== undefined) return;
    getTrips({
      status: "SCHEDULED",
      departureAfter: new Date().toISOString(),
      limit: "6",
    })
      .then((result) => setTrips(result.data))
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : localizeText("Unable to load upcoming trips"),
        ),
      )
      .finally(() => setLoading(false));
  }, [initialTrips]);

  return (
    <Card className="journey-section">
      <div className="journey-section-heading">
        <div>
          <p className="eyebrow">
            <Translate text="Schedule" />
          </p>
          <h2>
            <Translate text="Upcoming trips" />
          </h2>
          <p>
            <Translate text="Your next scheduled departures." />
          </p>
        </div>
        <Link
          prefetch={false}
          href="/dashboard/trips"
          className="button button-secondary"
        >
          <Translate text="All trips" /> <ArrowRight size={16} />
        </Link>
      </div>
      {error ? (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      ) : loading ? (
        <SkeletonList rows={3} />
      ) : trips.length === 0 ? (
        <div className="journey-empty">
          <CalendarDays size={28} />
          <strong>
            <Translate text="No upcoming trips scheduled" />
          </strong>
          <span>
            <Translate text="New scheduled departures will appear here." />
          </span>
        </div>
      ) : (
        <div className="journey-grid">
          {trips.map((trip) => (
            <Link
              prefetch={false}
              href={`/dashboard/trips/${trip.id}`}
              className="journey-tile"
              key={trip.id}
            >
              <div className="journey-tile-visual">
                {trip.bus.photos?.[0] ? (
                  <img
                    src={trip.bus.photos[0]}
                    alt={`${trip.bus.busNumber} bus`}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <BusFront size={54} strokeWidth={1.3} aria-hidden="true" />
                )}
                <span className="journey-tile-bus">{trip.bus.busNumber}</span>
              </div>
              <div className="journey-tile-body">
                <div className="journey-tile-top">
                  <span className="journey-code">{trip.tripCode}</span>
                  <Badge>{trip.status.replaceAll("_", " ")}</Badge>
                </div>
                <h3>
                  {trip.route.source} <span aria-hidden="true">→</span>{" "}
                  {trip.route.destination}
                </h3>
                <p className="journey-route-name">{trip.route.name}</p>
                <div className="journey-tile-meta">
                  <span>
                    <CalendarDays size={15} />
                    {new Date(trip.travelDate).toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span>
                    <Clock3 size={15} />
                    {new Date(trip.departureTime).toLocaleTimeString(locale, {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <div className="journey-tile-foot">
                  <span>
                    <MapPin size={14} /> {trip.branch.name}
                  </span>
                  <span>
                    <Translate text="View trip" /> <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
