"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getBuses, getSeatLayout, saveSeatLayout, type Bus } from "../auth/services/api-client";
import { createDefaultSeatLayout, SeatLayoutEditor, type SeatLayoutData } from "./SeatLayoutEditor";

export function SeatLayoutBuilder() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [layout, setLayout] = useState<SeatLayoutData>(createDefaultSeatLayout(40));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBuses({ limit: "100", status: "ACTIVE" })
      .then((data) => setBuses(data.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load buses"));
  }, []);

  const activeBus = buses.find((bus) => bus.id === busId);
  async function selectBus(id: string) {
    setBusId(id);
    setSaved(false);
    setError("");
    if (!id) return;
    setLoading(true);
    try {
      const current = await getSeatLayout(id);
      setLayout({ ...current, seatDetails: current.seatDetails ?? {} });
    } catch (cause) {
      setLayout(createDefaultSeatLayout(buses.find((bus) => bus.id === id)?.totalSeats ?? 40));
      setError(cause instanceof Error ? cause.message : "Unable to load seat layout");
    } finally {
      setLoading(false);
    }
  }
  async function save() {
    if (!busId) return;
    setError("");
    try {
      await saveSeatLayout(busId, layout);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save seat layout");
    }
  }

  return (
    <>
      <PageHeader
        title="Seat layout builder"
        description="Plan seats and berths, and set passenger rules for a bus."
      />
      {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
      <Card className="layout-setup-card">
        <div className="layout-setup-heading"><div><p className="eyebrow">LAYOUT SETUP</p><h2>Choose a bus</h2></div>{activeBus && <Badge>{activeBus.totalSeats} seats</Badge>}</div>
        <label className="block max-w-xl">Bus
          <select value={busId} onChange={(event) => void selectBus(event.target.value)}>
            <option value="">Select a bus</option>
            {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.busNumber} · {bus.registrationNumber} ({bus.totalSeats} seats)</option>)}
          </select>
        </label>
      </Card>
      {busId ? loading ? <Card><div className={cn("state-message")}>Loading seat layout…</div></Card> : <SeatLayoutEditor totalSeats={activeBus?.totalSeats ?? 40} value={layout} onChange={(value) => { setLayout(value); setSaved(false); }} /> : <Card><div className={cn("state-message")}>Select a bus to build its seat layout.</div></Card>}
      {busId && <div className="mt-4 flex justify-end"><Button onClick={() => void save()} disabled={loading}><Save size={16} /> Save layout</Button></div>}
      {saved && <p className={cn("save-confirmation")} role="status"><Check size={16} /> Layout saved for {activeBus?.busNumber}.</p>}
    </>
  );
}
