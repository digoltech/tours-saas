"use client";

import Link from "next/link";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useAuth } from "../features/auth/components/AuthProvider";
import { useTranslations } from "../i18n/LocaleProvider";

export function ExtraTabs({ active }: { active: "data" | "privacy" }) {
  const { user } = useAuth();
  const t = useTranslations();
  const canManageData = user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN";
  return <nav className="workspace-tabs" aria-label={t("Extra")}>
    {canManageData && <Link href="/dashboard/data" aria-current={active === "data" ? "page" : undefined}><FileSpreadsheet size={17} />{t("Bulk data")}</Link>}
    <Link href="/dashboard/privacy" aria-current={active === "privacy" ? "page" : undefined}><ShieldCheck size={17} />{t("Privacy requests")}</Link>
  </nav>;
}
