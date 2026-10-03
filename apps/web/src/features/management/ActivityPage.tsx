"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, CalendarDays, FilterX, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { Skeleton, SkeletonList } from "../../ui/Skeleton";
import { getAuditLogs } from "../auth/services/api-client";

type ActivityRow = Awaited<ReturnType<typeof getAuditLogs>>[number];
type Filters = { from: string; to: string; actorId: string; action: string; entityType: string };
const emptyFilters: Filters = { from: "", to: "", actorId: "", action: "", entityType: "" };

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [actors, setActors] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const hasFilters = Object.values(applied).some(Boolean);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAuditLogs({
        ...(applied.from ? { from: new Date(`${applied.from}T00:00:00`).toISOString() } : {}),
        ...(applied.to ? { to: new Date(`${applied.to}T23:59:59.999`).toISOString() } : {}),
        ...(applied.actorId ? { actorId: applied.actorId } : {}),
        ...(applied.action ? { action: applied.action } : {}),
        ...(applied.entityType ? { entityType: applied.entityType } : {}),
      });
      setRows(result);
      if (!hasFilters) {
        setActors(Array.from(new Map(result.filter((row) => row.actor).map((row) => [
          row.actor!.id,
          { id: row.actor!.id, name: `${row.actor!.firstName} ${row.actor!.lastName}` },
        ])).values()).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load agency activity.");
    } finally { setLoading(false); }
  }, [applied, hasFilters]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError("The start date must be before the end date.");
      return;
    }
    setApplied({ ...filters, action: filters.action.trim(), entityType: filters.entityType.trim() });
  }

  function clear() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setError("");
  }

  return <>
    <PageHeader title="Agency activity" description="Review changes made across your agency." />
    <Card className="activity-filter-card">
      <div className="activity-card-heading"><div><span className="activity-heading-icon"><SlidersHorizontal size={18} /></span><div><h2>Filter activity</h2><p>Narrow the timeline by date, team member, action or record.</p></div></div>{hasFilters && <button type="button" className="activity-clear" onClick={clear}><FilterX size={16} /> Clear filters</button>}</div>
      <form onSubmit={apply}>
        <div className="activity-filter-grid">
          <label>From date <span className="activity-input-wrap"><CalendarDays size={16} /><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></span></label>
          <label>To date <span className="activity-input-wrap"><CalendarDays size={16} /><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></span></label>
          <label>Team member <span className="activity-input-wrap"><UserRound size={16} /><select value={filters.actorId} onChange={(event) => setFilters((current) => ({ ...current, actorId: event.target.value }))}><option value="">Anyone</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></span></label>
          <label>Action <span className="activity-input-wrap"><Search size={16} /><input value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} placeholder="e.g. TRIP_CREATED" /></span></label>
          <label>Record type <span className="activity-input-wrap"><Search size={16} /><input value={filters.entityType} onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))} placeholder="Bus, Trip, Role…" /></span></label>
        </div>
        <div className="activity-filter-actions"><Button type="submit" loading={loading} loadingLabel="Loading activity…"><Search size={16} /> Apply filters</Button><span>Showing the most recent matching activity</span></div>
      </form>
    </Card>
    {error && <div className="state-message state-error" role="alert">{error}</div>}
    <Card className="activity-results">
      <div className="activity-results-heading"><div><p className="eyebrow">EVENT HISTORY</p><h2>Activity timeline</h2></div><span>{loading ? "Loading" : `${rows.length} shown`}</span></div>
      {loading ? <SkeletonList rows={5} /> : rows.length ? <div className="activity-timeline">{rows.map((row) => <article className="activity-event" key={row.id}>
        <span className="activity-event-icon"><Activity size={18} /></span>
        <div className="activity-event-body"><div className="activity-event-title"><h3>{formatAction(row.action)}</h3><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time></div><p><strong>{row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : "System"}</strong> updated <span className="activity-entity">{row.entityType}</span>{row.entityId && <span className="activity-entity-id" title={row.entityId}> · {row.entityId}</span>}</p></div>
      </article>)}</div> : <div className="activity-empty"><span className="activity-empty-icon"><Activity size={26} /></span><h3>{hasFilters ? "No matching activity" : "No activity yet"}</h3><p>{hasFilters ? "Try a wider date range or clear the filters to see more events." : "Changes to bookings, trips and your team will appear here."}</p>{hasFilters && <Button variant="secondary" onClick={clear}><FilterX size={16} /> Clear filters</Button>}</div>}
    </Card>
  </>;
}
