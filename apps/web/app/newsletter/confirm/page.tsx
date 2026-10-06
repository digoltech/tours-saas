"use client";
import { Translate } from "../../../src/i18n/Translate";
import "../../../src/styles/marketing.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { confirmNewsletter } from "../../../src/features/auth/services/api-client";
import { Brand } from "../../../src/ui/Brand";
import { LanguageSelector } from "../../../src/i18n/LanguageSelector";
import { useTranslations } from "../../../src/i18n/LocaleProvider";

export default function ConfirmNewsletterPage() {
  const t = useTranslations();
  const attempted = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (attempted.current) return;
    attempted.current = true;
    window.history.replaceState(null, "", "/newsletter/confirm");
    if (!token) { queueMicrotask(() => setStatus("error")); return; }
    confirmNewsletter(token).then(() => setStatus("success")).catch(() => setStatus("error"));
  }, []);
  return <main className="simple-result"><header className="simple-result-header"><Brand /><LanguageSelector /></header><section><h1>{t(status === "loading" ? "Confirming your subscription…" : status === "success" ? "You’re on the list." : "This link is unavailable.")}</h1><p>{t(status === "success" ? "Thanks for joining. Watch your inbox for Digol TravelOS updates." : status === "error" ? "The link may be invalid. You can subscribe again from the home page." : "One moment while we confirm your email.")}</p><Link href="/"><Translate text={"Back to home"} /></Link></section></main>;
}
