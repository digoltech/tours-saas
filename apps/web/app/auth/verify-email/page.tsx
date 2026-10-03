"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";
import { resendEmailVerification, verifyEmail } from "../../../src/features/auth/services/api-client";
import { Card } from "../../../src/ui/Card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const attempted = useRef(false);
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [message, setMessage] = useState("Check your inbox for a confirmation link.");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token || attempted.current) return;
    attempted.current = true;
    window.history.replaceState(null, "", "/auth/verify-email");
    queueMicrotask(() => setStatus("loading"));
    verifyEmail(token).then(() => {
      setStatus("success");
      router.refresh();
    }).catch(() => setStatus("error"));
  }, [router]);

  async function resend() {
    try {
      await resendEmailVerification();
      setMessage("A new confirmation link has been sent if your session is still active.");
    } catch {
      setMessage("Please sign in, then request another confirmation link.");
    }
  }

  return <AuthLayout><Card className="login-card email-result">
    {status === "pending" && <><h1>Confirm your email</h1><p>{message}</p><button type="button" className="button button-secondary" onClick={resend}>Resend link</button></>}
    {status === "loading" && <><h1>Verifying your address…</h1><p>Please wait.</p></>}
    {status === "success" && <><h1>Email confirmed</h1><p>Your workspace is ready.</p><Link className="button button-primary" href="/auth/onboarding">Continue</Link></>}
    {status === "error" && <><h1>Link unavailable</h1><p>This link is invalid or expired.</p><button type="button" className="button button-secondary" onClick={resend}>Resend link</button></>}
  </Card></AuthLayout>;
}
