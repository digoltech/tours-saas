"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { register } from "../services/api-client";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Card } from "../../../ui/Card";

const schema = z.object({
  firstName: z.string().min(2, "Enter your first name"),
  lastName: z.string().min(2, "Enter your last name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agencyName: z.string().min(2, "Enter your agency name"),
  branchName: z.string().min(2, "Enter your first branch name"),
});

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", agencyName: "", branchName: "Main branch" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your details"); return; }
    setError(""); setLoading(true);
    try { await register(result.data); router.push("/onboarding"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create account"); } finally { setLoading(false); }
  }
  return <Card className="login-card"><p className="eyebrow">Start operating</p><h1>Create your workspace</h1><p className="muted">Set up your agency account and get moving in a few steps.</p><form onSubmit={submit}><div className="form-grid"><Input label="First name" id="firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} disabled={loading} /><Input label="Last name" id="lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} disabled={loading} /></div><Input label="Work email" id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={loading} /><Input label="Password" id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} disabled={loading} /><Input label="Agency name" id="agencyName" value={form.agencyName} onChange={(e) => update("agencyName", e.target.value)} disabled={loading} placeholder="A-One Tours" /><Input label="First branch" id="branchName" value={form.branchName} onChange={(e) => update("branchName", e.target.value)} disabled={loading} />{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={loading}>{loading ? "Creating workspace..." : "Create workspace"}</Button></form></Card>;
}
