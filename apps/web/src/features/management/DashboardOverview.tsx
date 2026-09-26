import { cn } from "../../lib/utils";
import Link from "next/link";
import { Activity, ArrowRight, Building2, Bus, Map, Route as RouteIcon, Users, UserRound } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import type { Trip } from "../auth/services/api-client";
import { UpcomingTrips } from "./UpcomingTrips";

type Summary = { totalAgencies: number; activeAgencies: number; totalBranches: number; totalAgents: number; totalBuses: number; totalDrivers: number; totalRoutes: number; totalTrips: number };
export function DashboardOverview({
  summary,
  summaryError,
  trips,
  tripsError,
}: {
  summary: Summary | null;
  summaryError?: string;
  trips: Trip[];
  tripsError?: string;
}) {
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
    <PageHeader title="Super Admin dashboard" description="Platform wide view of agencies, teams, fleet, routes, and trips." />
    {summaryError ? <div className={cn("state-message state-error")} role="alert"><strong>{summaryError}</strong></div> : <div className={cn("metric-grid metric-grid-three")}>{metrics.map(([label, value, detail, Icon, href]) => <Link className={cn("metric-link")} href={href} key={label}><Card className={cn("metric-card")}><Icon size={18} /><p>{label}</p><strong>{summary ? value : "—"}</strong><span>{detail}</span></Card></Link>)}</div>}
    <UpcomingTrips initialTrips={trips} initialError={tripsError} />
    <div className={cn("dashboard-grid")}><Card className={cn("setup-card")}><div className={cn("card-heading")}><div><p className={cn("eyebrow")}>Platform operations</p><h2>Keep the travel network moving</h2></div><Link className={cn("button button-secondary")} href="/dashboard/agencies">Manage agencies <ArrowRight size={16} /></Link></div><p className={cn("muted")}>Review the organization structure and operating resources from this dashboard.</p><div className={cn("setup-list")}>{[["Agencies", "/dashboard/agencies"], ["Branches", "/dashboard/branches"], ["Routes and stops", "/dashboard/routes"], ["Trips", "/dashboard/trips"]].map(([label, href]) => <Link className={cn("setup-row")} href={href} key={href}><strong>{label}</strong><ArrowRight size={17} /></Link>)}</div></Card></div>
  </>;
}
