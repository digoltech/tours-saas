"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitPublicPrivacyRequest } from "../../../src/features/auth/services/api-client";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";
import { Button } from "../../../src/ui/Button";
import { Card } from "../../../src/ui/Card";
import { Input } from "../../../src/ui/Input";

export default function PublicPrivacyRequestPage() {
  const [type, setType] = useState<"ACCESS" | "ERASURE">("ACCESS");
  const [subjectName, setSubjectName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bookingPnr, setBookingPnr] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await submitPublicPrivacyRequest({ type, subjectName, bookingPnr, contactEmail: contactEmail || undefined, contactPhone: contactPhone || undefined, reason: reason || undefined });
      setMessage("Your request has been received. Our team will verify your identity before releasing or changing any data.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit request"); }
    finally { setBusy(false); }
  }

  return <AuthLayout><Card className="login-card"><h1>Personal data request</h1><p>For passengers without an account. We will contact you to verify your identity before handling your request.</p>
    <form onSubmit={submit}>
      <label>Request type<select value={type} onChange={(event) => setType(event.target.value as "ACCESS" | "ERASURE")}><option value="ACCESS">Access my data</option><option value="ERASURE">Request deletion</option></select></label>
      <Input label="Passenger name" id="subjectName" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} required />
      <Input label="Booking reference (PNR)" id="bookingPnr" value={bookingPnr} onChange={(event) => setBookingPnr(event.target.value)} required />
      <Input label="Booking email (if provided)" id="contactEmail" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
      <Input label="Booking phone (if provided)" id="contactPhone" type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
      <label>Additional details<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>
      <p>Enter at least one contact method used for the booking. A booking reference alone does not verify identity.</p>
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit request"}</Button>
    </form><p><Link href="/">Back to home</Link></p>
  </Card></AuthLayout>;
}
