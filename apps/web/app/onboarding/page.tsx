"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, CircleHelp, MapPin, Phone, Sparkles } from "lucide-react";
import { completeOnboarding } from "../../src/features/auth/services/api-client";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Input } from "../../src/ui/Input";

type FormState = { agencyName: string; branchName: string; phone: string };
const steps = [
  { label: "Workspace", detail: "Your travel business", icon: Building2 },
  { label: "Operating base", detail: "Your first location", icon: MapPin },
  { label: "Contact", detail: "Optional details", icon: Phone },
  { label: "Ready", detail: "Start operating", icon: Sparkles },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ agencyName: "", branchName: "", phone: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function finish() {
    setSaving(true); setError("");
    try { await completeOnboarding(form); router.push("/dashboard"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to finish setup"); }
    finally { setSaving(false); }
  }

  function validateCurrentStep() {
    if (step === 0 && form.agencyName.trim().length < 2) { setError("Enter the name your customers and team know you by."); return false; }
    if (step === 1 && form.branchName.trim().length < 2) { setError("Add your main office, depot, or operating location."); return false; }
    setError(""); return true;
  }
  function next() { if (!validateCurrentStep()) return; if (step < steps.length - 1) setStep((value) => value + 1); else void finish(); }
  function skipOptionalStep() { setError(""); setStep((value) => value + 1); }
  const CurrentIcon = steps[step].icon;

  return (
    <main className="onboarding-page">
      <div className="onboarding-layout">
        <aside className="onboarding-sidebar">
          <div className="onboarding-brand"><span className="brand-mark">A</span><span><strong>A-One</strong><small>Tours & Travels</small></span></div>
          <div className="onboarding-sidebar-copy">
            <p className="eyebrow">Your first run</p>
            <h1>Set up a workspace your team can run with.</h1>
            <p>Start with the essentials. You can add vehicles, routes, trips, and team members whenever you are ready.</p>
          </div>
          <div className="onboarding-help"><CircleHelp size={18} /><span><strong>Need a hand?</strong><small>You can update these details later.</small></span></div>
        </aside>

        <section className="onboarding-main" aria-label="Workspace setup">
          <div className="onboarding-topline"><span>Workspace setup</span><span>1–2 minutes</span></div>
          <div className="onboarding-progress" aria-label="Setup progress">
            {steps.map((item, index) => {
              const Icon = item.icon; const isComplete = index < step; const isCurrent = index === step;
              return <div className={`onboarding-step ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""}`} key={item.label}>
                <span className="onboarding-step-icon">{isComplete ? <Check size={15} /> : <Icon size={15} />}</span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </div>;
            })}
          </div>

          <Card className="onboarding-card">
            {step === 0 && <>
              <p className="eyebrow">Step 1 · Required</p><h2>Tell us about your travel business</h2>
              <p className="muted">This name will appear across your workspace, team access, and operations views.</p>
              <Input label="Business or agency name" id="agencyName" value={form.agencyName} onChange={(event) => update("agencyName", event.target.value)} placeholder="A-One Tours & Travels" autoFocus />
              <div className="onboarding-tip"><Building2 size={17} /><span>Use the name customers recognize on bookings and invoices.</span></div>
            </>}
            {step === 1 && <>
              <p className="eyebrow">Step 2 · Required</p><h2>Where does your operation start?</h2>
              <p className="muted">Add your first office, depot, or branch. You can add more locations from the workspace later.</p>
              <Input label="Main operating location" id="branchName" value={form.branchName} onChange={(event) => update("branchName", event.target.value)} placeholder="Colombo Main Office" autoFocus />
              <div className="onboarding-tip"><MapPin size={17} /><span>This becomes your default location for future routes and trips.</span></div>
            </>}
            {step === 2 && <>
              <p className="eyebrow">Step 3 · Optional</p><h2>Add a business contact number</h2>
              <p className="muted">Helpful for branch coordination and customer communication, but you can safely add it later in Settings.</p>
              <Input label="Phone number" id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 00000 00000" autoFocus />
            </>}
            {step === 3 && <div className="onboarding-ready">
              <div className="onboarding-ready-icon"><CurrentIcon size={24} /></div><p className="eyebrow">You are ready to go</p><h2>Your workspace is ready for its first journey.</h2>
              <p className="muted">Next, you can invite your team, register your fleet, and plan your first route from the dashboard.</p>
              <div className="onboarding-summary"><div><span>Workspace</span><strong>{form.agencyName}</strong></div><div><span>Operating base</span><strong>{form.branchName}</strong></div><div><span>Contact</span><strong>{form.phone || "Add later"}</strong></div></div>
            </div>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="onboarding-actions">
              {step > 0 && <Button type="button" variant="ghost" onClick={() => { setError(""); setStep((value) => value - 1); }}>Back</Button>}
              {step === 2 && <Button type="button" variant="ghost" onClick={skipOptionalStep}>Skip for now</Button>}
              <Button type="button" onClick={next} disabled={saving}>{saving ? "Opening workspace..." : step === steps.length - 1 ? "Open workspace" : "Continue"}{!saving && <ArrowRight size={16} />}</Button>
            </div>
          </Card>
          <p className="onboarding-footer-note">You can change workspace details anytime from Settings.</p>
        </section>
      </div>
    </main>
  );
}
