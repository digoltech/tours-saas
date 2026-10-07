"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import {
  getBranch,
  getBuses,
  getTrips,
  type Branch,
  type Bus,
  type Trip,
} from "../../../../../src/features/auth/services/api-client";
import { PageHeader } from "../../../../../src/ui/PageHeader";
import { Card } from "../../../../../src/ui/Card";
import { Badge } from "../../../../../src/ui/Badge";
import "../../../../../src/styles/experience.css";

type BranchProfile = Branch & {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status: string;
  agency: { name: string };
  _count: { users: number };
};

export default function BranchProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [branch, setBranch] = useState<BranchProfile | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getBranch(id),
      getBuses({ branchId: id, limit: "100" }),
      getTrips({ branchId: id, limit: "5" }),
    ]).then(([branchResult, busResult, tripResult]) => {
      if (!active) return;
      if (branchResult.status === "fulfilled") setBranch(branchResult.value);
      else
        setError(
          branchResult.reason instanceof Error
            ? branchResult.reason.message
            : "Unable to load branch",
        );
      if (busResult.status === "fulfilled") setBuses(busResult.value.data);
      if (tripResult.status === "fulfilled") setTrips(tripResult.value.data);
    });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <PageHeader
        title={branch?.name ?? "Branch profile"}
        description={
          branch ? `${branch.agency.name} · ${branch.code}` : "Loading branch"
        }
      />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {branch && (
        <div className="directory-profile">
          <Card className="directory-profile-hero">
            <div className="directory-profile-icon">
              <MapPin size={28} />
            </div>
            <div>
              <p className="eyebrow">BRANCH PROFILE</p>
              <h2>{branch.name}</h2>
              <p>
                {branch.agency.name} · Code {branch.code}
              </p>
            </div>
            <Badge>{branch.status}</Badge>
          </Card>
          <div className="directory-stats">
            <Card>
              <Users size={20} />
              <strong>{branch._count.users}</strong>
              <span>Team members</span>
            </Card>
            <Card>
              <BusFront size={20} />
              <strong>{buses.length}</strong>
              <span>Buses</span>
            </Card>
            <Card>
              <CalendarDays size={20} />
              <strong>{trips.length}</strong>
              <span>Recent trips shown</span>
            </Card>
          </div>
          <div className="directory-columns">
            <Card className="directory-panel">
              <h2>Contact & location</h2>
              <p>
                <Mail size={17} />
                {branch.email ?? "No email added"}
              </p>
              <p>
                <Phone size={17} />
                {branch.phone ?? "No phone added"}
              </p>
              <p>
                <MapPin size={17} />
                {[branch.address, branch.city, branch.state, branch.country]
                  .filter(Boolean)
                  .join(", ") || "No address added"}
              </p>
            </Card>
            <Card className="directory-panel">
              <h2>Assigned buses</h2>
              {buses.length ? (
                buses.map((bus) => (
                  <Link
                    key={bus.id}
                    href={`/dashboard/buses/${bus.id}/edit`}
                    className="directory-row"
                  >
                    <span>
                      <strong>{bus.busNumber}</strong>
                      <small>{bus.registrationNumber}</small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                ))
              ) : (
                <p>No buses assigned.</p>
              )}
            </Card>
          </div>
          <Card className="directory-panel">
            <div className="directory-panel-heading">
              <h2>Trips from this branch</h2>
              <Link href="/dashboard/trips">
                All trips <ArrowRight size={15} />
              </Link>
            </div>
            {trips.length ? (
              trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/dashboard/trips/${trip.id}`}
                  className="directory-row"
                >
                  <span>
                    <strong>
                      {trip.route.source} → {trip.route.destination}
                    </strong>
                    <small>{trip.tripCode}</small>
                  </span>
                  <Badge>{trip.status}</Badge>
                </Link>
              ))
            ) : (
              <p>No trips scheduled.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
