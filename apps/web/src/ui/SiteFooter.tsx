"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Brand } from "./Brand";
import { subscribeNewsletter } from "../features/auth/services/api-client";
import { useTranslations } from "../i18n/LocaleProvider";

export function SiteFooter() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("loading");
    try { await subscribeNewsletter(email); setStatus("success"); setEmail(""); }
    catch { setStatus("error"); }
  }
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-about"><Brand /><p>{t("More clarity for every route, booking, and decision. Built by Digol Tours for travel teams on the move.")}</p></div>
      <nav aria-label={t("Explore")}><h2>{t("Explore")}</h2><Link href="/features">{t("Features")}</Link><Link href="/guides">{t("Guides")}</Link><Link href="/#workflow">{t("How it works")}</Link><Link href="/auth/register">{t("Create an account")}</Link><Link href="/contact">{t("Contact us")}</Link></nav>
      <nav aria-label={t("Information")}><h2>{t("Information")}</h2><Link href="/privacy-policy">{t("Privacy Policy")}</Link><Link href="/terms-and-conditions">{t("Terms & Conditions")}</Link><Link href="/privacy/request">{t("Data request")}</Link><Link href="/auth/login">{t("Sign in")}</Link></nav>
      <div className="site-footer-newsletter"><span className="site-footer-mail"><Mail size={19} /></span><h2>{t("Good news for the road ahead.")}</h2><p>{t("Product updates and useful travel operations ideas. Sent only when you opt in.")}</p><form onSubmit={submit}><label className="site-footer-style-22" htmlFor="newsletter-email">{t("Email address")}</label><input id="newsletter-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("Your email address")} required disabled={status === "loading"} /><button type="submit" aria-label={t("Subscribe to newsletter")} disabled={status === "loading"}><ArrowRight size={18} /></button></form><small role="status">{t(status === "success" ? "Check your inbox to confirm your subscription." : status === "error" ? "We could not send the confirmation. Please try again." : "Confirm your email to subscribe. Unsubscribe any time.")}</small></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Digol Tours. Digol TravelOS.</span><span>{t("Thoughtfully made for travel teams.")}</span></div>
  </footer>;
}
