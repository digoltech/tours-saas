"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../src/ui/Button";
import { Card } from "../../../src/ui/Card";
import { Input } from "../../../src/ui/Input";
import { acceptInvitation, getInvitation } from "../../../src/features/auth/services/api-client";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";
import { PasswordInput } from "../../../src/features/auth/components/PasswordInput";

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invite, setInvite] = useState<{ firstName: string; email: string; agencyName: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getInvitation(token).then(setInvite).catch((cause) => setError(cause instanceof Error ? cause.message : "This invitation is no longer available")).finally(() => setLoading(false)); }, [token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setSaving(true); setError("");
    try { await acceptInvitation(token, password); router.push("/dashboard"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to accept invitation"); setSaving(false); }
  }
  return <AuthLayout><div className="auth-card-stack auth-card-stack-narrow"><div className="auth-heading"><p className="eyebrow">Team invitation</p><h2>{loading ? "Loading your invitation…" : invite ? `Welcome, ${invite.firstName}.` : "Invitation unavailable"}</h2><p>{invite ? `You have been invited to join ${invite.agencyName}. Create a password to activate your account.` : error}</p></div><Card className="login-card invitation-card">{loading ? <div className="auth-loading-state"><span className="auth-spinner" />Loading your invitation</div> : invite ? <form onSubmit={submit}><Input label="Email address" id="inviteEmail" value={invite.email} readOnly /><PasswordInput label="Create password" id="invitePassword" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><PasswordInput label="Confirm password" id="inviteConfirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /><p className="password-hint">Use at least 8 characters.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Activating account…" : "Join workspace"}</Button></form> : <Link className="button button-secondary" href="/login">Back to sign in</Link>}</Card></div></AuthLayout>;
}
