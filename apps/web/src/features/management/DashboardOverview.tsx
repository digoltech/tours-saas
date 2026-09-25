"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Building2, Bus, Map, Route as RouteIcon, Users, UserRound } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getDashboardSummary } from "../auth/services/api-client";

type Summary = { totalAgencies: number; activeAgencies: number; totalBranches: number; totalAgents: number; totalBuses: number; totalDrivers: number; totalRoutes: number; totalTrips: number };
export function DashboardOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getDashboardSummary().then(setSummary).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load dashboard")); }, []);
  const metrics = summary ? [
    ["Agencies", summary.totalAgencies, `${summary.activeAgencies} active`, Building2, "/dashboard/agencies"],
    ["Branches", summary.totalBranches, "Operating locations", Map, "/dashboard/branches"],
    ["Agents", summary.totalAgents, "Team members", Users, "/dashboard/agents"],
    ["Buses", summary.totalBuses, "Fleet vehicles", Bus, "/dashboard/buses"],
    ["Drivers", summary.totalDrivers, "Licensed staff", UserRound, "/dashboard/drivers"],
    ["Routes", summary.totalRoutes, "Configured journeys", RouteIcon, "/dashboard/routes"],
    ["Trips", summary.totalTrips, "Scheduled operations", Activity, "/dashboard/trips"],
  ] as const : [];
  return <>
    <PageHeader title="Super Admin dashboard" description="Platform wide view of agencies, teams, fleet, routes, and trips." action={<Link className="button button-secondary" href="/dashboard/agencies">Manage agencies <ArrowRight size={16} /></Link>} />
    {error ? <div className="state-message state-error" role="alert"><strong>{error}</strong></div> : <div className="metric-grid metric-grid-three">{metrics.map(([label, value, detail, Icon, href]) => <Link className="metric-link" href={href} key={label}><Card className="metric-card"><Icon size={18} /><p>{label}</p><strong>{summary ? value : "…"}</strong><span>{detail}</span></Card></Link>)}</div>}
    <div className="dashboard-grid"><Card className="setup-card"><p className="eyebrow">Platform operations</p><h2>Keep the travel network moving</h2><p className="muted">Review the organization structure and operating resources from this dashboard.</p><div className="setup-list">{[["Agencies", "/dashboard/agencies"], ["Branches", "/dashboard/branches"], ["Routes and stops", "/dashboard/routes"], ["Trips", "/dashboard/trips"]].map(([label, href]) => <Link className="setup-row" href={href} key={href}><strong>{label}</strong><ArrowRight size={17} /></Link>)}</div></Card></div>
  </>;
}
