"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Building2, CircleUserRound, CreditCard, Monitor, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/components/AuthProvider";
import { ProfileWorkspace } from "../auth/components/ProfileWorkspace";
import { AgencySettingsWorkspace } from "./SettingsWorkspace";
import { NotificationsPage } from "./NotificationsPage";
import { LanguageSelector } from "../../i18n/LanguageSelector";
import { useTranslations } from "../../i18n/LocaleProvider";
import { PageHeader } from "../../ui/PageHeader";
import { Card } from "../../ui/Card";

type Tab = "profile" | "security" | "agency" | "ui" | "notifications" | "billing" | "access";

export function SettingsWorkspace() {
  const { user } = useAuth();
  const t = useTranslations();
  const [active, setActive] = useState<Tab>("profile");
  const [density, setDensity] = useState("comfortable");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("digol-density");
      const timer = window.setTimeout(() => setDensity(stored === "compact" ? "compact" : "comfortable"), 0);
      return () => window.clearTimeout(timer);
    } catch { /* Keep the default display preference. */ }
  }, []);
  const tabs = [
    { id: "profile" as const, label: "Profile", icon: CircleUserRound },
    { id: "security" as const, label: "Security", icon: ShieldCheck },
    ...(user?.agencyId ? [{ id: "agency" as const, label: "Agency settings", icon: Building2 }] : []),
    { id: "ui" as const, label: "UI settings", icon: Monitor },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    ...(user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN" ? [{ id: "billing" as const, label: "Subscription & billing", icon: CreditCard }] : []),
    ...(user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN" ? [{ id: "access" as const, label: "Advanced access", icon: ShieldCheck }] : []),
  ];
  return <>
    <PageHeader title="Settings" description="Manage your profile, security, agency, and workspace preferences." />
    <div className="workspace-tabs" role="tablist" aria-label={t("Settings")}>
      {tabs.map((tab, index) => <button key={tab.id} id={`settings-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls="settings-panel" tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} onKeyDown={(event) => {
        let next: number;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault(); setActive(tabs[next].id);
        document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
      }}><tab.icon size={17} />{t(tab.label)}</button>)}
    </div>
    <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${active}`} tabIndex={0}>
      {(active === "profile" || active === "security") && <ProfileWorkspace key={active} section={active} />}
      {active === "agency" && <><ProfileWorkspace section="agency" /><AgencySettingsWorkspace section="agency" /></>}
      {active === "billing" && <AgencySettingsWorkspace section="billing" />}
      {active === "notifications" && <NotificationsPage preferencesOnly />}
      {active === "access" && <Card className="preferences-card"><h2>{t("Advanced access settings")}</h2><p>{t("Use custom roles only when the standard owner, branch admin, and employee roles do not meet your needs.")}</p><Link className="button button-secondary" href="/dashboard/roles">{t("Manage custom roles")}</Link></Card>}
      {active === "ui" && <Card className="preferences-card">
        <div><p className="eyebrow">{t("WORKSPACE PREFERENCES")}</p><h2>{t("Make the workspace yours")}</h2><p>{t("Choose your language and display preferences.")}</p></div>
        <div className="preference-row"><div><strong>{t("Language")}</strong><p>{t("Select the language used across the platform.")}</p></div><LanguageSelector /></div>
        <label className="preference-row"><span><strong>{t("Display density")}</strong><span className="preference-help">{t("Adjust spacing in your workspace. Saved on this device.")}</span></span><select value={density} onChange={(event) => {
          const value = event.target.value; setDensity(value); document.documentElement.dataset.density = value;
          try { localStorage.setItem("digol-density", value); setNotice(t("Display preference saved.")); }
          catch { setNotice(t("Preference applied for this session. Browser storage is unavailable.")); }
        }}><option value="comfortable">{t("Comfortable")}</option><option value="compact">{t("Compact")}</option></select></label>
        {notice && <p role="status">{notice}</p>}
      </Card>}
    </div>
  </>;
}
