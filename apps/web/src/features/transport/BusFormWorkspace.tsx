"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";

import "../../styles/transport.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BusFront, Check, CheckCircle2, ClipboardList, ImagePlus, Info, LayoutGrid, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useConfirmation, confirmStatusChange } from "../../ui/ConfirmationModal";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { RecordPage } from "../../ui/RecordPage";
import { cn } from "../../lib/utils";
import { useAuth } from "../auth/components/AuthProvider";
import { createBus, getAgencies, getBranches, getBusById, getSeatLayout, saveSeatLayout, updateBus, type Branch } from "../auth/services/api-client";
import { createDefaultSeatLayout, SeatLayoutEditor, type SeatLayoutData } from "./SeatLayoutEditor";

const steps = [
  { title: "Bus details", description: "Identity and assignment", icon: BusFront },
  { title: "Features & photos", description: "Optional fleet information", icon: ImagePlus },
  { title: "Seat layout", description: "Seats and passenger rules", icon: LayoutGrid },
  { title: "Review", description: "Check before saving", icon: ClipboardList },
];
const amenitiesOptions = ["Air conditioning", "Wi-Fi", "USB charging", "Reading lights", "Water bottle", "Blanket", "Entertainment", "GPS tracking"];

type BusForm = {
  busNumber: string;
  registrationNumber: string;
  operatorName: string;
  busType: "SEATER" | "SLEEPER" | "SEATER_SLEEPER";
  totalSeats: string;
  branchId: string;
  status: string;
  make: string;
  model: string;
  year: string;
  color: string;
  description: string;
  amenities: string[];
  photos: string[];
};
const emptyForm: BusForm = {
  busNumber: "", registrationNumber: "", operatorName: "", busType: "SEATER", totalSeats: "40", branchId: "", status: "ACTIVE",
  make: "", model: "", year: "", color: "", description: "", amenities: [], photos: [],
};

const inputClass = "bus-form-input";
const labelClass = "bus-form-label";

export function BusFormWorkspace({ busId, initialStep = 0 }: { busId?: string; initialStep?: number }) {
  const router = useRouter();
  const confirm = useConfirmation();
  const [originalStatus, setOriginalStatus] = useState<string>();
  const { user } = useAuth();
  const editing = Boolean(busId);
  const [form, setForm] = useState<BusForm>({ ...emptyForm, branchId: user?.branchId ?? "" });
  const [createdBusId, setCreatedBusId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [layout, setLayout] = useState<SeatLayoutData>(() => createDefaultSeatLayout(40));
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoDraft, setPhotoDraft] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        if (user?.role === "SUPER_ADMIN") {
          const rows = await getAgencies() as { id: string; name: string }[];
          if (!active) return;
          setAgencies(rows);
          setSelectedAgencyId((current) => current || rows[0]?.id || "");
          const branchLists = await Promise.all(rows.map((agency) => getBranches(agency.id)));
          if (active) setBranches(branchLists.flat() as Branch[]);
        } else if (user?.agencyId) {
          const rows = await getBranches(user.agencyId);
          if (active) setBranches(rows as Branch[]);
        }
      } catch {
        if (active) setBranches([]);
      }
    }
    void loadOptions();
    return () => { active = false; };
  }, [user?.agencyId, user?.role]);

  useEffect(() => {
    if (!busId) return;
    let active = true;
    Promise.all([getBusById(busId), getSeatLayout(busId)])
      .then(([bus, seatLayout]) => {
        if (!active) return;
        setSelectedAgencyId(bus.branch.agencyId ?? user?.agencyId ?? "");
        setOriginalStatus(bus.status);
        setForm({
          busNumber: bus.busNumber,
          registrationNumber: bus.registrationNumber,
          operatorName: bus.operatorName ?? "",
          busType: bus.busType as BusForm["busType"],
          totalSeats: String(bus.totalSeats),
          branchId: bus.branch.id,
          status: bus.status,
          make: bus.make ?? "",
          model: bus.model ?? "",
          year: bus.year ? String(bus.year) : "",
          color: bus.color ?? "",
          description: bus.description ?? "",
          amenities: bus.amenities ?? [],
          photos: bus.photos ?? [],
        });
        setLayout({ ...seatLayout, seatDetails: seatLayout.seatDetails ?? {} });
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : localizeText("Unable to load bus details"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [busId, user?.agencyId]);

  const availableBranches = useMemo(
    () => branches.filter((branch) => user?.role !== "SUPER_ADMIN" || branch.agencyId === selectedAgencyId),
    [branches, selectedAgencyId, user?.role],
  );
  const setField = <K extends keyof BusForm>(key: K, value: BusForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  function validateDetails() {
    const missing = [
      [form.busNumber, "Bus number"],
      [form.registrationNumber, "Registration number"],
      [form.branchId, "Branch"],
      [form.totalSeats, "Seat count"],
    ].find(([value]) => !value.trim());
    if (missing) { setError(`${missing[1]} is required.`); return false; }
    if (Number(form.totalSeats) < 1 || !Number.isInteger(Number(form.totalSeats)) || Number(form.totalSeats) > 1000) {
      setError(localizeText("Enter a seat count from 1 to 1,000.")); return false;
    }
    if (form.year && (!Number.isInteger(Number(form.year)) || Number(form.year) < 1950 || Number(form.year) > 2100)) {
      setError(localizeText("Enter a valid manufacturing year.")); return false;
    }
    setError("");
    return true;
  }

  function nextStep() {
    if (step === 0 && !validateDetails()) return;
    setError("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function addPhoto() {
    const url = photoDraft.trim();
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
    } catch {
      setError(localizeText("Enter a complete image URL beginning with http:// or https://."));
      return;
    }
    if (form.photos.includes(url)) { setError(localizeText("That photo is already in the list.")); return; }
    if (form.photos.length >= 12) { setError(localizeText("You can add up to 12 bus photos.")); return; }
    setField("photos", [...form.photos, url]);
    setPhotoDraft("");
    setError("");
  }

  async function save() {
    if (saving || !(user?.role === "SUPER_ADMIN" || user?.permissions.includes(editing ? "bus:update" : "bus:create"))) return;
    if (!validateDetails()) { setStep(0); return; }
    if (!(await confirmStatusChange(confirm, form.busNumber, originalStatus, form.status))) return;
    setSaving(true);
    setError("");
    const payload = {
      busNumber: form.busNumber.trim(),
      registrationNumber: form.registrationNumber.trim(),
      operatorName: form.operatorName.trim() || undefined,
      busType: form.busType,
      totalSeats: Number(form.totalSeats),
      branchId: form.branchId,
      status: form.status,
      ...(user?.role === "SUPER_ADMIN" ? { agencyId: selectedAgencyId } : {}),
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: form.year ? Number(form.year) : null,
      color: form.color.trim() || null,
      description: form.description.trim() || null,
      amenities: form.amenities,
      photos: form.photos,
    };
    try {
      let savedId = busId || createdBusId;
      if (savedId) await updateBus(savedId, payload);
      else {
        const created = await createBus(payload);
        savedId = created.id;
        setCreatedBusId(savedId);
      }
      await saveSeatLayout(savedId!, layout);
      router.push(`/dashboard/buses/${savedId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : localizeText("Unable to save bus"));
    } finally {
      setSaving(false);
    }
  }

  if (!(user?.role === "SUPER_ADMIN" || user?.permissions.includes(editing ? "bus:update" : "bus:create"))) return <Card><p>You do not have permission to change this record.</p><Link className="text-link" href="/dashboard/buses">Back to buses</Link></Card>;

  if (loading) return <Card><div className="bus-form-style-203"><LoaderCircle className="bus-form-style-203-2" size={18} /> <Translate text={"Loading bus details…"} /></div></Card>;

  return (
    <RecordPage
      title={editing ? "Edit bus" : "Add a bus"}
      description={editing ? "Update vehicle information, photos, or passenger layout." : "Set up the vehicle, add optional fleet details, then map its seats."}
      backHref={busId ? `/dashboard/buses/${busId}` : "/dashboard/buses"}
      backLabel={busId ? "Back to details" : "Back to list"}
      eyebrow={editing ? "Edit vehicle" : "New vehicle"}
    >
      <Card className="bus-form-style-218">
        <nav aria-label="Bus setup steps" className="bus-form-style-219">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <button
              key={title}
              type="button"
              disabled={index > step}
              onClick={() => setStep(index)}
              aria-current={step === index ? "step" : undefined}
              className={cn("bus-form-style-227", step === index ? "bus-form-style-227-2" : index < step ? "bus-form-style-227-3" : "bus-form-style-227-4")}
            >
              <span className={cn("bus-form-style-229", step === index ? "bus-form-style-229-2" : index < step ? "bus-form-style-229-3" : "bus-form-style-229-4")}>
                {index < step ? <Check size={17} /> : <Icon size={17} />}
              </span>
              <span className="bus-form-style-232"><strong className="bus-form-style-232-2">{title}</strong><small className="bus-form-style-232-3">{description}</small></span>
            </button>
          ))}
        </nav>

        <div className="bus-form-style-237">
          {error && <div role="alert" className="bus-form-style-238"><Info className="bus-form-style-238-2" size={17} /> {error}</div>}

          {step === 0 && (
            <section className="bus-form-style-241" aria-labelledby="bus-details-heading">
              <div><h2 id="bus-details-heading" className="bus-form-style-242"><Translate text={"Vehicle and assignment"} /></h2><p className="bus-form-style-242-2"><Translate text={"Enter the identifiers needed to add a vehicle to the fleet."} /></p></div>
              {user?.role === "SUPER_ADMIN" && <label className={labelClass}><Translate text={"Agency"} />{" "}<span className="bus-form-style-243">*</span><select className={inputClass} value={selectedAgencyId} onChange={(event) => { setSelectedAgencyId(event.target.value); setField("branchId", ""); }}><option value=""><Translate text={"Select agency"} /></option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
              <div className="bus-form-style-244">
                <label className={labelClass}><Translate text={"Bus number"} />{" "}<span className="bus-form-style-245">*</span><input className={inputClass} value={form.busNumber} onChange={(event) => setField("busNumber", event.target.value)} placeholder="e.g. AT-204" autoComplete="off" /></label>
                <label className={labelClass}><Translate text={"Registration number"} />{" "}<span className="bus-form-style-246">*</span><input className={inputClass} value={form.registrationNumber} onChange={(event) => setField("registrationNumber", event.target.value.toUpperCase())} placeholder="e.g. KA 01 AB 1234" autoComplete="off" /></label>
                <label className={labelClass}><Translate text={"Operator name"} />{" "}<span className="bus-form-style-247"><Translate text={"Optional"} /></span><input className={inputClass} value={form.operatorName} onChange={(event) => setField("operatorName", event.target.value)} placeholder="Company or owner" /></label>
                <label className={labelClass}><Translate text={"Bus type"} />{" "}<span className="bus-form-style-248">*</span><select className={inputClass} value={form.busType} onChange={(event) => setField("busType", event.target.value as BusForm["busType"])}><option value="SEATER"><Translate text={"Seater"} /></option><option value="SLEEPER"><Translate text={"Sleeper"} /></option><option value="SEATER_SLEEPER"><Translate text={"Seater + sleeper"} /></option></select></label>
                <label className={labelClass}><Translate text={"Total seats / berths"} />{" "}<span className="bus-form-style-249">*</span><input className={inputClass} type="number" min="1" max="1000" value={form.totalSeats} onChange={(event) => setField("totalSeats", event.target.value)} /></label>
                <label className={labelClass}><Translate text={"Branch"} />{" "}<span className="bus-form-style-250">*</span><select className={inputClass} value={form.branchId} onChange={(event) => setField("branchId", event.target.value)}><option value=""><Translate text={"Select branch"} /></option>{availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                {editing && <label className={labelClass}><Translate text={"Status"} /><select className={inputClass} value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="ACTIVE"><Translate text={"Active"} /></option><option value="INACTIVE"><Translate text={"Inactive"} /></option></select></label>}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="bus-form-style-257" aria-labelledby="bus-features-heading">
              <div><h2 id="bus-features-heading" className="bus-form-style-258"><Translate text={"Fleet details and photos"} /></h2><p className="bus-form-style-258-2"><Translate text={"Everything on this step is optional. Add useful specifications and public image links."} /></p></div>
              <div className="bus-form-style-259">
                <label className={labelClass}><Translate text={"Manufacturer"} /><input className={inputClass} value={form.make} onChange={(event) => setField("make", event.target.value)} placeholder="Volvo" /></label>
                <label className={labelClass}><Translate text={"Model"} /><input className={inputClass} value={form.model} onChange={(event) => setField("model", event.target.value)} placeholder="9400 B8R" /></label>
                <label className={labelClass}><Translate text={"Year"} /><input className={inputClass} type="number" min="1950" max="2100" value={form.year} onChange={(event) => setField("year", event.target.value)} placeholder="2025" /></label>
                <label className={labelClass}><Translate text={"Color"} /><input className={inputClass} value={form.color} onChange={(event) => setField("color", event.target.value)} placeholder="White / blue" /></label>
              </div>
              <label className={labelClass}><Translate text={"Description"} />{" "}<span className="bus-form-style-265"><Translate text={"Optional"} /></span><textarea className={cn(inputClass, "bus-form-style-265-2")} maxLength={2000} value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Notes about the vehicle, configuration, or service class" /></label>
              <fieldset>
                <legend className="bus-form-style-267"><Translate text={"Amenities"} />{" "}<span className="bus-form-style-267-2"><Translate text={"Optional"} /></span></legend>
                <div className="bus-form-style-268">
                  {amenitiesOptions.map((amenity) => <label key={amenity} className={cn("bus-form-style-269", form.amenities.includes(amenity) ? "bus-form-style-269-2" : "bus-form-style-269-3")}><input type="checkbox" className="bus-form-style-269-4" checked={form.amenities.includes(amenity)} onChange={(event) => setField("amenities", event.target.checked ? [...form.amenities, amenity] : form.amenities.filter((item) => item !== amenity))} />{amenity}</label>)}
                </div>
              </fieldset>
              <div className="bus-form-style-272">
                <label htmlFor="bus-photo-url" className={labelClass}><Translate text={"Bus image URL"} />{" "}<span className="bus-form-style-273"><Translate text={"Optional · up to 12"} /></span></label>
                <div className="bus-form-style-274"><input id="bus-photo-url" className={inputClass + "bus-form-style-274-2"} type="url" value={photoDraft} onChange={(event) => setPhotoDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPhoto(); } }} placeholder="https://example.com/bus-front.jpg" /><Button type="button" variant="secondary" onClick={addPhoto} disabled={!photoDraft.trim()}><Plus size={16} /> <Translate text={"Add image"} /></Button></div>
                {form.photos.length > 0 ? <div className="bus-form-style-275">{form.photos.map((photo, index) => <figure key={photo} className="group bus-form-style-275-2"><img loading="lazy" decoding="async" src={photo} alt={`Bus photo ${index + 1}`} className="bus-form-style-275-3" /><figcaption className="bus-form-style-275-4"><Translate text={"Photo"} />{" "}{index + 1}</figcaption><button type="button" aria-label={`Remove bus photo ${index + 1}`} onClick={async () => { if (await confirm({ title: "Remove photo?", description: `Remove photo ${index + 1} from this bus? Save the bus to apply this change.`, confirmLabel: "Remove" })) setField("photos", form.photos.filter((value) => value !== photo)); }} className="bus-form-style-275-5"><Trash2 size={16} /></button></figure>)}</div> : <div className="bus-form-style-275-6"><ImagePlus size={18} /> <Translate text={"No bus photos added"} /></div>}
              </div>
            </section>
          )}

          {step === 2 && <section className="bus-form-style-280" aria-labelledby="seat-layout-heading"><div><h2 id="seat-layout-heading" className="bus-form-style-280-2"><Translate text={"Seat layout"} /></h2><p className="bus-form-style-280-3"><Translate text={"Map each seat or berth. This layout will be saved with the bus."} /></p></div><SeatLayoutEditor totalSeats={Number(form.totalSeats) || 40} value={layout} onChange={setLayout} /></section>}

          {step === 3 && (
            <section className="bus-form-style-283" aria-labelledby="bus-review-heading">
              <div><h2 id="bus-review-heading" className="bus-form-style-284"><Translate text={"Review bus setup"} /></h2><p className="bus-form-style-284-2"><Translate text={"Confirm the required details and the seat plan before saving."} /></p></div>
              <div className="bus-form-style-285">
                <div className="bus-form-style-286"><div className="bus-form-style-286-2"><div><p className="bus-form-style-286-3"><Translate text={"Vehicle"} /></p><h3 className="bus-form-style-286-4">{form.busNumber || "Bus number not set"}</h3></div><Badge>{form.status}</Badge></div><dl className="bus-form-style-286-5"><div><dt className="bus-form-style-286-6"><Translate text={"Registration"} /></dt><dd className="bus-form-style-286-7">{form.registrationNumber || "—"}</dd></div><div><dt className="bus-form-style-286-8"><Translate text={"Type"} /></dt><dd className="bus-form-style-286-9">{form.busType.replaceAll("_", " + ")}</dd></div><div><dt className="bus-form-style-286-10"><Translate text={"Seats"} /></dt><dd className="bus-form-style-286-11">{form.totalSeats}</dd></div><div><dt className="bus-form-style-286-12"><Translate text={"Branch"} /></dt><dd className="bus-form-style-286-13">{availableBranches.find((branch) => branch.id === form.branchId)?.name ?? "—"}</dd></div><div><dt className="bus-form-style-286-14"><Translate text={"Make / model"} /></dt><dd className="bus-form-style-286-15">{[form.make, form.model].filter(Boolean).join(" ") || "—"}</dd></div><div><dt className="bus-form-style-286-16"><Translate text={"Year / color"} /></dt><dd className="bus-form-style-286-17">{[form.year, form.color].filter(Boolean).join(" · ") || "—"}</dd></div></dl></div>
                <div className="bus-form-style-287"><p className="bus-form-style-287-2"><Translate text={"Seat plan"} /></p><div className="bus-form-style-287-3"><strong className="bus-form-style-287-4">{form.totalSeats}</strong><span className="bus-form-style-287-5"><Translate text={"seats / berths"} /></span></div><p className="bus-form-style-287-6">{layout.rows} <Translate text={"rows ·"} />{" "}{layout.columns} <Translate text={"positions per row ·"} />{" "}{form.totalSeats ? Number(form.totalSeats) - layout.disabledSeats.length : 0} <Translate text={"available"} /></p><p className="bus-form-style-287-7"><LocalizedValue value={form.amenities.length ? form.amenities.join(" · ") : "No optional amenities added"} /></p><p className="bus-form-style-287-8">{form.photos.length} <LocalizedValue value={form.photos.length === 1 ? "bus photo" : "bus photos"} /></p></div>
              </div>
              {form.photos.length > 0 && <div className="bus-form-style-289">{form.photos.map((photo, index) => <img loading="lazy" decoding="async" key={photo} src={photo} alt={`Bus photo ${index + 1}`} className="bus-form-style-289-2" />)}</div>}
              <div className="bus-form-style-290"><CheckCircle2 size={17} /> <LocalizedValue value={editing ? "Changes will update this bus record." : "The bus and its seat map will be saved together."} /></div>
            </section>
          )}

          <div className="bus-form-style-294">
            <Button type="button" variant="secondary" onClick={() => step === 0 ? router.push(busId ? `/dashboard/buses/${busId}` : "/dashboard/buses") : setStep((current) => current - 1)} disabled={saving}><ArrowLeft size={16} /> <LocalizedValue value={step === 0 ? "Cancel" : "Back"} /></Button>
            <div className="bus-form-style-296">
              {step < steps.length - 1 ? <Button type="button" onClick={nextStep}><LocalizedValue value={step === 0 ? "Continue to features" : step === 1 ? "Continue to seat layout" : "Review bus"} /> <ArrowRight size={16} /></Button> : <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? <><LoaderCircle className="bus-form-style-297" size={16} /> <Translate text={"Saving bus…"} /></> : <><CheckCircle2 size={16} /> <LocalizedValue value={editing ? "Save bus changes" : "Save bus"} /></>}</Button>}
            </div>
          </div>
        </div>
      </Card>
    </RecordPage>
  );
}
