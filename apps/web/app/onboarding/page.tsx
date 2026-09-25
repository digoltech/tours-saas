"use client";

import { cn } from "../../src/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, MapPin, Phone, Sparkles } from "lucide-react";
import { completeOnboarding } from "../../src/features/auth/services/api-client";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Input } from "../../src/ui/Input";
import { AuthLayout } from "../../src/features/auth/components/AuthLayout";

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
    try { await completeOnboarding(form); router.push("/dashboard/home"); router.refresh(); }
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
    <AuthLayout>
      <div className={cn("auth-card-stack auth-card-stack-wide onboarding-auth-stack")}>
        <div className={cn("auth-heading")}><p className={cn("eyebrow")}>Workspace setup · 1–2 minutes</p><h2>Let’s set up your workspace</h2><p>Start with a few essentials. You can add the rest whenever you are ready.</p></div>
        <section className={cn("onboarding-main")} aria-label="Workspace setup">
          <div className={cn("onboarding-progress onboarding-progress-modern")} aria-label="Setup progress">
            {steps.map((item, index) => {
              const Icon = item.icon; const isComplete = index < step; const isCurrent = index === step;
              return <div className={cn(`onboarding-step ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""}`)} key={item.label} aria-current={isCurrent ? "step" : undefined}>
                <span className={cn("onboarding-step-icon")}>{isComplete ? <Check size={15} /> : <Icon size={15} />}</span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </div>;
            })}
          </div>

          <Card className={cn("onboarding-card")}>
            {step === 0 && <>
              <p className={cn("eyebrow")}>Step 1 · Required</p><h2>Tell us about your travel business</h2>
              <p className={cn("muted")}>This name will appear across your workspace, team access, and operations views.</p>
              <Input label="Business or agency name" id="agencyName" value={form.agencyName} onChange={(event) => update("agencyName", event.target.value)} placeholder="A-One Tours & Travels" autoFocus />
              <div className={cn("onboarding-tip")}><Building2 size={17} /><span>Use the name customers recognize on bookings and invoices.</span></div>
            </>}
            {step === 1 && <>
              <p className={cn("eyebrow")}>Step 2 · Required</p><h2>Where does your operation start?</h2>
              <p className={cn("muted")}>Add your first office, depot, or branch. You can add more locations from the workspace later.</p>
              <Input label="Main operating location" id="branchName" value={form.branchName} onChange={(event) => update("branchName", event.target.value)} placeholder="Colombo Main Office" autoFocus />
              <div className={cn("onboarding-tip")}><MapPin size={17} /><span>This becomes your default location for future routes and trips.</span></div>
            </>}
            {step === 2 && <>
              <p className={cn("eyebrow")}>Step 3 · Optional</p><h2>Add a business contact number</h2>
              <p className={cn("muted")}>Helpful for branch coordination and customer communication, but you can safely add it later in Settings.</p>
              <Input label="Phone number" id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 00000 00000" autoFocus />
            </>}
            {step === 3 && <div className={cn("onboarding-ready")}>
              <div className={cn("onboarding-ready-icon")}><CurrentIcon size={24} /></div><p className={cn("eyebrow")}>You are ready to go</p><h2>Your workspace is ready for its first journey.</h2>
              <p className={cn("muted")}>Next, you can invite your team, register your fleet, and plan your first route from the dashboard.</p>
              <div className={cn("onboarding-summary")}><div><span>Workspace</span><strong>{form.agencyName}</strong></div><div><span>Operating base</span><strong>{form.branchName}</strong></div><div><span>Contact</span><strong>{form.phone || "Add later"}</strong></div></div>
            </div>}
            {error && <p className={cn("form-error")} role="alert">{error}</p>}
            <div className={cn("onboarding-actions")}>
              {step > 0 && <Button type="button" variant="ghost" onClick={() => { setError(""); setStep((value) => value - 1); }}>Back</Button>}
              {step === 2 && <Button type="button" variant="ghost" onClick={skipOptionalStep}>Skip for now</Button>}
              <Button type="button" onClick={next} disabled={saving}>{saving ? "Opening workspace..." : step === steps.length - 1 ? "Open workspace" : "Continue"}{!saving && <ArrowRight size={16} />}</Button>
            </div>
          </Card>
          <p className={cn("onboarding-footer-note")}>You can update these details later in Settings.</p>
        </section>
      </div>
    </AuthLayout>
  );
}
