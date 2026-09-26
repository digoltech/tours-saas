"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, Bus } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { cn } from "../../lib/utils";
import { getTrips, type Trip } from "../auth/services/api-client";

export function UpcomingTrips({
  initialTrips,
  initialError = "",
}: {
  initialTrips?: Trip[];
  initialError?: string;
}) {
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
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load upcoming trips"))
      .finally(() => setLoading(false));
  }, [initialTrips]);

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Schedule</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Upcoming trips</h2>
          <p className="mt-1 text-sm text-slate-500">Your next scheduled departures.</p>
        </div>
        <Link href="/dashboard/trips" className={cn("button button-secondary")}>
          All trips <ArrowRight size={15} />
        </Link>
      </div>

      {error ? (
        <div className="px-5 py-6 text-sm text-rose-700" role="alert">{error}</div>
      ) : loading ? (
        <div className="px-5 py-6 text-sm text-slate-500" role="status">Loading upcoming trips…</div>
      ) : trips.length === 0 ? (
        <div className="px-5 py-8 text-center sm:px-6">
          <CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No upcoming trips scheduled</p>
          <p className="mt-1 text-sm text-slate-500">New scheduled departures will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/dashboard/trips/${trip.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6">
              <div className="min-w-28">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{trip.tripCode}</span>
                <strong className="mt-1 block text-sm text-slate-900">{new Date(trip.travelDate).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" })}</strong>
              </div>
              <div className="min-w-48 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><MapPin size={14} className="shrink-0 text-slate-400" />{trip.route.source} <span aria-hidden="true">→</span> {trip.route.destination}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock3 size={13} />{new Date(trip.departureTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                  <span className="inline-flex items-center gap-1"><Bus size={13} />{trip.bus.busNumber}</span>
                </span>
              </div>
              <Badge>{trip.status.replaceAll("_", " ")}</Badge>
              <ArrowRight size={16} className="ml-auto text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
