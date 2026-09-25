"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "../../../../../src/ui/Badge";
import { Button } from "../../../../../src/ui/Button";
import { Card } from "../../../../../src/ui/Card";
import { PageHeader } from "../../../../../src/ui/PageHeader";
import {
  configurePoint,
  createStop,
  deactivateStop,
  getRoute,
  updateRoute,
  updateStop,
  type Route,
  type Stop,
} from "../../../../../src/features/auth/services/api-client";

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<(Route & { stops: Stop[] }) | null>(null);
  const [form, setForm] = useState({ name: "", city: "", sequence: "" });
  const [editingStop, setEditingStop] = useState<string | null>(null);
  const [pointType, setPointType] = useState("BOARDING");
  const [timeOffset, setTimeOffset] = useState("");
  const [saving, setSaving] = useState(false);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: "", code: "", source: "", destination: "", description: "", status: "ACTIVE" });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const value = await getRoute(id);
      setRoute(value);
      setRouteForm({ name: value.name, code: value.code, source: value.source, destination: value.destination, description: value.description ?? "", status: value.status });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load route");
    }
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function addStop() {
    if (!form.name.trim()) { setError("Stop name is required."); return; }
    if (!form.sequence || !Number.isInteger(Number(form.sequence)) || Number(form.sequence) < 1) { setError("Enter a stop sequence number of 1 or greater."); return; }
    try {
      setSaving(true);
      await createStop(id, { ...form, sequence: Number(form.sequence) });
      setForm({ name: "", city: "", sequence: "" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add stop");
    } finally { setSaving(false); }
  }
  async function saveStop() {
    if (!editingStop) return;
    if (!form.name.trim()) { setError("Stop name is required."); return; }
    if (!form.sequence || !Number.isInteger(Number(form.sequence)) || Number(form.sequence) < 1) { setError("Enter a stop sequence number of 1 or greater."); return; }
    const stop = route?.stops.find((item) => item.id === editingStop);
    if (!stop) return;
    try { setSaving(true); await updateStop(stop.id, { name: form.name, city: form.city || undefined, sequence: Number(form.sequence) }); setEditingStop(null); setForm({ name: "", city: "", sequence: "" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update stop"); }
    finally { setSaving(false); }
  }
  async function savePoint(stopId: string) {
    if (timeOffset && (!Number.isFinite(Number(timeOffset)) || Number(timeOffset) < 0)) { setError("Stop time offset must be zero or greater."); return; }
    try { setSaving(true); await configurePoint(stopId, { pointType, timeOffset: timeOffset ? Number(timeOffset) : undefined, status: "ACTIVE" }); setTimeOffset(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to configure point"); }
    finally { setSaving(false); }
  }
  async function saveRoute() {
    if (!route) return;
    const required = [routeForm.name, routeForm.code, routeForm.source, routeForm.destination];
    if (required.some((value) => !value.trim())) { setError("Route name, code, source and destination are required."); return; }
    try { setSaving(true); await updateRoute(route.id, routeForm); setRouteFormOpen(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update route"); }
    finally { setSaving(false); }
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
              <Button variant="secondary" onClick={() => setRouteFormOpen((open) => !open)}><Pencil size={15} /> Edit route</Button>
            </div>
            {routeFormOpen && <div className="form-grid route-edit-form">{(["name", "code", "source", "destination", "description"] as const).map((field) => <label key={field}>{field}<input value={routeForm[field]} onChange={(e) => setRouteForm({ ...routeForm, [field]: e.target.value })} /></label>)}<label>Status<select value={routeForm.status} onChange={(e) => setRouteForm({ ...routeForm, status: e.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></label><Button disabled={saving} onClick={() => void saveRoute()}>Save route</Button></div>}
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
              <Button disabled={saving || !form.name || !form.sequence} onClick={() => void (editingStop ? saveStop() : addStop())}>
                <Plus size={16} /> {editingStop ? "Save stop" : "Add stop"}
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
                      <th>Boarding / drop-off</th><th>Actions</th>
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
                        <td className="table-actions"><button className="button button-ghost" onClick={() => { setEditingStop(stop.id); setForm({ name: stop.name, city: stop.city ?? "", sequence: String(stop.sequence) }); }}>Edit</button><button className="button button-ghost" disabled={stop.status === "INACTIVE" || saving} onClick={() => void deactivateStop(stop.id).then(load).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to deactivate stop"))}>Deactivate</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {route.stops.filter((stop) => stop.status === "ACTIVE").map((stop) => <div className="point-editor" key={`point-${stop.id}`}><strong>{stop.sequence}. {stop.name}</strong><label>Point type<select value={pointType} onChange={(e) => setPointType(e.target.value)}><option>BOARDING</option><option>DROP_OFF</option><option>BOTH</option></select></label><label>Minutes from route origin<input type="number" min="0" value={timeOffset} onChange={(e) => setTimeOffset(e.target.value)} /></label><Button variant="secondary" disabled={saving} onClick={() => void savePoint(stop.id)}>Configure point</Button></div>)}
          </Card>
        </>
      )}
    </>
  );
}
