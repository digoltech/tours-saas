"use client";

import { useEffect, useState } from "react";
import { Check, Save, Armchair } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import {
  getBuses,
  getSeatLayout,
  saveSeatLayout,
  type Bus,
} from "../auth/services/api-client";
function seatName(row: number, column: number) {
  return `${String.fromCharCode(65 + row)}${column + 1}`;
}
function typeForSeat(value?: string): SeatType {
  return value === "DOUBLE" ||
    value === "SLEEPER_LOWER" ||
    value === "SLEEPER_UPPER"
    ? value
    : "SINGLE";
}
type SeatType = "SINGLE" | "DOUBLE" | "SLEEPER_LOWER" | "SLEEPER_UPPER";
type Restriction = "ALL" | "FEMALE" | "MALE" | "SENIOR";
const typeNames: Record<SeatType, string> = {
  SINGLE: "Single seat",
  DOUBLE: "Double seat",
  SLEEPER_LOWER: "Lower berth",
  SLEEPER_UPPER: "Upper berth",
};
const defaultDetail = {
  type: "SINGLE" as SeatType,
  restriction: "ALL" as Restriction,
};
export function SeatLayoutBuilder() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(4);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [seatDetails, setSeatDetails] = useState<
    Record<string, { type: string; restriction: string }>
  >({});
  const [layoutMode, setLayoutMode] = useState<"seater" | "sleeper">("seater");
  const [selectedSeat, setSelectedSeat] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getBuses({ limit: "100", status: "ACTIVE" })
      .then((data) => setBuses(data.data))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load buses",
        ),
      );
  }, []);
  const activeBus = buses.find((bus) => bus.id === busId);
  const limit = activeBus?.totalSeats ?? rows * columns;
  const seatCount = limit;
  useEffect(() => {
    if (!busId) return;
    getSeatLayout(busId)
      .then((layout) => {
        setRows(layout.rows);
        setColumns(layout.columns);
        setDisabled(layout.disabledSeats);
        setSeatDetails(layout.seatDetails ?? {});
        setSelectedSeat("");
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load seat layout",
        ),
      );
  }, [busId]);
  function save() {
    if (!busId) return;
    setError("");
    saveSeatLayout(busId, {
      rows,
      columns,
      disabledSeats: disabled,
      seatDetails,
    })
      .then(() => setSaved(true))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to save seat layout",
        ),
      );
  }
  return (
    <>
      <PageHeader
        title="Seat layout builder"
        description="Build a passenger friendly bus map with seat and berth types, aisle positions, and eligibility rules."
        action={
          <Button onClick={save} disabled={!busId}>
            <Save size={16} /> Save layout
          </Button>
        }
      />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      <Card className="layout-setup-card">
        <div className="layout-setup-heading">
          <div>
            <p className="eyebrow">LAYOUT SETUP</p>
            <h2>Choose a bus and plan</h2>
          </div>
          <span className="layout-seat-count">{seatCount} seats</span>
        </div>
        <div className="form-grid">
          <label>
            Bus
            <select
              value={busId}
              onChange={(e) => {
                setBusId(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">Select a bus</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.busNumber} · {bus.registrationNumber} ({bus.totalSeats}{" "}
                  seats)
                </option>
              ))}
            </select>
          </label>
          <label>
            Rows
            <input
              type="number"
              min="1"
              max="26"
              value={rows}
              onChange={(e) => {
                setRows(Math.max(1, Math.min(26, Number(e.target.value))));
                setSaved(false);
              }}
            />
          </label>
          <label>
            Seats per row
            <input
              type="number"
              min="1"
              max="8"
              value={columns}
              onChange={(e) => {
                setColumns(Math.max(1, Math.min(8, Number(e.target.value))));
                setSaved(false);
              }}
            />
          </label>
        </div>
        <div className="seat-layout-controls">
          <div className="layout-mode-switch" aria-label="Bus layout type">
            <button
              type="button"
              className={layoutMode === "seater" ? "active" : ""}
              onClick={() => setLayoutMode("seater")}
            >
              Seater
            </button>
            <button
              type="button"
              className={layoutMode === "sleeper" ? "active" : ""}
              onClick={() => {
                setLayoutMode("sleeper");
                setSeatDetails((current) =>
                  Object.fromEntries(
                    Array.from({ length: seatCount }, (_, i) => {
                      const name = seatName(
                        Math.floor(i / columns),
                        i % columns,
                      );
                      return [
                        name,
                        {
                          ...defaultDetail,
                          type: i % 2 === 0 ? "SLEEPER_LOWER" : "SLEEPER_UPPER",
                        },
                      ];
                    }),
                  ),
                );
              }}
            >
              Sleeper coach
            </button>
          </div>
          <span className="muted">
            Click a seat to edit its type and passenger rules.
          </span>
        </div>
      </Card>
      {!busId ? (
        <Card>
          <div className="state-message">
            Select a bus to build its seat layout.
          </div>
        </Card>
      ) : (
        <Card className="seat-layout-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">BUS SEAT MAP · FRONT</p>
              <h2>{activeBus?.busNumber} seat plan</h2>
            </div>
            <Badge>{seatCount - disabled.length} available</Badge>
          </div>
          <div className="bus-editor">
            <div className="bus-outline">
              <div className="driver-cab">
                <Armchair size={18} /> Driver
              </div>
              <div
                className="seat-grid"
                style={{
                  gridTemplateColumns:
                    columns === 4
                      ? "repeat(2, minmax(54px, 1fr)) 28px repeat(2, minmax(54px, 1fr))"
                      : `repeat(${columns}, minmax(44px, 1fr))`,
                }}
              >
                {Array.from({ length: seatCount }, (_, index) => {
                  const name = seatName(
                    Math.floor(index / columns),
                    index % columns,
                  );
                  const unavailable = disabled.includes(name);
                  const detail = { ...defaultDetail, ...seatDetails[name] };
                  const type = detail.type as SeatType;
                  const restriction = detail.restriction as Restriction;
                  const isSelected = name === selectedSeat;
                  const gridColumn =
                    columns === 4 && index % columns >= 2
                      ? (index % columns) + 2
                      : (index % columns) + 1;
                  return (
                    <div
                      key={name}
                      className={`seat-unit ${unavailable ? "seat-unit-disabled" : ""} ${isSelected ? "seat-unit-selected" : ""}`}
                      style={columns === 4 ? { gridColumn } : undefined}
                    >
                      <button
                        type="button"
                        className={`seat-button seat-${type.toLowerCase().replaceAll("_", "-")} ${isSelected ? "is-selected" : ""}`}
                        aria-pressed={isSelected}
                        aria-label={`${name}, ${typeNames[type]}`}
                        onClick={() => setSelectedSeat(name)}
                      >
                        <b>{name}</b>
                        <small>
                          {restriction !== "ALL"
                            ? restriction === "SENIOR"
                              ? "Senior"
                              : `${restriction.toLowerCase()} only`
                            : type.startsWith("SLEEPER")
                              ? type.includes("LOWER")
                                ? "Lower berth"
                                : "Upper berth"
                              : type === "DOUBLE"
                                ? "Double"
                                : "Seat"}
                        </small>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <aside className="seat-inspector">
              {selectedSeat ? (
                <>
                  <p className="eyebrow">EDIT SEAT</p>
                  <h3>{selectedSeat}</h3>
                  <label>
                    Seat or berth type
                    <select
                      value={typeForSeat(seatDetails[selectedSeat]?.type)}
                      onChange={(e) => {
                        setSeatDetails((current) => ({
                          ...current,
                          [selectedSeat]: {
                            ...defaultDetail,
                            ...current[selectedSeat],
                            type: e.target.value,
                          },
                        }));
                        setSaved(false);
                      }}
                    >
                      <option value="SINGLE">Single seat</option>
                      <option value="DOUBLE">Double seat</option>
                      <option value="SLEEPER_LOWER">Lower berth</option>
                      <option value="SLEEPER_UPPER">Upper berth</option>
                    </select>
                  </label>
                  <label>
                    Passenger eligibility
                    <select
                      value={seatDetails[selectedSeat]?.restriction ?? "ALL"}
                      onChange={(e) => {
                        setSeatDetails((current) => ({
                          ...current,
                          [selectedSeat]: {
                            ...defaultDetail,
                            ...current[selectedSeat],
                            restriction: e.target.value,
                          },
                        }));
                        setSaved(false);
                      }}
                    >
                      <option value="ALL">Open to all</option>
                      <option value="FEMALE">Female only</option>
                      <option value="MALE">Male only</option>
                      <option value="SENIOR">Senior only</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="seat-inspector-disable"
                    onClick={() => {
                      setDisabled((current) =>
                        disabled.includes(selectedSeat)
                          ? current.filter((s) => s !== selectedSeat)
                          : [...current, selectedSeat],
                      );
                      setSaved(false);
                    }}
                  >
                    {disabled.includes(selectedSeat)
                      ? "Restore this seat"
                      : "Mark unavailable"}
                  </button>
                </>
              ) : (
                <div className="seat-inspector-empty">
                  <Armchair size={23} />
                  <strong>Select a seat</strong>
                  <span>
                    Choose any position on the map to edit its settings.
                  </span>
                </div>
              )}
            </aside>
          </div>
          <div className="seat-legend">
            <span>
              <i /> Available
            </span>
            <span>
              <i className="seat-legend-unavailable" /> Unavailable
            </span>
            <span>
              <i className="legend-seat-sleeper" />
              Berths
            </span>
            <span>
              <i className="legend-seat-female" />
              Female only
            </span>
            <span>
              <i className="legend-seat-senior" />
              Senior only
            </span>
          </div>
        </Card>
      )}
      {saved && (
        <p className="save-confirmation" role="status">
          <Check size={16} /> Layout saved for all agents.
        </p>
      )}
    </>
  );
}
