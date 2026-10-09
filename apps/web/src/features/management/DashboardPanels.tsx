"use client";

import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import "../../styles/dashboard.css";

export type DashboardAction = { title: string; description: string; href: string; icon: LucideIcon; primary?: boolean };
export type DashboardMetric = { label: string; value: number | string | undefined; detail: string; icon: LucideIcon; href?: string; note?: string };

export function DashboardActions({ actions }: { actions: DashboardAction[] }) {
  const t = useTranslations();
  if (!actions.length) return null;
  return <section className="dashboard-section" aria-labelledby="dashboard-actions-title">
    <div className="dashboard-section-heading"><div><p className="eyebrow">{t("GET THINGS DONE")}</p><h2 id="dashboard-actions-title">{t("Quick actions")}</h2></div><p>{t("Your everyday tools, one click away.")}</p></div>
    <div className="dashboard-actions-grid">{actions.map(({ title, description, href, icon: Icon, primary }) => <Link prefetch={false} className={`dashboard-action${primary ? " dashboard-action-primary" : ""}`} href={href} key={href}>
      <span className="dashboard-action-icon"><Icon size={21} aria-hidden="true" /></span><span className="dashboard-action-copy"><strong>{t(title)}</strong><small>{t(description)}</small></span><ArrowUpRight className="dashboard-action-arrow" size={18} aria-hidden="true" />
    </Link>)}</div>
  </section>;
}

export function DashboardStats({ metrics, error, platform = false }: { metrics: DashboardMetric[]; error?: string; platform?: boolean }) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  return <section className="dashboard-section" aria-labelledby="dashboard-stats-title">
    <div className="dashboard-section-heading"><div><p className="eyebrow">{t("AT A GLANCE")}</p><h2 id="dashboard-stats-title">{t(platform ? "Platform overview" : "Today's overview")}</h2></div><p>{t(platform ? "Live totals across the travel network." : "Live numbers for your operating scope.")}</p></div>
    {error ? <div className="state-message state-error" role="alert">{error}</div> : <div className="dashboard-stats-grid">{metrics.map(({ label, value, detail, icon: Icon, href, note }) => {
      const content = <><div className="dashboard-stat-top"><span>{t(label)}</span><span className="dashboard-stat-icon"><Icon size={19} aria-hidden="true" /></span></div><strong className="dashboard-stat-value">{typeof value === "number" ? value.toLocaleString(locale) : value ?? "—"}</strong><div className="dashboard-stat-foot"><span>{note ? `${note} · ` : ""}{t(detail)}</span>{href && <ArrowUpRight size={15} aria-hidden="true" />}</div></>;
      return href ? <Link prefetch={false} className="dashboard-stat" href={href} key={label}>{content}</Link> : <div className="dashboard-stat" key={label}>{content}</div>;
    })}</div>}
  </section>;
}
