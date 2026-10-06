"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { getFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import "../../styles/activity.css";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, CalendarDays, FilterX, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { SkeletonList } from "../../ui/Skeleton";
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
      setError(cause instanceof Error ? cause.message : localizeText("Unable to load agency activity."));
    } finally { setLoading(false); }
  }, [applied, hasFilters]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError(localizeText("The start date must be before the end date."));
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
      <div className="activity-card-heading"><div><span className="activity-heading-icon"><SlidersHorizontal size={18} /></span><div><h2><Translate text={"Filter activity"} /></h2><p><Translate text={"Narrow the timeline by date, team member, action or record."} /></p></div></div>{hasFilters && <button type="button" className="activity-clear" onClick={clear}><FilterX size={16} /> <Translate text={"Clear filters"} /></button>}</div>
      <form onSubmit={apply}>
        <div className="activity-filter-grid">
          <label><Translate text={"From date"} />{" "}<span className="activity-input-wrap"><CalendarDays size={16} /><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></span></label>
          <label><Translate text={"To date"} />{" "}<span className="activity-input-wrap"><CalendarDays size={16} /><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></span></label>
          <label><Translate text={"Team member"} />{" "}<span className="activity-input-wrap"><UserRound size={16} /><select value={filters.actorId} onChange={(event) => setFilters((current) => ({ ...current, actorId: event.target.value }))}><option value=""><Translate text={"Anyone"} /></option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></span></label>
          <label><Translate text={"Action"} />{" "}<span className="activity-input-wrap"><Search size={16} /><input value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} placeholder="e.g. TRIP_CREATED" /></span></label>
          <label><Translate text={"Record type"} />{" "}<span className="activity-input-wrap"><Search size={16} /><input value={filters.entityType} onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))} placeholder="Bus, Trip, Role…" /></span></label>
        </div>
        <div className="activity-filter-actions"><Button type="submit" loading={loading} loadingLabel="Loading activity…"><Search size={16} /> <Translate text={"Apply filters"} /></Button><span><Translate text={"Showing the most recent matching activity"} /></span></div>
      </form>
    </Card>
    {error && <div className="state-message state-error" role="alert">{error}</div>}
    <Card className="activity-results">
      <div className="activity-results-heading"><div><p className="eyebrow"><Translate text={"EVENT HISTORY"} /></p><h2><Translate text={"Activity timeline"} /></h2></div><span><LocalizedValue value={loading ? "Loading" : `${rows.length} shown`} /></span></div>
      {loading ? <SkeletonList rows={5} /> : rows.length ? <div className="activity-timeline">{rows.map((row) => <article className="activity-event" key={row.id}>
        <span className="activity-event-icon"><Activity size={18} /></span>
        <div className="activity-event-body"><div className="activity-event-title"><h3>{formatAction(row.action)}</h3><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString(getFormattingLocale())}</time></div><p><strong><LocalizedValue value={row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : "System"} /></strong> <Translate text={"updated"} />{" "}<span className="activity-entity">{row.entityType}</span>{row.entityId && <span className="activity-entity-id" title={row.entityId}> · {row.entityId}</span>}</p></div>
      </article>)}</div> : <div className="activity-empty"><span className="activity-empty-icon"><Activity size={26} /></span><h3><LocalizedValue value={hasFilters ? "No matching activity" : "No activity yet"} /></h3><p><LocalizedValue value={hasFilters ? "Try a wider date range or clear the filters to see more events." : "Changes to bookings, trips and your team will appear here."} /></p>{hasFilters && <Button variant="secondary" onClick={clear}><FilterX size={16} /> <Translate text={"Clear filters"} /></Button>}</div>}
    </Card>
  </>;
}
