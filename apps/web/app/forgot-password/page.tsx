"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { requestPasswordReset, resetPassword, verifyPasswordResetOtp } from "../../src/features/auth/services/api-client";
import { AuthLayout } from "../../src/features/auth/components/AuthLayout";
import { PasswordInput } from "../../src/features/auth/components/PasswordInput";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Input } from "../../src/ui/Input";

const emailSchema = z.string().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Enter a valid email"); return; }
    setLoading(true); setError("");
    try {
      await requestPasswordReset(email);
      setStep(1);
      setResendSeconds(60);
      setNotice("If an account exists for this email, a reset code has been sent.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send reset code"); }
    finally { setLoading(false); }
  }

  async function resendCode() {
    if (resendSeconds > 0 || loading) return;
    setLoading(true); setError("");
    try {
      await requestPasswordReset(email);
      setResendSeconds(60);
      setNotice("If an account exists for this email, a new reset code has been sent.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to resend reset code"); }
    finally { setLoading(false); }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code from your email"); return; }
    setLoading(true); setError("");
    try { await verifyPasswordResetOtp(email, otp); setStep(2); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The code is invalid or expired"); }
    finally { setLoading(false); }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    const result = passwordSchema.safeParse(password);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Choose a stronger password"); return; }
    if (password !== passwordConfirmation) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try { await resetPassword(email, otp, password); setStep(3); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to reset password"); }
    finally { setLoading(false); }
  }

  const formattedTime = `00:${String(resendSeconds).padStart(2, "0")}`;

  return (
    <AuthLayout>
      <div className="auth-card-stack auth-card-stack-narrow">
        <div className="auth-heading"><p className="eyebrow">Account recovery</p><h2>{step === 1 ? "Check your email" : step === 2 ? "Choose a new password" : step === 3 ? "Password updated" : "Reset your password"}</h2><p>{step === 0 ? "We’ll send a one-time code to help you get back in." : step === 1 ? notice : step === 2 ? "Your code is confirmed. Create a new password for your account." : step === 3 ? "Your password has been reset. You can now sign in securely." : ""}</p></div>
        <Card className="login-card reset-card">
          {step === 0 && <form onSubmit={submitEmail}>
            <Input label="Email address" id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="you@company.com" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? "Sending code…" : "Send reset code"}</Button>
          </form>}
          {step === 1 && <form onSubmit={submitOtp}>
            <Input label="6-digit reset code" id="reset-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} disabled={loading} placeholder="000000" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? "Confirming…" : "Confirm code"}</Button>
            <div className="resend-row" role="status" aria-live="polite"><span>{resendSeconds > 0 ? `Resend code in ${formattedTime}` : "Didn’t receive a code?"}</span><button type="button" className="auth-text-button" disabled={loading || resendSeconds > 0} onClick={() => void resendCode()}>{loading ? "Sending…" : "Resend code"}</button></div>
            <button className="auth-text-button reset-back" type="button" onClick={() => { setStep(0); setError(""); }}>Use a different email</button>
          </form>}
          {step === 2 && <form onSubmit={submitPassword}>
            <PasswordInput label="New password" id="new-password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
            <PasswordInput label="Confirm password" id="confirm-password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} disabled={loading} />
            <p className="password-hint">Use at least 8 characters.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? "Updating password…" : "Reset password"}</Button>
          </form>}
          {step === 3 && <Link className="button button-primary reset-login" href="/login">Return to sign in</Link>}
        </Card>
        <p className="auth-bottom-link"><Link href="/login">Back to sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
