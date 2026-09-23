"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Map, Users } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getDashboardSummary } from "../auth/services/api-client";

type Summary = { totalAgencies: number; activeAgencies: number; totalBranches: number; totalAgents: number };

export function DashboardOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getDashboardSummary().then(setSummary).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load dashboard"));
  }, []);
  const metrics = summary ? [
    ["Agencies", summary.totalAgencies, `${summary.activeAgencies} active`, Building2],
    ["Branches", summary.totalBranches, "Across all agencies", Map],
    ["Agents", summary.totalAgents, "Assigned platform users", Users],
  ] as const : [];
  return <>
    <PageHeader title="Platform overview" description="A live view of the agency network and its operating teams." action={<Link className="button button-secondary" href="/agencies">Manage agencies <ArrowRight size={16} /></Link>} />
    {error ? <div className="state-message state-error"><strong>{error}</strong></div> : <div className="metric-grid metric-grid-three">{metrics.map(([label, value, detail, Icon]) => <Card className="metric-card" key={label}><Icon size={18} /><p>{label}</p><strong>{summary ? value : "..."}</strong><span>{detail}</span></Card>)}</div>}
    <div className="dashboard-grid"><Card className="setup-card"><p className="eyebrow">Phase 3 workspace</p><h2>Organization control center</h2><p className="muted">Create agencies, add branches, and keep agent access aligned with the existing tenant and role model.</p><div className="setup-list"><Link className="setup-row" href="/agencies"><strong>Review agencies</strong><ArrowRight size={17} /></Link><Link className="setup-row" href="/branches"><strong>Review branches</strong><ArrowRight size={17} /></Link><Link className="setup-row" href="/agents"><strong>Review agents</strong><ArrowRight size={17} /></Link></div></Card></div>
  </>;
}
