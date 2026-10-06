"use client";
import { LocalizedValue } from "../../src/i18n/LocalizedValue";
import { localizeText } from "../../src/i18n/errors";
import { Translate } from "../../src/i18n/Translate";

import "../../src/styles/account.css";

import { cn } from "../../src/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, MapPin, Phone, Sparkles } from "lucide-react";
import { completeOnboarding } from "../../src/features/auth/services/api-client";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Input } from "../../src/ui/Input";
import { Brand } from "../../src/ui/Brand";
import { LanguageSelector } from "../../src/i18n/LanguageSelector";
import { useTranslations } from "../../src/i18n/LocaleProvider";

type FormState = { agencyName: string; branchName: string; phone: string };
const steps = [
  { label: "Business", detail: "Your travel business", icon: Building2 },
  { label: "Operating base", detail: "Your first location", icon: MapPin },
  { label: "Contact", detail: "Optional details", icon: Phone },
  { label: "Ready", detail: "Start operating", icon: Sparkles },
];

export default function OnboardingPage() {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ agencyName: "", branchName: "", phone: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"form" | "loading" | "celebrate">("form");
  const [loadingStep, setLoadingStep] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function finish() {
    setSaving(true); setError("");
    try {
      await completeOnboarding(form);
      setPhase("loading");
      [700, 1500, 2300].forEach((delay, index) => timers.current.push(window.setTimeout(() => setLoadingStep(index + 1), delay)));
      timers.current.push(window.setTimeout(() => setPhase("celebrate"), 3000));
      timers.current.push(window.setTimeout(() => { router.replace("/dashboard/home"); router.refresh(); }, 4900));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to finish setup")); }
    finally { setSaving(false); }
  }

  function validateCurrentStep() {
    if (step === 0 && form.agencyName.trim().length < 2) { setError(localizeText("Enter the name your customers and team know you by.")); return false; }
    if (step === 1 && form.branchName.trim().length < 2) { setError(localizeText("Add your main office, depot, or operating location.")); return false; }
    setError(""); return true;
  }
  function next() { if (!validateCurrentStep()) return; if (step < steps.length - 1) setStep((value) => value + 1); else void finish(); }
  function skipOptionalStep() { setError(""); setStep((value) => value + 1); }
  const CurrentIcon = steps[step].icon;

  return (
    <div className="onboarding-screen">
      <header className="onboarding-header"><Brand /><LanguageSelector /><span><Translate text={"STEP"} />{" "}{Math.min(step + 1, 4)} <Translate text={"OF 4"} /></span></header>
      {phase !== "form" ? <main className="onboarding-transition" aria-live="polite">
        {phase === "celebrate" && <div className="confetti-field" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ left: `${(index * 47) % 100}%`, animationDelay: `${(index * 13) % 17 * .1}s`, backgroundColor: ["#c62828", "#e9a666", "#275a5b", "#f5d97b"][index % 4] }} />)}</div>}
        <div className="onboarding-transition-icon">{phase === "celebrate" ? <Sparkles size={32} /> : <span className="auth-spinner" />}</div>
        <p className="eyebrow">{t(phase === "celebrate" ? "READY FOR DEPARTURE" : "SETTING THINGS UP")}</p>
        <h1>{t(phase === "celebrate" ? "You’re ready to move." : "Preparing your journey.")}</h1>
        <p>{t(phase === "celebrate" ? "Your Digol TravelOS dashboard is ready. Let’s take a look." : "We’re putting the final pieces in place.")}</p>
        {phase === "loading" && <ol className="onboarding-loading-steps">{["Creating your agency", "Preparing your operating base", "Connecting your dashboard", "Final touches"].map((item, index) => <li key={item} className={index < loadingStep ? "done" : index === loadingStep ? "active" : ""}>{index < loadingStep ? <Check size={16} /> : <span />}{t(item)}</li>)}</ol>}
        {phase === "celebrate" && <button className="onboarding-dashboard-link" onClick={() => { router.replace("/dashboard/home"); router.refresh(); }}><Translate text={"Open dashboard"} />{" "}<ArrowRight size={16} /></button>}
      </main> : <main className="onboarding-content">
        <div className={cn("auth-heading onboarding-heading")}><p className={cn("eyebrow")}><Translate text={"GETTING STARTED · ABOUT 2 MINUTES"} /></p><h1><Translate text={"Let’s set up your travel business."} /></h1><p><Translate text={"Just a few essentials before your first trip. You can change these details later."} /></p></div>
        <section className={cn("onboarding-main")} aria-label="Business setup">
          <div className={cn("onboarding-progress onboarding-progress-modern")} aria-label="Setup progress">
            {steps.map((item, index) => {
              const Icon = item.icon; const isComplete = index < step; const isCurrent = index === step;
              return <div className={cn(`onboarding-step ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""}`)} key={item.label} aria-current={isCurrent ? "step" : undefined}>
                <span className={cn("onboarding-step-icon")}>{isComplete ? <Check size={15} /> : <Icon size={15} />}</span>
                <span><strong>{t(item.label)}</strong><small>{t(item.detail)}</small></span>
              </div>;
            })}
          </div>

          <Card className={cn("onboarding-card")}>
            {step === 0 && <>
              <p className={cn("eyebrow")}><Translate text={"Step 1 · Required"} /></p><h2><Translate text={"Tell us about your travel business"} /></h2>
              <p className={cn("muted")}><Translate text={"This name will appear in team access and operations views."} /></p>
              <Input label="Business or agency name" id="agencyName" value={form.agencyName} onChange={(event) => update("agencyName", event.target.value)} placeholder="Your travel business" autoFocus />
              <div className={cn("onboarding-tip")}><Building2 size={17} /><span><Translate text={"Use the name customers recognize on bookings and invoices."} /></span></div>
            </>}
            {step === 1 && <>
              <p className={cn("eyebrow")}><Translate text={"Step 2 · Required"} /></p><h2><Translate text={"Where does your operation start?"} /></h2>
              <p className={cn("muted")}><Translate text={"Add your first office, depot, or branch. You can add more locations later."} /></p>
              <Input label="Main operating location" id="branchName" value={form.branchName} onChange={(event) => update("branchName", event.target.value)} placeholder="Colombo Main Office" autoFocus />
              <div className={cn("onboarding-tip")}><MapPin size={17} /><span><Translate text={"This becomes your default location for future routes and trips."} /></span></div>
            </>}
            {step === 2 && <>
              <p className={cn("eyebrow")}><Translate text={"Step 3 · Optional"} /></p><h2><Translate text={"Add a business contact number"} /></h2>
              <p className={cn("muted")}><Translate text={"Helpful for branch coordination and customer communication, but you can safely add it later in Settings."} /></p>
              <Input label="Phone number" id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 00000 00000" autoFocus />
            </>}
            {step === 3 && <div className={cn("onboarding-ready")}>
              <div className={cn("onboarding-ready-icon")}><CurrentIcon size={24} /></div><p className={cn("eyebrow")}><Translate text={"You are ready to go"} /></p><h2><Translate text={"Your business is ready for its first journey."} /></h2>
              <p className={cn("muted")}><Translate text={"Next, you can invite your team, register your fleet, and plan your first route from the dashboard."} /></p>
              <div className={cn("onboarding-summary")}><div><span><Translate text={"Business"} /></span><strong>{form.agencyName}</strong></div><div><span><Translate text={"Operating base"} /></span><strong>{form.branchName}</strong></div><div><span><Translate text={"Contact"} /></span><strong>{form.phone || "Add later"}</strong></div></div>
            </div>}
            {error && <p className={cn("form-error")} role="alert">{error}</p>}
            <div className={cn("onboarding-actions")}>
              {step > 0 && <Button type="button" variant="ghost" onClick={() => { setError(""); setStep((value) => value - 1); }}><Translate text={"Back"} /></Button>}
              {step === 2 && <Button type="button" variant="ghost" onClick={skipOptionalStep}><Translate text={"Skip for now"} /></Button>}
              <Button type="button" onClick={next} disabled={saving}><LocalizedValue value={saving ? "Saving…" : step === steps.length - 1 ? "Finish setup" : "Continue"} />{!saving && <ArrowRight size={16} />}</Button>
            </div>
          </Card>
          <p className={cn("onboarding-footer-note")}><Translate text={"You can update these details later in Settings."} /></p>
        </section>
      </main>}
    </div>
  );
}
