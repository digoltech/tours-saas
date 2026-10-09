"use client";

import Link from "next/link";
import "../styles/marketing.css";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { SiteFooter } from "./SiteFooter";
import { LanguageSelector } from "../i18n/LanguageSelector";
import { useTranslations } from "../i18n/LocaleProvider";

export function PublicLayout({ eyebrow, title, intro, children, contentLanguage }: { eyebrow: string; title: string; intro: string; children: ReactNode; contentLanguage?: string }) {
  const t = useTranslations();
  return <div className="public-page">
    <header className="public-header"><Brand /><nav aria-label={t("Page navigation")}><Link href="/features">{t("Features")}</Link><Link href="/guides">{t("Guides")}</Link><Link href="/contact">{t("Contact")}</Link><LanguageSelector /><Link className="public-header-cta" href="/auth/register">{t("Get started")}</Link></nav></header>
    <main className="public-content" lang={contentLanguage}><div className="public-intro"><span>{t(eyebrow)}</span><h1>{t(title)}</h1><p>{t(intro)}</p></div><div className="public-body">{children}</div></main>
    <SiteFooter />
  </div>;
}
