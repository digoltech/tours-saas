"use client";
import { LocalizedValue } from "../../../../src/i18n/LocalizedValue";
import { localizeText } from "../../../../src/i18n/errors";
import { Translate } from "../../../../src/i18n/Translate";

import { cn } from "../../../../src/lib/utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../../src/ui/Button";
import { Card } from "../../../../src/ui/Card";
import { Input } from "../../../../src/ui/Input";
import { acceptInvitation, getInvitation } from "../../../../src/features/auth/services/api-client";
import { AuthLayout } from "../../../../src/features/auth/components/AuthLayout";
import { PasswordInput } from "../../../../src/features/auth/components/PasswordInput";

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invite, setInvite] = useState<{ firstName: string; email: string; agencyName: string; branchName: string | null; roleName: string; roleDescription: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getInvitation(token).then(setInvite).catch((cause) => setError(cause instanceof Error ? cause.message : localizeText("This invitation is no longer available"))).finally(() => setLoading(false)); }, [token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { setError(localizeText("Use at least 8 characters for your password.")); return; }
    if (password !== confirmation) { setError(localizeText("Passwords do not match.")); return; }
    setSaving(true); setError("");
    try { await acceptInvitation(token, password); router.push("/dashboard/home"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to accept invitation")); setSaving(false); }
  }
  return <AuthLayout><div className={cn("auth-card-stack auth-card-stack-narrow")}><div className={cn("auth-heading")}><p className={cn("eyebrow")}><Translate text={"Team invitation"} /></p><h2><LocalizedValue value={loading ? "Loading your invitation…" : invite ? `Welcome, ${invite.firstName}.` : "Invitation unavailable"} /></h2><p>{invite ? `You have been invited to join ${invite.agencyName}. Create a password to activate your account.` : error}</p></div><Card className={cn("login-card invitation-card")}>{loading ? <div className={cn("auth-loading-state")}><span className={cn("auth-spinner")} /><Translate text={"Loading your invitation"} /></div> : invite ? <form onSubmit={submit}><div className="invitation-role"><strong><LocalizedValue value={invite.roleName} /></strong><p>{invite.branchName}</p><p><LocalizedValue value={invite.roleDescription} /></p></div><Input label="Email address" id="inviteEmail" value={invite.email} readOnly /><PasswordInput label="Create password" id="invitePassword" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><PasswordInput label="Confirm password" id="inviteConfirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /><p className={cn("password-hint")}><Translate text={"Use at least 8 characters."} /></p>{error && <p className={cn("form-error")} role="alert">{error}</p>}<Button type="submit" disabled={saving}><LocalizedValue value={saving ? "Activating account…" : "Join agency"} /></Button></form> : <Link className={cn("button button-secondary")} href="/auth/login"><Translate text={"Back to sign in"} /></Link>}</Card></div></AuthLayout>;
}
