"use client";
import { useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";
import { PublicLayout } from "../../src/ui/PublicLayout";
import { sendContactInquiry } from "../../src/features/auth/services/api-client";

export default function ContactPage() {
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const change = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("loading");
    try { await sendContactInquiry(values); setStatus("success"); setValues({ name: "", email: "", subject: "", message: "" }); }
    catch { setStatus("error"); }
  }
  return <PublicLayout eyebrow="LET’S TALK" title="Contact Digol Tours" intro="Questions about Digol TravelOS, your account, or a travel operation? Send us a note and we’ll get back to you.">
    <div className="contact-grid"><div className="contact-aside"><span><Mail size={24} /></span><h2>We’re here to help.</h2><p>Tell us what you need and include the best email address for a reply. For a personal data request, use the dedicated request page linked below.</p><a href="/privacy/request">Submit a data request →</a></div>
      <form className="contact-form" onSubmit={submit}><div className="contact-pair"><label>Your name<input value={values.name} onChange={change("name")} required minLength={2} maxLength={100} /></label><label>Email address<input type="email" value={values.email} onChange={change("email")} required /></label></div><label>Subject<input value={values.subject} onChange={change("subject")} required minLength={3} maxLength={150} /></label><label>How can we help?<textarea value={values.message} onChange={change("message")} required minLength={10} maxLength={5000} rows={6} /></label><button type="submit" disabled={status === "loading"}><Send size={17} />{status === "loading" ? "Sending…" : "Send message"}</button><p role="status" className={status === "error" ? "form-error" : ""}>{status === "success" ? "Your message has been received. We’ll reply by email." : status === "error" ? "We couldn’t send your message. Please try again." : ""}</p></form></div>
  </PublicLayout>;
}
