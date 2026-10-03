"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";
import { resendEmailVerification, verifyEmail } from "../../../src/features/auth/services/api-client";
import { Card } from "../../../src/ui/Card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const attempted = useRef(false);
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [emailChanged, setEmailChanged] = useState(false);
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token || attempted.current) return;
    attempted.current = true;
    window.history.replaceState(null, "", "/auth/verify-email");
    queueMicrotask(() => setStatus("loading"));
    verifyEmail(token).then((result) => {
      setStatus("success");
      setEmailChanged(result.emailChanged);
      router.refresh();
    }).catch(() => setStatus("error"));
  }, [router]);

  async function resend() {
    setResending(true); setMessage("");
    try {
      await resendEmailVerification();
      setMessage("A fresh confirmation link is on its way. Check your inbox and spam folder.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please sign in and try again."); }
    finally { setResending(false); }
  }

  const title = status === "success" ? "Email confirmed" : status === "loading" ? "Checking your link" : status === "error" ? "That link isn’t available" : "Check your inbox";
  const description = status === "success" ? emailChanged ? "Your new address is active. Sign in again to continue." : "Your email is confirmed. Next, let’s set up your travel business." : status === "loading" ? "This takes just a moment." : status === "error" ? "It may have expired or already been used. You can request another one." : "We’ve sent you a link to confirm your email address. Open it to keep going.";
  return <AuthLayout><div className="auth-card-stack auth-card-stack-narrow"><div className="auth-heading"><p className="eyebrow">ACCOUNT CONFIRMATION</p><h2>{title}</h2><p>{description}</p></div><Card className="login-card email-result">
    <div className={`auth-result-icon ${status === "success" ? "success" : ""}`}>{status === "success" ? <Check size={28} /> : status === "loading" ? <span className="auth-spinner" /> : <MailCheck size={28} />}</div>
    {status === "pending" && <><h3>One quick check</h3><p>Look for an email from Digol TravelOS. The link is valid for 24 hours.</p><div className="auth-info-row"><ShieldCheck size={16} /> This helps protect your account.</div></>}
    {status === "error" && <p>Need a new link? Use the button below while signed in.</p>}
    {status === "success" && <p>Thanks for confirming your address. Your next step is ready.</p>}
    {message && <p role="status" className="auth-status-message">{message}</p>}
    {status === "success" ? <Link className="button button-primary auth-result-action" href={emailChanged ? "/auth/login" : "/onboaridng/"}>{emailChanged ? "Sign in" : "Continue to setup"}<ArrowRight size={16} /></Link> : status !== "loading" ? <button type="button" className="button button-secondary auth-result-action" onClick={() => void resend()} disabled={resending}><RefreshCw size={16} />{resending ? "Sending…" : "Resend confirmation email"}</button> : null}
  </Card><p className="auth-bottom-link">Need help? <Link href="/contact">Contact us</Link></p></div></AuthLayout>;
}
