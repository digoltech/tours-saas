"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "../../src/features/auth/services/api-client";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Input } from "../../src/ui/Input";

const steps = ["Workspace", "Branch", "Contact"];
export default function OnboardingPage() {
  const router = useRouter(); const [step, setStep] = useState(0); const [form, setForm] = useState({ agencyName: "", branchName: "", phone: "" }); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function finish() { setSaving(true); setError(""); try { await completeOnboarding(form); router.push("/dashboard"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to finish setup"); } finally { setSaving(false); } }
  const next = () => { if (step < steps.length - 1) setStep((value) => value + 1); else void finish(); };
  return <main className="onboarding-page"><div className="onboarding-intro"><p className="eyebrow">Your first run</p><h1>Let’s shape your workspace.</h1><p>Three quick details will make your agency ready for day-to-day operations.</p></div><div className="onboarding-progress">{steps.map((label, index) => <span className={index <= step ? "active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</div><Card className="onboarding-card">{step === 0 && <><p className="eyebrow">Step 1 of 3</p><h2>Name your workspace</h2><p className="muted">This is the agency name your team will see.</p><Input label="Agency name" id="agencyName" value={form.agencyName} onChange={(e) => update("agencyName", e.target.value)} placeholder="A-One Tours & Travels" /></>}{step === 1 && <><p className="eyebrow">Step 2 of 3</p><h2>Set up your first branch</h2><p className="muted">You can add more branches later from the workspace.</p><Input label="Branch name" id="branchName" value={form.branchName} onChange={(e) => update("branchName", e.target.value)} placeholder="Main branch" /></>}{step === 2 && <><p className="eyebrow">Step 3 of 3</p><h2>Add a contact number</h2><p className="muted">Optional, but helpful for your operating team.</p><Input label="Phone number" id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 00000 00000" /></>}{error && <p className="form-error" role="alert">{error}</p>}<div className="onboarding-actions">{step > 0 && <Button type="button" className="button-ghost" onClick={() => setStep((value) => value - 1)}>Back</Button>}<Button type="button" onClick={next} disabled={saving}>{saving ? "Opening workspace..." : step === steps.length - 1 ? "Open workspace" : "Continue"}</Button></div></Card></main>;
}
