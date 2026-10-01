"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Search } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { cn } from "../../lib/utils";
import { getAuditLogs } from "../auth/services/api-client";

type ActivityRow = Awaited<ReturnType<typeof getAuditLogs>>[number];
export function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", actorId: "", action: "", entityType: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows(await getAuditLogs({ ...(applied.from ? { from: new Date(`${applied.from}T00:00:00`).toISOString() } : {}), ...(applied.to ? { to: new Date(`${applied.to}T23:59:59.999`).toISOString() } : {}), ...(applied.actorId ? { actorId: applied.actorId } : {}), ...(applied.action ? { action: applied.action } : {}), ...(applied.entityType ? { entityType: applied.entityType } : {}) })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load workspace activity"); }
    finally { setLoading(false); }
  }, [applied]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const actors = Array.from(new Map(rows.filter((row) => row.actor).map((row) => [row.actor!.id, { id: row.actor!.id, name: `${row.actor!.firstName} ${row.actor!.lastName}` }])).values());
  return <>
    <PageHeader title="Workspace activity" description="Review changes made across your agency workspace." />
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    <Card className="mb-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Actor<select value={actorId} onChange={(event) => setActorId(event.target.value)}><option value="">Anyone</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label><label>Action<input value={action} onChange={(event) => setAction(event.target.value)} placeholder="e.g. TRIP_CREATED" /></label><label>Entity<input value={entityType} onChange={(event) => setEntityType(event.target.value)} placeholder="Bus, Trip, Role…" /></label></div><button className="button button-secondary mt-3" onClick={() => setApplied({ from, to, actorId, action, entityType })}><Search size={15} /> Apply filters</button></Card>
    <Card>{loading ? <div className="state-message">Loading activity…</div> : rows.length ? <div className="grid gap-2">{rows.map((row) => <article className="rounded-xl border border-slate-200 p-4" key={row.id}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="flex items-center gap-2"><Activity size={15} />{row.action.replaceAll("_", " ")}</strong><time className="text-sm text-slate-500">{new Date(row.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm text-slate-600">{row.entityType}{row.entityId ? ` · ${row.entityId}` : ""} · {row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : "System"}</p></article>)}</div> : <div className="state-message">No activity found for these filters.</div>}</Card>
  </>;
}
