"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Brand } from "./Brand";
import { subscribeNewsletter } from "../features/auth/services/api-client";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("loading");
    try { await subscribeNewsletter(email); setStatus("success"); setEmail(""); }
    catch { setStatus("error"); }
  }
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-about"><Brand /><p>More clarity for every route, booking, and decision. Built by Digol Tours for travel teams on the move.</p></div>
      <nav aria-label="Explore"><h2>Explore</h2><Link href="/#platform">Platform</Link><Link href="/#workflow">How it works</Link><Link href="/auth/register">Create an account</Link><Link href="/contact">Contact us</Link></nav>
      <nav aria-label="Information"><h2>Information</h2><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms-and-conditions">Terms & Conditions</Link><Link href="/privacy/request">Data request</Link><Link href="/auth/login">Sign in</Link></nav>
      <div className="site-footer-newsletter"><span className="site-footer-mail"><Mail size={19} /></span><h2>Good news for the road ahead.</h2><p>Product updates and useful travel operations ideas. Sent only when you opt in.</p><form onSubmit={submit}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" required disabled={status === "loading"} /><button type="submit" aria-label="Subscribe to newsletter" disabled={status === "loading"}><ArrowRight size={18} /></button></form><small role="status">{status === "success" ? "Check your inbox to confirm your subscription." : status === "error" ? "We could not send the confirmation. Please try again." : "Confirm your email to subscribe. Unsubscribe any time."}</small></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Digol Tours. Digol TravelOS.</span><span>Thoughtfully made for travel teams.</span></div>
  </footer>;
}
