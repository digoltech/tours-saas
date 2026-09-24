"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../src/ui/Button";
import { Card } from "../../../src/ui/Card";
import { Input } from "../../../src/ui/Input";
import { acceptInvitation, getInvitation } from "../../../src/features/auth/services/api-client";

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
  return <main className="login-page"><div className="login-brand"><div className="brand-mark">A</div><strong>A-One Tours & Travels</strong></div><Card className="login-card invitation-card">{loading ? <><p className="eyebrow">Team invitation</p><h1>Loading your invitation...</h1></> : invite ? <><p className="eyebrow">Team invitation</p><h1>Welcome, {invite.firstName}.</h1><p className="muted">You have been invited to join <strong>{invite.agencyName}</strong>. Create a password to activate your account.</p><form onSubmit={submit}><Input label="Email address" id="inviteEmail" value={invite.email} readOnly /><Input label="Create password" id="invitePassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><Input label="Confirm password" id="inviteConfirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Activating account..." : "Join workspace"}</Button></form></> : <><p className="eyebrow">Team invitation</p><h1>Invitation unavailable</h1><p className="muted">{error}</p></>}</Card></main>;
}
