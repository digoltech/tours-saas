"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Armchair, Bus, CalendarDays, CircleDollarSign, Route, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import { getBookingDashboardSummary } from "../auth/services/api-client";

type Summary = { todayBookings: number; todaySales: number; upcomingTrips: number };

export function WorkspaceDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getBookingDashboardSummary().then(setSummary).catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Unable to load dashboard"),
    );
  }, []);

  const isAgencyAdmin = user?.role === "AGENCY_ADMIN";
  const title = isAgencyAdmin ? "Agency dashboard" : "Branch dashboard";
  const shortcuts = [
    ...(user?.permissions.includes("booking:read") ? [["Bookings", "/bookings", Armchair] as const] : []),
    ...(user?.permissions.includes("trip:read") ? [["Trips", "/trips", CalendarDays] as const] : []),
    ...(user?.permissions.includes("bus:read") ? [["Buses", "/buses", Bus] as const] : []),
    ...(user?.permissions.includes("agent:read") ? [["Agents", "/agents", Users] as const] : []),
    ...(user?.permissions.includes("route:read") ? [["Routes", "/routes", Route] as const] : []),
  ];
  const metrics: { label: string; value: string | number | undefined; detail: string; icon: LucideIcon }[] = [
    { label: "Bookings today", value: summary?.todayBookings, detail: "Confirmed bookings", icon: Armchair },
    { label: "Sales today", value: summary?.todaySales == null ? undefined : `₹${summary.todaySales.toLocaleString("en-IN")}`, detail: "Confirmed booking value", icon: CircleDollarSign },
    { label: "Upcoming trips", value: summary?.upcomingTrips, detail: "Scheduled departures", icon: CalendarDays },
  ];

  return <>
    <PageHeader title={title} description={`A live overview of ${isAgencyAdmin ? "your agency" : "your branch"} operations.`} />
    {error ? <div className="state-message state-error" role="alert"><strong>{error}</strong></div> : <div className="metric-grid metric-grid-three">
      {metrics.map(({ label, value, detail, icon: Icon }) => <Card className="metric-card" key={label}><Icon size={18} /><p>{label}</p><strong>{value ?? "…"}</strong><span>{detail}</span></Card>)}
    </div>}
    <Card className="workspace-shortcuts"><div className="card-heading"><div><p className="eyebrow">Workspace</p><h2>Manage your operations</h2></div></div><div className="workspace-shortcut-list">{shortcuts.map(([label, href, Icon]) => <Link className="setup-row" href={href} key={href}><Icon size={18} /><strong>{label}</strong><ArrowRight size={17} /></Link>)}</div></Card>
  </>;
}
