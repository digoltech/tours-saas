"use client";

import { useState } from "react";
import { Armchair, Bed } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { cn } from "../../lib/utils";

export type SeatLayoutData = {
  rows: number;
  columns: number;
  disabledSeats: string[];
  seatDetails: Record<string, { type: string; restriction: string }>;
};

type SeatType = "SINGLE" | "DOUBLE" | "SLEEPER_LOWER" | "SLEEPER_UPPER";
type Restriction = "ALL" | "FEMALE" | "MALE" | "SENIOR";
const defaultDetail = { type: "SINGLE" as SeatType, restriction: "ALL" as Restriction };
const typeNames: Record<SeatType, string> = {
  SINGLE: "Single seat",
  DOUBLE: "Double seat",
  SLEEPER_LOWER: "Lower berth",
  SLEEPER_UPPER: "Upper berth",
};

function seatName(index: number, columns: number) {
  return `${String.fromCharCode(65 + Math.floor(index / columns))}${(index % columns) + 1}`;
}

export function createDefaultSeatLayout(totalSeats: number): SeatLayoutData {
  const columns = 4;
  return {
    rows: Math.max(1, Math.ceil(totalSeats / columns)),
    columns,
    disabledSeats: [],
    seatDetails: {},
  };
}

export function SeatLayoutEditor({
  totalSeats,
  value,
  onChange,
}: {
  totalSeats: number;
  value: SeatLayoutData;
  onChange: (layout: SeatLayoutData) => void;
}) {
  const [selectedSeat, setSelectedSeat] = useState("");
  const update = (changes: Partial<SeatLayoutData>) => onChange({ ...value, ...changes });
  const seatCount = Math.max(1, totalSeats || value.rows * value.columns);
  const selectedDetail = selectedSeat
    ? { ...defaultDetail, ...value.seatDetails[selectedSeat] }
    : defaultDetail;

  function setSeatDetail(changes: Partial<{ type: SeatType; restriction: Restriction }>) {
    if (!selectedSeat) return;
    update({
      seatDetails: {
        ...value.seatDetails,
        [selectedSeat]: { ...selectedDetail, ...changes },
      },
    });
  }

  function selectSleeperLayout(columns = value.columns) {
    update({
      columns,
      seatDetails: Object.fromEntries(
        Array.from({ length: seatCount }, (_, index) => [
          seatName(index, columns),
          {
            ...defaultDetail,
            type: index % 2 === 0 ? "SLEEPER_LOWER" : "SLEEPER_UPPER",
          },
        ]),
      ),
    });
  }

  return (
    <div className="space-y-5">
      <Card className="layout-setup-card">
        <div className={cn("layout-setup-heading")}>
          <div>
            <p className={cn("eyebrow")}>LAYOUT SETUP</p>
            <h2>Plan the passenger seats</h2>
          </div>
          <span className={cn("layout-seat-count")}>{seatCount} seats</span>
        </div>
        <div className={cn("form-grid")}>
          <label>
            Rows
            <input
              type="number"
              min="1"
              max="26"
              value={value.rows}
              onChange={(event) => update({ rows: Math.max(1, Math.min(26, Number(event.target.value))) })}
            />
          </label>
          <label>
            Seats per row
            <input
              type="number"
              min="1"
              max="8"
              value={value.columns}
              onChange={(event) => update({ columns: Math.max(1, Math.min(8, Number(event.target.value))) })}
            />
          </label>
        </div>
        <div className={cn("seat-layout-controls")}>
          <div className={cn("layout-mode-switch")} role="group" aria-label="Bus layout type">
            <button type="button" className={cn(value.columns === 4 ? "active" : "")} onClick={() => update({ columns: 4 })}><Armchair size={15} /> Seater</button>
            <button type="button" className={cn(value.columns === 2 ? "active" : "")} onClick={() => selectSleeperLayout(2)}><Bed size={15} /> Sleeper coach</button>
          </div>
          <span className={cn("muted")}>Select seats to edit their type, passenger rules, or availability.</span>
        </div>
      </Card>

      <Card className="seat-layout-card">
        <div className={cn("card-heading")}>
          <div>
            <p className={cn("eyebrow")}>BUS SEAT MAP · FRONT</p>
            <h2>Seat plan</h2>
          </div>
          <Badge>{seatCount - value.disabledSeats.length} available</Badge>
        </div>
        <div className={cn("bus-editor")}>
          <div className={cn("bus-outline")}>
            <div className={cn("driver-cab")}><Armchair size={18} /> Driver</div>
            <div
              className={cn("seat-grid")}
              style={{ gridTemplateColumns: value.columns === 4 ? "repeat(2, minmax(54px, 1fr)) 28px repeat(2, minmax(54px, 1fr))" : `repeat(${value.columns}, minmax(44px, 1fr))` }}
            >
              {Array.from({ length: seatCount }, (_, index) => {
                const name = seatName(index, value.columns);
                const unavailable = value.disabledSeats.includes(name);
                const detail = { ...defaultDetail, ...value.seatDetails[name] };
                const type = detail.type as SeatType;
                const selected = selectedSeat === name;
                const gridColumn = value.columns === 4 && index % value.columns >= 2 ? (index % value.columns) + 2 : (index % value.columns) + 1;
                return (
                  <div key={name} className={cn(`seat-unit ${unavailable ? "seat-unit-disabled" : ""} ${selected ? "seat-unit-selected" : ""}`)} style={value.columns === 4 ? { gridColumn } : undefined}>
                    <button
                      type="button"
                      className={cn(`seat-button seat-${type.toLowerCase().replaceAll("_", "-")} ${selected ? "is-selected" : ""}`)}
                      aria-pressed={selected}
                      aria-label={`${name}, ${typeNames[type]}`}
                      onClick={() => setSelectedSeat(name)}
                    >
                      <b>{name}</b>
                      <small>{detail.restriction !== "ALL" ? (detail.restriction === "SENIOR" ? "Senior" : `${detail.restriction.toLowerCase()} only`) : type.startsWith("SLEEPER") ? (type.includes("LOWER") ? "Lower berth" : "Upper berth") : type === "DOUBLE" ? "Double" : "Seat"}</small>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <aside className={cn("seat-inspector")}>
            {selectedSeat ? (
              <>
                <p className={cn("eyebrow")}>EDIT SEAT</p>
                <h3>{selectedSeat}</h3>
                <label>Seat or berth type
                  <select value={selectedDetail.type} onChange={(event) => setSeatDetail({ type: event.target.value as SeatType })}>
                    <option value="SINGLE">Single seat</option><option value="DOUBLE">Double seat</option><option value="SLEEPER_LOWER">Lower berth</option><option value="SLEEPER_UPPER">Upper berth</option>
                  </select>
                </label>
                <label>Passenger eligibility
                  <select value={selectedDetail.restriction} onChange={(event) => setSeatDetail({ restriction: event.target.value as Restriction })}>
                    <option value="ALL">Open to all</option><option value="FEMALE">Female only</option><option value="MALE">Male only</option><option value="SENIOR">Senior only</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={cn("seat-inspector-disable")}
                  onClick={() => update({ disabledSeats: value.disabledSeats.includes(selectedSeat) ? value.disabledSeats.filter((name) => name !== selectedSeat) : [...value.disabledSeats, selectedSeat] })}
                >
                  {value.disabledSeats.includes(selectedSeat) ? "Restore this seat" : "Mark unavailable"}
                </button>
              </>
            ) : (
              <div className={cn("seat-inspector-empty")}><Armchair size={23} /><strong>Select a seat</strong><span>Choose any position on the map to edit its settings.</span></div>
            )}
          </aside>
        </div>
        <div className={cn("seat-legend")}><span><i /> Available</span><span><i className={cn("seat-legend-unavailable")} /> Unavailable</span><span><i className={cn("legend-seat-sleeper")} /> Berths</span><span><i className={cn("legend-seat-female")} /> Female only</span><span><i className={cn("legend-seat-senior")} /> Senior only</span></div>
      </Card>
    </div>
  );
}
