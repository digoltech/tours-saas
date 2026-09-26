"use client";

import { cn } from "../../lib/utils";
import Link from "next/link";
import { ArrowRight, Armchair, Bus, CalendarDays, CircleDollarSign, Route, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import type { Trip } from "../auth/services/api-client";
import { UpcomingTrips } from "./UpcomingTrips";

type Summary = { todayBookings: number; todaySales: number; upcomingTrips: number };

export function WorkspaceDashboard({
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
  const { user } = useAuth();

  const isAgencyAdmin = user?.role === "AGENCY_ADMIN";
  const title = isAgencyAdmin ? "Agency dashboard" : "Branch dashboard";
  const shortcuts = [
    ...(user?.permissions.includes("booking:read") ? [["Bookings", "/dashboard/bookings", Armchair] as const] : []),
    ...(user?.permissions.includes("trip:read") ? [["Trips", "/dashboard/trips", CalendarDays] as const] : []),
    ...(user?.permissions.includes("bus:read") ? [["Buses", "/dashboard/buses", Bus] as const] : []),
    ...(user?.permissions.includes("agent:read") ? [["Agents", "/dashboard/agents", Users] as const] : []),
    ...(user?.permissions.includes("route:read") ? [["Routes", "/dashboard/routes", Route] as const] : []),
  ];
  const metrics: { label: string; value: string | number | undefined; detail: string; icon: LucideIcon }[] = [
    { label: "Bookings today", value: summary?.todayBookings, detail: "Confirmed bookings", icon: Armchair },
    { label: "Sales today", value: summary?.todaySales == null ? undefined : `₹${summary.todaySales.toLocaleString("en-IN")}`, detail: "Confirmed booking value", icon: CircleDollarSign },
    { label: "Upcoming trips", value: summary?.upcomingTrips, detail: "Scheduled departures", icon: CalendarDays },
  ];

  return <>
    <PageHeader title={title} description={`A live overview of ${isAgencyAdmin ? "your agency" : "your branch"} operations.`} />
    {summaryError ? <div className={cn("state-message state-error")} role="alert"><strong>{summaryError}</strong></div> : <div className={cn("metric-grid metric-grid-three")}>
      {metrics.map(({ label, value, detail, icon: Icon }) => <Card className={cn("metric-card")} key={label}><Icon size={18} /><p>{label}</p><strong>{value ?? "…"}</strong><span>{detail}</span></Card>)}
    </div>}
    <UpcomingTrips initialTrips={trips} initialError={tripsError} />
    <Card className={cn("workspace-shortcuts")}><div className={cn("card-heading")}><div><p className={cn("eyebrow")}>Workspace</p><h2>Manage your operations</h2></div></div><div className={cn("workspace-shortcut-list")}>{shortcuts.map(([label, href, Icon]) => <Link className={cn("setup-row")} href={href} key={href}><Icon size={18} /><strong>{label}</strong><ArrowRight size={17} /></Link>)}</div></Card>
  </>;
}
