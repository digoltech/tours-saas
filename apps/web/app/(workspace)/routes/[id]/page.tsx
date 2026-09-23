"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "../../../../src/ui/Badge";
import { Button } from "../../../../src/ui/Button";
import { Card } from "../../../../src/ui/Card";
import { PageHeader } from "../../../../src/ui/PageHeader";
import {
  createStop,
  getRoute,
  type Route,
  type Stop,
} from "../../../../src/features/auth/services/api-client";

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<(Route & { stops: Stop[] }) | null>(null);
  const [form, setForm] = useState({ name: "", city: "", sequence: "" });
  const [error, setError] = useState("");
  async function load() {
    try {
      setRoute(await getRoute(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load route");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);
  async function addStop() {
    try {
      await createStop(id, { ...form, sequence: Number(form.sequence) });
      setForm({ name: "", city: "", sequence: "" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add stop");
    }
  }
  return (
    <>
      <PageHeader
        title={route?.name ?? "Route detail"}
        description={
          route
            ? `${route.source} to ${route.destination} · ${route.code}`
            : "Loading route"
        }
      />
      {error && <div className="state-message state-error">{error}</div>}
      {route && (
        <>
          <Card>
            <div className="card-heading">
              <div>
                <p className="eyebrow">Route profile</p>
                <h2>
                  {route.source} to {route.destination}
                </h2>
              </div>
              <Badge>{route.status}</Badge>
            </div>
            <p>{route.description || "No description provided."}</p>
          </Card>
          <Card className="management-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Ordered stops</p>
                <h2>Stops</h2>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Stop name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </label>
              <label>
                Sequence
                <input
                  type="number"
                  min="1"
                  value={form.sequence}
                  onChange={(e) =>
                    setForm({ ...form, sequence: e.target.value })
                  }
                />
              </label>
              <Button onClick={() => void addStop()}>
                <Plus size={16} /> Add stop
              </Button>
            </div>
            {route.stops.length === 0 ? (
              <div className="state-message">No stops configured.</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Stop</th>
                      <th>City</th>
                      <th>Boarding / drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.stops.map((stop) => (
                      <tr key={stop.id}>
                        <td>{stop.sequence}</td>
                        <td>{stop.name}</td>
                        <td>{stop.city || "-"}</td>
                        <td>
                          {stop.points.length === 0 ? (
                            <span>Not configured</span>
                          ) : (
                            stop.points.map((point) => (
                              <Badge key={point.pointType}>
                                {point.pointType}
                              </Badge>
                            ))
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
