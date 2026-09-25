"use client";

import { cn } from "../../../../../src/lib/utils";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "../../../../../src/ui/Badge";
import { Card } from "../../../../../src/ui/Card";
import { PageHeader } from "../../../../../src/ui/PageHeader";
import {
  getTrip,
  type Trip,
} from "../../../../../src/features/auth/services/api-client";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<
    | (Trip & {
        route: Trip["route"] & {
          stops: { id: string; name: string; sequence: number }[];
        };
      })
    | null
  >(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getTrip(id)
      .then(setTrip)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load trip",
        ),
      );
  }, [id]);
  return (
    <>
      <PageHeader
        title={trip?.tripCode ?? "Trip detail"}
        description={
          trip
            ? `${trip.route.name} · ${new Date(trip.travelDate).toLocaleDateString()}`
            : "Loading trip"
        }
      />
      {error && <div className={cn("state-message state-error")}>{error}</div>}
      {trip && (
        <>
          <Card>
            <div className={cn("card-heading")}>
              <div>
                <p className={cn("eyebrow")}>Scheduled operation</p>
                <h2>
                  {trip.route.source} to {trip.route.destination}
                </h2>
              </div>
              <Badge>{trip.status}</Badge>
            </div>
            <div className={cn("form-grid")}>
              <p>
                <strong>Bus</strong>
                <br />
                {trip.bus.registrationNumber}
              </p>
              <p>
                <strong>Driver</strong>
                <br />
                {trip.driver.firstName} {trip.driver.lastName}
              </p>
              <p>
                <strong>Branch</strong>
                <br />
                {trip.branch.name}
              </p>
              <p>
                <strong>Timing</strong>
                <br />
                {new Date(trip.departureTime).toLocaleString()} to{" "}
                {new Date(trip.arrivalTime).toLocaleString()}
              </p>
            </div>
          </Card>
          <Card>
            <div className={cn("card-heading")}>
              <div>
                <p className={cn("eyebrow")}>Route sequence</p>
                <h2>Stops</h2>
              </div>
            </div>
            {trip.route.stops.length === 0 ? (
              <div className={cn("state-message")}>No stops configured.</div>
            ) : (
              <ol>
                {trip.route.stops.map((stop) => (
                  <li key={stop.id}>
                    {stop.sequence}. {stop.name}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </>
  );
}
