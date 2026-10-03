"use client";

import { cn } from "../../../lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowRight, Check } from "lucide-react";
import { register } from "../services/api-client";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Card } from "../../../ui/Card";
import { PasswordInput } from "./PasswordInput";

const schema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your details"); return; }
    setError(""); setLoading(true);
    try { await register(result.data); router.push("/auth/verify-email"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create account"); } finally { setLoading(false); }
  }
  return <Card className={cn("login-card")}><form onSubmit={submit} noValidate>
    <div className={cn("form-grid")}><Input label="First name" id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} disabled={loading} required /><Input label="Last name" id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} disabled={loading} required /></div>
    <Input label="Email address" id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={loading} placeholder="you@example.com" required />
    <PasswordInput label="Password" id="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} disabled={loading} required />
    <PasswordInput label="Confirm password" id="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} disabled={loading} required />
    <p className="auth-hint"><Check size={14} /> At least 8 characters. Your business details come next.</p>
    {error && <p className={cn("form-error")} role="alert">{error}</p>}
    <Button type="submit" loading={loading} loadingLabel="Creating account…">Create account<ArrowRight size={16} /></Button>
  </form></Card>;
}
