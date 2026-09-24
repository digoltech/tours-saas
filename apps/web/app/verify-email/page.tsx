"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmail } from "../../src/features/auth/services/api-client";
import { Card } from "../../src/ui/Card";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { const timer = window.setTimeout(() => setStatus("error"), 0); return () => window.clearTimeout(timer); }
    verifyEmail(token).then(() => setStatus("success")).catch(() => setStatus("error"));
  }, []);
  return <main className="login-page"><div className="login-brand"><div className="brand-mark">A</div><strong>A-One Tours & Travels</strong></div><Card className="login-card email-result">{status === "loading" && <><p className="eyebrow">Confirming email</p><h1>Verifying your address...</h1><p className="muted">Just a moment while we secure your account.</p></>}{status === "success" && <><CheckCircle2 className="email-result-icon success" size={42} /><p className="eyebrow">Email confirmed</p><h1>Your account is ready.</h1><p className="muted">Thanks for confirming your email. You can continue to your workspace.</p><Link className="button button-primary email-result-action" href="/dashboard">Open workspace</Link></>}{status === "error" && <><XCircle className="email-result-icon error" size={42} /><p className="eyebrow">Link unavailable</p><h1>This link has expired.</h1><p className="muted">Request a new confirmation email or continue to sign in.</p><Link className="button button-secondary email-result-action" href="/login">Back to sign in</Link></>}</Card></main>;
}
