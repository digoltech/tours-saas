"use client";
import { localizeText } from "../../i18n/errors";
import { useFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, Bus } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { SkeletonList } from "../../ui/Skeleton";
import { cn } from "../../lib/utils";
import { getTrips, type Trip } from "../auth/services/api-client";

export function UpcomingTrips({
  initialTrips,
  initialError = "",
}: {
  initialTrips?: Trip[];
  initialError?: string;
}) {
  const formattingLocale = useFormattingLocale();
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
      .catch((cause) => setError(cause instanceof Error ? cause.message : localizeText("Unable to load upcoming trips")))
      .finally(() => setLoading(false));
  }, [initialTrips]);

  return (
    <Card className="upcoming-trips-style-36">
      <div className="upcoming-trips-style-37">
        <div>
          <p className="upcoming-trips-style-39"><Translate text={"Schedule"} /></p>
          <h2 className="upcoming-trips-style-40"><Translate text={"Upcoming trips"} /></h2>
          <p className="upcoming-trips-style-41"><Translate text={"Your next scheduled departures."} /></p>
        </div>
        <Link href="/dashboard/trips" className={cn("button button-secondary")}>
          <Translate text={"All trips"} />{" "}<ArrowRight size={15} />
        </Link>
      </div>

      {error ? (
        <div className="upcoming-trips-style-49" role="alert">{error}</div>
      ) : loading ? (
        <SkeletonList rows={3} />
      ) : trips.length === 0 ? (
        <div className="upcoming-trips-style-53">
          <CalendarDays className="upcoming-trips-style-54" aria-hidden="true" />
          <p className="upcoming-trips-style-55"><Translate text={"No upcoming trips scheduled"} /></p>
          <p className="upcoming-trips-style-56"><Translate text={"New scheduled departures will appear here."} /></p>
        </div>
      ) : (
        <div className="upcoming-trips-style-59">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/dashboard/trips/${trip.id}`} className="upcoming-trips-style-61">
              <div className="upcoming-trips-style-62">
                <span className="upcoming-trips-style-63">{trip.tripCode}</span>
                <strong className="upcoming-trips-style-64">{new Date(trip.travelDate).toLocaleDateString(formattingLocale, { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" })}</strong>
              </div>
              <div className="upcoming-trips-style-66">
                <span className="upcoming-trips-style-67"><MapPin size={14} className="upcoming-trips-style-67-2" />{trip.route.source} <span aria-hidden="true">→</span> {trip.route.destination}</span>
                <span className="upcoming-trips-style-68">
                  <span className="upcoming-trips-style-69"><Clock3 size={13} />{new Date(trip.departureTime).toLocaleTimeString(formattingLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                  <span className="upcoming-trips-style-70"><Bus size={13} />{trip.bus.busNumber}</span>
                </span>
              </div>
              <Badge>{trip.status.replaceAll("_", " ")}</Badge>
              <ArrowRight size={16} className="upcoming-trips-style-74" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
