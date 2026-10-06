"use client";

import { cn } from "../../../lib/utils";
import "../../../styles/account.css";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Brand } from "../../../ui/Brand";
import { LanguageSelector } from "../../../i18n/LanguageSelector";
import { useTranslations } from "../../../i18n/LocaleProvider";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <div className={cn("auth-shell")}>
      <header className={cn("auth-header")}>
        <Brand className="auth-brand" />
        <nav className="auth-header-links" aria-label={t("Account navigation")}><Link href="/contact">{t("Need help?")}</Link><LanguageSelector /><Link href="/auth/login">{t("Sign in")} <ArrowUpRight size={14} /></Link></nav>
      </header>

      <main className={cn("auth-main")}>
        <aside className={cn("auth-visual")} aria-label="A scenic coach journey through green hills">
          <div className={cn("auth-visual-content")}>
            <span className={cn("auth-visual-kicker")}>{t("A smoother way to move")}</span>
            <h1>{t("Every journey starts with a better plan.")}</h1>
            <p>{t("Keep your routes, seats, team, and bookings moving together with Digol TravelOS.")}</p>
            <div className={cn("auth-visual-proof")}><span className={cn("auth-proof-icon")}><ShieldCheck size={17} /></span><span><strong>{t("Built for travel teams")}</strong><small>{t("From the first booking to the final stop")}</small></span><ArrowUpRight size={17} /></div>
          </div>
          <span className={cn("auth-image-caption")}>{t("The road ahead, made simpler.")}</span>
        </aside>
        <section className={cn("auth-form-panel")} aria-label={t("Account access")}>
          <div className={cn("auth-form-inner")}>{children}</div>
        </section>
      </main>

      <footer className={cn("auth-footer")}>
        <span>© {new Date().getFullYear()} Digol Tours</span>
        <nav aria-label={t("Legal and support")}><Link href="/privacy-policy">{t("Privacy Policy")}</Link><Link href="/terms-and-conditions">{t("Terms")}</Link><Link href="/contact">{t("Contact")}</Link></nav>
        <span className={cn("auth-footer-secure")}><ShieldCheck size={14} /> {t("Secure account access")}</span>
      </footer>
    </div>
  );
}
