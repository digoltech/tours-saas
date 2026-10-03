"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { unsubscribeNewsletter } from "../../../src/features/auth/services/api-client";
import { Brand } from "../../../src/ui/Brand";

export default function UnsubscribePage() {
  const attempted = useRef(false);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (attempted.current) return;
    attempted.current = true;
    window.history.replaceState(null, "", "/newsletter/unsubscribe");
    if (!token) { queueMicrotask(() => setStatus("error")); return; }
    unsubscribeNewsletter(token).then(() => setStatus("done")).catch(() => setStatus("error"));
  }, []);
  return <main className="simple-result"><Brand /><section><h1>{status === "loading" ? "Updating your preference…" : status === "done" ? "You’ve been unsubscribed." : "This link is unavailable."}</h1><p>{status === "done" ? "You won’t receive newsletter updates from us." : status === "error" ? "Please use the unsubscribe link in your latest email." : "One moment, please."}</p><Link href="/">Back to home</Link></section></main>;
}
