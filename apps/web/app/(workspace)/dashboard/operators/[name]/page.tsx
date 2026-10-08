"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, BusFront, MapPin } from "lucide-react";
import {
  getBuses,
  type Bus,
} from "../../../../../src/features/auth/services/api-client";
import { RecordPage } from "../../../../../src/ui/RecordPage";
import { Card } from "../../../../../src/ui/Card";
import { Badge } from "../../../../../src/ui/Badge";
import "../../../../../src/styles/experience.css";

export default function OperatorProfilePage() {
  const { name } = useParams<{ name: string }>();
  let operatorName = name;
  try {
    operatorName = decodeURIComponent(name);
  } catch {
    /* Keep the route value if it contains a literal percent sign. */
  }
  const [buses, setBuses] = useState<Bus[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void getBuses({ limit: "100" })
      .then((page) =>
        setBuses(
          page.data.filter((bus) => bus.operatorName?.trim() === operatorName),
        ),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load operator",
        ),
      )
      .finally(() => setLoading(false));
  }, [operatorName]);
  return (
    <RecordPage
      title={operatorName}
      description={"Operator profile and assigned fleet"}
      backHref="/dashboard/operators"
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="state-message">Loading operator…</div>
      ) : (
        <div className="directory-profile">
          <Card className="directory-profile-hero">
            <div className="directory-profile-icon">
              <Building2 size={28} />
            </div>
            <div>
              <p className="eyebrow">OPERATOR PROFILE</p>
              <h2>{operatorName}</h2>
              <p>Transport operator linked to your fleet</p>
            </div>
            <Badge>{buses.length} buses</Badge>
          </Card>
          <div className="directory-stats">
            <Card>
              <BusFront size={20} />
              <strong>{buses.length}</strong>
              <span>Total buses</span>
            </Card>
            <Card>
              <BusFront size={20} />
              <strong>
                {buses.filter((bus) => bus.status === "ACTIVE").length}
              </strong>
              <span>Active buses</span>
            </Card>
            <Card>
              <MapPin size={20} />
              <strong>
                {buses.reduce((sum, bus) => sum + bus.totalSeats, 0)}
              </strong>
              <span>Seats</span>
            </Card>
          </div>
          <Card className="directory-panel">
            <div className="directory-panel-heading">
              <h2>Fleet</h2>
              <Link href="/dashboard/buses">
                Manage buses <ArrowRight size={15} />
              </Link>
            </div>
            {buses.length ? (
              buses.map((bus) => (
                <Link
                  className="directory-row"
                  href={`/dashboard/buses/${bus.id}`}
                  key={bus.id}
                >
                  <span>
                    <strong>
                      {bus.busNumber} · {bus.registrationNumber}
                    </strong>
                    <small>
                      {bus.busType.replaceAll("_", " ")} · {bus.totalSeats}{" "}
                      seats · {bus.branch.name}
                    </small>
                  </span>
                  <Badge>{bus.status}</Badge>
                </Link>
              ))
            ) : (
              <p>No buses found for this operator.</p>
            )}
          </Card>
        </div>
      )}
    </RecordPage>
  );
}
