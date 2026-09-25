"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BusFront, Check, CheckCircle2, ClipboardList, ImagePlus, Info, LayoutGrid, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
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

const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100";
const labelClass = "block text-sm font-semibold text-slate-700";

export function BusFormWorkspace({ busId, initialStep = 0 }: { busId?: string; initialStep?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(busId);
  const [form, setForm] = useState<BusForm>(emptyForm);
  const [createdBusId, setCreatedBusId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [layout, setLayout] = useState<SeatLayoutData>(createDefaultSeatLayout(40));
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
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load bus details");
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
      setError("Enter a seat count from 1 to 1,000."); return false;
    }
    if (form.year && (!Number.isInteger(Number(form.year)) || Number(form.year) < 1950 || Number(form.year) > 2100)) {
      setError("Enter a valid manufacturing year."); return false;
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
      setError("Enter a complete image URL beginning with http:// or https://.");
      return;
    }
    if (form.photos.includes(url)) { setError("That photo is already in the list."); return; }
    if (form.photos.length >= 12) { setError("You can add up to 12 bus photos."); return; }
    setField("photos", [...form.photos, url]);
    setPhotoDraft("");
    setError("");
  }

  async function save() {
    if (!validateDetails()) { setStep(0); return; }
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
      router.push("/dashboard/buses");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save bus");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={18} /> Loading bus details…</div></Card>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/buses" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
          <ArrowLeft size={16} /> Back to buses
        </Link>
        {(busId || createdBusId) && <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-500">Bus ID · {busId || createdBusId}</span>}
      </div>
      <PageHeader
        title={editing ? "Edit bus" : "Add a bus"}
        description={editing ? "Update vehicle information, photos, or passenger layout." : "Set up the vehicle, add optional fleet details, then map its seats."}
      />

      <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
        <nav aria-label="Bus setup steps" className="grid grid-cols-2 border-b border-slate-200 md:grid-cols-4">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <button
              key={title}
              type="button"
              disabled={index > step}
              onClick={() => setStep(index)}
              aria-current={step === index ? "step" : undefined}
              className={cn("flex min-h-20 items-center gap-3 border-b-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 md:px-5", step === index ? "border-rose-600 bg-rose-50/60 text-rose-800" : index < step ? "border-emerald-500 text-slate-800 hover:bg-slate-50" : "border-transparent text-slate-500")}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", step === index ? "bg-rose-600 text-white" : index < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {index < step ? <Check size={17} /> : <Icon size={17} />}
              </span>
              <span className="min-w-0"><strong className="block text-sm">{title}</strong><small className="mt-0.5 hidden text-xs text-slate-500 sm:block">{description}</small></span>
            </button>
          ))}
        </nav>

        <div className="space-y-6 p-5 sm:p-8">
          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"><Info className="mt-0.5 shrink-0" size={17} /> {error}</div>}

          {step === 0 && (
            <section className="space-y-6" aria-labelledby="bus-details-heading">
              <div><h2 id="bus-details-heading" className="text-xl font-bold tracking-tight text-slate-950">Vehicle and assignment</h2><p className="mt-1 text-sm text-slate-500">Enter the identifiers needed to add a vehicle to the fleet.</p></div>
              {user?.role === "SUPER_ADMIN" && <label className={labelClass}>Agency <span className="text-rose-600">*</span><select className={inputClass} value={selectedAgencyId} onChange={(event) => { setSelectedAgencyId(event.target.value); setField("branchId", ""); }}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>Bus number <span className="text-rose-600">*</span><input className={inputClass} value={form.busNumber} onChange={(event) => setField("busNumber", event.target.value)} placeholder="e.g. AT-204" autoComplete="off" /></label>
                <label className={labelClass}>Registration number <span className="text-rose-600">*</span><input className={inputClass} value={form.registrationNumber} onChange={(event) => setField("registrationNumber", event.target.value.toUpperCase())} placeholder="e.g. KA 01 AB 1234" autoComplete="off" /></label>
                <label className={labelClass}>Operator name <span className="font-normal text-slate-400">Optional</span><input className={inputClass} value={form.operatorName} onChange={(event) => setField("operatorName", event.target.value)} placeholder="Company or owner" /></label>
                <label className={labelClass}>Bus type <span className="text-rose-600">*</span><select className={inputClass} value={form.busType} onChange={(event) => setField("busType", event.target.value as BusForm["busType"])}><option value="SEATER">Seater</option><option value="SLEEPER">Sleeper</option><option value="SEATER_SLEEPER">Seater + sleeper</option></select></label>
                <label className={labelClass}>Total seats / berths <span className="text-rose-600">*</span><input className={inputClass} type="number" min="1" max="1000" value={form.totalSeats} onChange={(event) => setField("totalSeats", event.target.value)} /></label>
                <label className={labelClass}>Branch <span className="text-rose-600">*</span><select className={inputClass} value={form.branchId} onChange={(event) => setField("branchId", event.target.value)}><option value="">Select branch</option>{availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                {editing && <label className={labelClass}>Status<select className={inputClass} value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-7" aria-labelledby="bus-features-heading">
              <div><h2 id="bus-features-heading" className="text-xl font-bold tracking-tight text-slate-950">Fleet details and photos</h2><p className="mt-1 text-sm text-slate-500">Everything on this step is optional. Add useful specifications and public image links.</p></div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>Manufacturer<input className={inputClass} value={form.make} onChange={(event) => setField("make", event.target.value)} placeholder="Volvo" /></label>
                <label className={labelClass}>Model<input className={inputClass} value={form.model} onChange={(event) => setField("model", event.target.value)} placeholder="9400 B8R" /></label>
                <label className={labelClass}>Year<input className={inputClass} type="number" min="1950" max="2100" value={form.year} onChange={(event) => setField("year", event.target.value)} placeholder="2025" /></label>
                <label className={labelClass}>Color<input className={inputClass} value={form.color} onChange={(event) => setField("color", event.target.value)} placeholder="White / blue" /></label>
              </div>
              <label className={labelClass}>Description <span className="font-normal text-slate-400">Optional</span><textarea className={cn(inputClass, "min-h-24 resize-y py-3")} maxLength={2000} value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Notes about the vehicle, configuration, or service class" /></label>
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">Amenities <span className="font-normal text-slate-400">Optional</span></legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {amenitiesOptions.map((amenity) => <label key={amenity} className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-sm transition", form.amenities.includes(amenity) ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-700 hover:bg-slate-50")}><input type="checkbox" className="size-4 accent-rose-600" checked={form.amenities.includes(amenity)} onChange={(event) => setField("amenities", event.target.checked ? [...form.amenities, amenity] : form.amenities.filter((item) => item !== amenity))} />{amenity}</label>)}
                </div>
              </fieldset>
              <div className="space-y-3">
                <label htmlFor="bus-photo-url" className={labelClass}>Bus image URL <span className="font-normal text-slate-400">Optional · up to 12</span></label>
                <div className="flex flex-col gap-2 sm:flex-row"><input id="bus-photo-url" className={inputClass + " mt-0"} type="url" value={photoDraft} onChange={(event) => setPhotoDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPhoto(); } }} placeholder="https://example.com/bus-front.jpg" /><Button type="button" variant="secondary" onClick={addPhoto} disabled={!photoDraft.trim()}><Plus size={16} /> Add image</Button></div>
                {form.photos.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{form.photos.map((photo, index) => <figure key={photo} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={photo} alt={`Bus photo ${index + 1}`} className="h-40 w-full object-cover" /><figcaption className="truncate px-3 py-2 text-xs text-slate-500">Photo {index + 1}</figcaption><button type="button" aria-label={`Remove bus photo ${index + 1}`} onClick={() => setField("photos", form.photos.filter((value) => value !== photo))} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow transition hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></figure>)}</div> : <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"><ImagePlus size={18} /> No bus photos added</div>}
              </div>
            </section>
          )}

          {step === 2 && <section className="space-y-4" aria-labelledby="seat-layout-heading"><div><h2 id="seat-layout-heading" className="text-xl font-bold tracking-tight text-slate-950">Seat layout</h2><p className="mt-1 text-sm text-slate-500">Map each seat or berth. This layout will be saved with the bus.</p></div><SeatLayoutEditor totalSeats={Number(form.totalSeats) || 40} value={layout} onChange={setLayout} /></section>}

          {step === 3 && (
            <section className="space-y-5" aria-labelledby="bus-review-heading">
              <div><h2 id="bus-review-heading" className="text-xl font-bold tracking-tight text-slate-950">Review bus setup</h2><p className="mt-1 text-sm text-slate-500">Confirm the required details and the seat plan before saving.</p></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle</p><h3 className="mt-2 text-lg font-bold text-slate-950">{form.busNumber || "Bus number not set"}</h3></div><Badge>{form.status}</Badge></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-slate-500">Registration</dt><dd className="mt-0.5 font-semibold text-slate-800">{form.registrationNumber || "—"}</dd></div><div><dt className="text-slate-500">Type</dt><dd className="mt-0.5 font-semibold text-slate-800">{form.busType.replaceAll("_", " + ")}</dd></div><div><dt className="text-slate-500">Seats</dt><dd className="mt-0.5 font-semibold text-slate-800">{form.totalSeats}</dd></div><div><dt className="text-slate-500">Branch</dt><dd className="mt-0.5 font-semibold text-slate-800">{availableBranches.find((branch) => branch.id === form.branchId)?.name ?? "—"}</dd></div><div><dt className="text-slate-500">Make / model</dt><dd className="mt-0.5 font-semibold text-slate-800">{[form.make, form.model].filter(Boolean).join(" ") || "—"}</dd></div><div><dt className="text-slate-500">Year / color</dt><dd className="mt-0.5 font-semibold text-slate-800">{[form.year, form.color].filter(Boolean).join(" · ") || "—"}</dd></div></dl></div>
                <div className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seat plan</p><div className="mt-3 flex items-end gap-2"><strong className="text-3xl font-bold text-slate-950">{form.totalSeats}</strong><span className="pb-1 text-sm text-slate-500">seats / berths</span></div><p className="mt-2 text-sm text-slate-600">{layout.rows} rows · {layout.columns} positions per row · {form.totalSeats ? Number(form.totalSeats) - layout.disabledSeats.length : 0} available</p><p className="mt-3 text-sm text-slate-600">{form.amenities.length ? form.amenities.join(" · ") : "No optional amenities added"}</p><p className="mt-2 text-sm text-slate-600">{form.photos.length} bus photo{form.photos.length === 1 ? "" : "s"}</p></div>
              </div>
              {form.photos.length > 0 && <div className="flex gap-3 overflow-x-auto pb-1">{form.photos.map((photo, index) => <img key={photo} src={photo} alt={`Bus photo ${index + 1}`} className="h-24 w-36 shrink-0 rounded-lg border border-slate-200 object-cover" />)}</div>}
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={17} /> {editing ? "Changes will update this bus record." : "The bus and its seat map will be saved together."}</div>
            </section>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
            <Button type="button" variant="secondary" onClick={() => step === 0 ? router.push("/dashboard/buses") : setStep((current) => current - 1)} disabled={saving}><ArrowLeft size={16} /> {step === 0 ? "Cancel" : "Back"}</Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {step < steps.length - 1 ? <Button type="button" onClick={nextStep}>{step === 0 ? "Continue to features" : step === 1 ? "Continue to seat layout" : "Review bus"} <ArrowRight size={16} /></Button> : <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? <><LoaderCircle className="animate-spin" size={16} /> Saving bus…</> : <><CheckCircle2 size={16} /> {editing ? "Save bus changes" : "Save bus"}</>}</Button>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
