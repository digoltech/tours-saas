"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import {
  getBranch,
  getBuses,
  getTrips,
  type Branch,
  type Bus,
  type Trip,
} from "../../../../../src/features/auth/services/api-client";
import {
  RecordPage,
  RecordSection,
  EditRecordLink,
} from "../../../../../src/ui/RecordPage";
import { useAuth } from "../../../../../src/features/auth/components/AuthProvider";
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
  const { user } = useAuth();
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
    <RecordPage
      title={branch?.name ?? "Branch profile"}
      description={
        branch ? `${branch.agency.name} · ${branch.code}` : "Loading branch"
      }
      backHref="/dashboard/branches"
      eyebrow="Branch profile"
      summary={
        branch
          ? [
              {
                label: "Team members",
                value: branch._count.users,
                href: `/dashboard/team?agencyId=${branch.agencyId}&branchId=${id}`,
              },
              { label: "Buses", value: buses.length },
              { label: "Status", value: branch.status },
              { label: "City", value: branch.city || "—" },
            ]
          : undefined
      }
      actions={
        (user?.role === "SUPER_ADMIN" ||
          user?.permissions.includes("branch:update")) && (
          <EditRecordLink href={`/dashboard/branches/${id}/edit`} />
        )
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {branch && (
        <div className="directory-profile">
          <RecordSection
            title="Branch team"
            description="View people assigned to this location."
          >
            <Link
              className="record-related-link"
              href={`/dashboard/team?agencyId=${branch.agencyId}&branchId=${id}`}
            >
              View team members <ArrowRight size={16} />
            </Link>
          </RecordSection>
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
                    href={`/dashboard/buses/${bus.id}`}
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
    </RecordPage>
  );
}
