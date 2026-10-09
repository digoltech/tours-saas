"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BusFront, MapPin } from "lucide-react";
import {
  getBusById,
  getBuses,
  getTrips,
  deactivateBusById,
  type Bus,
  type Trip,
} from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import {
  RecordPage,
  RecordFields,
  RecordSection,
  EditRecordLink,
} from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { useConfirmation } from "../../ui/ConfirmationModal";
import "../../styles/fleet-profiles.css";

function FleetCard({ bus }: { bus: Bus }) {
  const t = useTranslations();
  return (
    <Link href={`/dashboard/buses/${bus.id}`} className="fleet-profile-card">
      <div className="fleet-vehicle-icon">
        <BusFront size={28} />
        <Badge>{t(bus.status)}</Badge>
      </div>
      <h3>{bus.busNumber}</h3>
      <p>{bus.registrationNumber}</p>
      <div className="fleet-card-specs">
        <span>{t(bus.busType.replaceAll("_", " "))}</span>
        <span>
          {bus.totalSeats} {t("Seats")}
        </span>
      </div>
      <div className="fleet-card-footer">
        <span>
          <MapPin size={14} />
          {bus.branch.name}
        </span>
        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}
export function OperatorProfile({ name }: { name: string }) {
  const t = useTranslations();
  let operatorName = name;
  try {
    operatorName = decodeURIComponent(name);
  } catch {
    /* Preserve literal percent signs in an operator name. */
  }
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const all: Bus[] = [];
      let page = 1;
      let pages: number;
      do {
        const result = await getBuses({ limit: "100", page: String(page) });
        all.push(...result.data);
        pages = result.meta.totalPages;
        page++;
      } while (page <= pages && active);
      if (active)
        setBuses(
          all.filter((bus) => bus.operatorName?.trim() === operatorName),
        );
    }
    void load()
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load operator",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [operatorName]);
  return (
    <RecordPage
      title={operatorName}
      description="Operator profile and assigned fleet"
      eyebrow="Operator profile"
      backHref="/dashboard/operators"
      summary={
        !loading
          ? [
              { label: "Buses", value: buses.length },
              {
                label: "Active vehicles",
                value: buses.filter((bus) => bus.status === "ACTIVE").length,
              },
              {
                label: "Total seats",
                value: buses.reduce((sum, bus) => sum + bus.totalSeats, 0),
              },
              {
                label: "Branches",
                value: new Set(buses.map((bus) => bus.branch.id)).size,
              },
            ]
          : undefined
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {loading ? (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      ) : (
        <RecordSection
          title="Related buses"
          description="Open a vehicle to review its details, facilities and journeys."
        >
          {buses.length ? (
            <div className="fleet-profile-grid">
              {buses.map((bus) => (
                <FleetCard key={bus.id} bus={bus} />
              ))}
            </div>
          ) : (
            <p>{t("No buses found for this operator.")}</p>
          )}
        </RecordSection>
      )}
    </RecordPage>
  );
}
export function BusProfile({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  const { user } = useAuth();
  const confirm = useConfirmation();
  const [bus, setBus] = useState<Bus | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit =
    user?.role === "SUPER_ADMIN" || user?.permissions.includes("bus:update");
  const canDelete =
    user?.role === "SUPER_ADMIN" || user?.permissions.includes("bus:delete");
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getBusById(id),
      getTrips({ busId: id, limit: "10" }),
    ]).then(([vehicle, journeys]) => {
      if (!active) return;
      if (vehicle.status === "fulfilled") setBus(vehicle.value);
      else
        setError(
          vehicle.reason instanceof Error
            ? vehicle.reason.message
            : "Unable to load bus",
        );
      if (journeys.status === "fulfilled") setTrips(journeys.value.data);
      else
        setError(
          journeys.reason instanceof Error
            ? journeys.reason.message
            : "Unable to load trips",
        );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);
  async function deactivate() {
    if (
      !bus ||
      !(await confirm({
        title: "Deactivate bus?",
        description: "Inactive vehicles remain available for reference.",
        confirmLabel: "Deactivate",
        destructive: true,
      }))
    )
      return;
    setSaving(true);
    try {
      await deactivateBusById(id);
      setBus({ ...bus, status: "INACTIVE" });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to deactivate bus",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <RecordPage
      title={bus?.busNumber ?? "Bus details"}
      description="Vehicle information, facilities and related journeys."
      eyebrow="Bus profile"
      backHref="/dashboard/buses"
      actions={
        bus && (
          <>
            <Badge>{t(bus.status)}</Badge>
            {canEdit && <EditRecordLink href={`/dashboard/buses/${id}/edit`} />}
          </>
        )
      }
      summary={
        bus
          ? [
              { label: "Registration number", value: bus.registrationNumber },
              { label: "Bus type", value: t(bus.busType.replaceAll("_", " ")) },
              { label: "Total seats", value: bus.totalSeats },
              { label: "Branch", value: bus.branch.name },
            ]
          : undefined
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {loading ? (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      ) : (
        bus && (
          <>
            <RecordSection title="Vehicle details">
              <RecordFields
                fields={[
                  { label: "Make", value: bus.make },
                  { label: "Model", value: bus.model },
                  { label: "Year", value: bus.year },
                  { label: "Color", value: bus.color },
                  {
                    label: "Operator",
                    value: bus.operatorName ? (
                      <Link
                        className="text-link"
                        href={`/dashboard/operators/${encodeURIComponent(bus.operatorName.trim())}`}
                      >
                        {bus.operatorName}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Branch", value: bus.branch.name },
                ]}
              />
              {bus.description && (
                <p className="fleet-description">{bus.description}</p>
              )}
            </RecordSection>
            <RecordSection title="Facilities & photos">
              <div className="fleet-amenities">
                {bus.amenities?.length ? (
                  bus.amenities.map((item) => <span key={item}>{t(item)}</span>)
                ) : (
                  <p className="record-help">{t("No facilities added.")}</p>
                )}
              </div>
              {!!bus.photos?.length && (
                <div className="fleet-photo-grid">
                  {bus.photos.map((src, index) => (
                    <Image
                      key={`${src}-${index}`}
                      src={src}
                      alt={`${bus.busNumber} · ${index + 1}`}
                      width={480}
                      height={300}
                      unoptimized
                    />
                  ))}
                </div>
              )}
            </RecordSection>
            <RecordSection
              title="Related journeys"
              description="Recent journeys assigned to this vehicle."
            >
              {trips.length ? (
                <div className="fleet-journeys">
                  {trips.map((trip) => (
                    <Link
                      key={trip.id}
                      className="record-related-link"
                      href={`/dashboard/trips/${trip.id}`}
                    >
                      <span>
                        <strong>
                          {trip.route.source} → {trip.route.destination}
                        </strong>
                        <small>
                          {trip.tripCode} ·{" "}
                          {new Date(trip.departureTime).toLocaleString(locale, { timeZone: "Asia/Kolkata" })} · ₹
                          {Number(trip.fare).toLocaleString(locale)}
                        </small>
                      </span>
                      <Badge>{t(trip.status)}</Badge>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p>{t("No trips scheduled.")}</p>
              )}
            </RecordSection>
            {canEdit && (
              <RecordSection title="Seat layout">
                <p className="record-help">
                  {t(
                    "Manage seat names, availability and the passenger layout.",
                  )}
                </p>
                <Link
                  className="button button-secondary"
                  href={`/dashboard/buses/${id}/edit?step=layout`}
                >
                  {t("Edit seat layout")}
                </Link>
              </RecordSection>
            )}
            {canDelete && bus.status === "ACTIVE" && (
              <RecordSection title="Record status">
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => void deactivate()}
                >
                  {t("Deactivate")}
                </Button>
              </RecordSection>
            )}
          </>
        )
      )}
    </RecordPage>
  );
}
