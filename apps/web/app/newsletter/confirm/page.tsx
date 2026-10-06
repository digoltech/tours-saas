"use client";
import "../../../src/styles/marketing.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { confirmNewsletter } from "../../../src/features/auth/services/api-client";
import { Brand } from "../../../src/ui/Brand";

export default function ConfirmNewsletterPage() {
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
  return <main className="simple-result"><Brand /><section><h1>{status === "loading" ? "Confirming your subscription…" : status === "success" ? "You’re on the list." : "This link is unavailable."}</h1><p>{status === "success" ? "Thanks for joining. Watch your inbox for Digol TravelOS updates." : status === "error" ? "The link may be invalid. You can subscribe again from the home page." : "One moment while we confirm your email."}</p><Link href="/">Back to home</Link></section></main>;
}
