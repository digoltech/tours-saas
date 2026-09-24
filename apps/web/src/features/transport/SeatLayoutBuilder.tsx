"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getBuses, type Bus } from "../auth/services/api-client";

type SeatMap = Record<string, string[]>;
const key = "aone-seat-layouts-v1";
function seatName(row: number, column: number) { return `${String.fromCharCode(65 + row)}${column + 1}`; }
export function SeatLayoutBuilder() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(4);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { getBuses({ limit: "100", status: "ACTIVE" }).then((data) => setBuses(data.data)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load buses")); }, []);
  const activeBus = buses.find((bus) => bus.id === busId);
  const limit = activeBus?.totalSeats ?? rows * columns;
  const seatCount = limit;
  const layoutRows = useMemo(() => Math.max(rows, Math.ceil(seatCount / columns)), [rows, seatCount, columns]);
  useEffect(() => {
    if (!busId) return;
    const timer = window.setTimeout(() => {
      try {
        const layouts = JSON.parse(localStorage.getItem(key) ?? "{}") as SeatMap;
        setDisabled(layouts[busId] ?? []);
      } catch { setDisabled([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [busId]);
  function save() {
    if (!busId) return;
    try { const layouts = JSON.parse(localStorage.getItem(key) ?? "{}") as SeatMap; layouts[busId] = disabled; localStorage.setItem(key, JSON.stringify(layouts)); setSaved(true); }
    catch { setError("Unable to save this seat layout in this browser."); }
  }
  return <><PageHeader title="Seat layout builder" description="Arrange available seats for a bus and mark driver or non passenger positions as unavailable." action={<Button onClick={save} disabled={!busId}><Save size={16} /> Save layout</Button>} />
    {error && <div className="state-message state-error" role="alert">{error}</div>}
    <Card className="management-form"><div className="form-grid"><label>Bus<select value={busId} onChange={(e) => { setBusId(e.target.value); setSaved(false); }}><option value="">Select a bus</option>{buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.busNumber} · {bus.registrationNumber} ({bus.totalSeats} seats)</option>)}</select></label><label>Minimum rows<input type="number" min="1" max="26" value={rows} onChange={(e) => { setRows(Math.max(1, Math.min(26, Number(e.target.value)))); setSaved(false); }} /></label><label>Seats per row<input type="number" min="1" max="8" value={columns} onChange={(e) => { setColumns(Math.max(1, Math.min(8, Number(e.target.value)))); setSaved(false); }} /></label></div><p className="muted">Layout: {layoutRows} rows × {columns} columns · {seatCount} seat positions. Select a seat to mark it unavailable.</p></Card>
    {!busId ? <Card><div className="state-message">Select a bus to build its seat layout.</div></Card> : <Card className="seat-layout-card"><div className="card-heading"><div><p className="eyebrow">Front of bus</p><h2>{activeBus?.busNumber} seat plan</h2></div><Badge>{seatCount - disabled.length} available</Badge></div><div className="seat-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))` }}>{Array.from({ length: seatCount }, (_, index) => { const name = seatName(Math.floor(index / columns), index % columns); const unavailable = disabled.includes(name); return <button key={name} type="button" className={`seat-button ${unavailable ? "seat-unavailable" : ""}`} aria-pressed={unavailable} aria-label={`${name}, ${unavailable ? "unavailable" : "available"}`} onClick={() => { setDisabled((current) => unavailable ? current.filter((seat) => seat !== name) : [...current, name]); setSaved(false); }}>{unavailable ? "×" : name}</button>; })}</div><div className="seat-legend"><span><i /> Available</span><span><i className="seat-legend-unavailable" /> Unavailable</span></div></Card>}
    {saved && <p className="save-confirmation" role="status"><Check size={16} /> Layout saved on this device.</p>}<p className="muted settings-note">Layouts are saved locally for this Phase 1 UI. They do not update the bus database record.</p>
  </>;
}
