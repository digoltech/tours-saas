"use client";
import { LocalizedValue } from "../../../src/i18n/LocalizedValue";
import { Translate } from "../../../src/i18n/Translate";
import "../../../src/styles/privacy.css";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
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

  return <AuthLayout><Card className="login-card public-privacy-card"><span className="public-privacy-icon"><LockKeyhole size={23} /></span><p className="eyebrow"><Translate text={"PRIVACY CENTER"} /></p><h1><Translate text={"Personal data request"} /></h1><p><Translate text={"Request a copy of your booking data or ask us to review it for deletion. We’ll verify your identity before taking action."} /></p>
    <form className="public-privacy-form" onSubmit={submit}>
      <label><Translate text={"Request type"} /><select value={type} onChange={(event) => setType(event.target.value as "ACCESS" | "ERASURE")}><option value="ACCESS"><Translate text={"Access my data"} /></option><option value="ERASURE"><Translate text={"Request deletion"} /></option></select></label>
      <Input label="Passenger name" id="subjectName" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} required />
      <Input label="Booking reference (PNR)" id="bookingPnr" value={bookingPnr} onChange={(event) => setBookingPnr(event.target.value)} required />
      <Input label="Booking email (if provided)" id="contactEmail" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
      <Input label="Booking phone (if provided)" id="contactPhone" type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
      <label><Translate text={"Additional details"} /><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>
      <p className="public-privacy-help"><ShieldCheck size={17} /> <Translate text={"Enter at least one contact method used for the booking. A booking reference alone does not verify identity."} /></p>
      {message && <p className="privacy-message" role="status"><LocalizedValue value={message} /></p>}
      <Button type="submit" loading={busy} loadingLabel="Submitting…"><Translate text={"Submit request"} /></Button>
    </form><Link className="public-privacy-back" href="/"><ArrowLeft size={15} /> <Translate text={"Back to home"} /></Link>
  </Card></AuthLayout>;
}
