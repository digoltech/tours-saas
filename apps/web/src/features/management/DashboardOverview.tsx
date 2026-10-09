"use client";

import { Building2, Bus, CalendarDays, Map, Route, Users, UserRound, Ticket } from "lucide-react";
import { PageHeader } from "../../ui/PageHeader";
import type { Trip } from "../auth/services/api-client";
import type { SuperAdminDashboardSummary } from "./dashboard-data";
import { DashboardActions, DashboardStats, type DashboardAction, type DashboardMetric } from "./DashboardPanels";
import { UpcomingTrips } from "./UpcomingTrips";

export function DashboardOverview({ summary, summaryError, trips, tripsError }: {
  summary: SuperAdminDashboardSummary | null; summaryError?: string; trips: Trip[]; tripsError?: string;
}) {
  const actions: DashboardAction[] = [
    { title: "Manage agencies", description: "Review agencies across the platform", href: "/dashboard/agencies", icon: Building2, primary: true },
    { title: "Tickets & bookings", description: "Find tickets and manage bookings", href: "/dashboard/bookings", icon: Ticket },
    { title: "Manage buses", description: "Keep your fleet ready to travel", href: "/dashboard/buses", icon: Bus },
    { title: "Manage trips", description: "Review departures and schedules", href: "/dashboard/trips", icon: CalendarDays },
    { title: "Manage team", description: "Manage staff and branch assignments", href: "/dashboard/team", icon: Users },
    { title: "Branches", description: "Review operating locations", href: "/dashboard/branches", icon: Map },
  ];
  const metrics: DashboardMetric[] = [
    { label: "Agencies", value: summary?.totalAgencies, detail: "Across the platform", icon: Building2, href: "/dashboard/agencies" },
    { label: "Active agencies", value: summary?.activeAgencies, detail: "Ready for operations", icon: Building2, href: "/dashboard/agencies" },
    { label: "Branches", value: summary?.totalBranches, detail: "Operating locations", icon: Map, href: "/dashboard/branches" },
    { label: "Employees", value: summary?.totalAgents, detail: "Across the platform", icon: Users, href: "/dashboard/team" },
    { label: "Buses", value: summary?.totalBuses, detail: "Fleet vehicles", icon: Bus, href: "/dashboard/buses" },
    { label: "Drivers", value: summary?.totalDrivers, detail: "Licensed staff", icon: UserRound, href: "/dashboard/drivers" },
    { label: "Routes", value: summary?.totalRoutes, detail: "Configured journeys", icon: Route, href: "/dashboard/routes" },
    { label: "Trips", value: summary?.totalTrips, detail: "Scheduled operations", icon: CalendarDays, href: "/dashboard/trips" },
  ];
  return <>
    <PageHeader title="Super Admin dashboard" description="Platform wide view of agencies, teams, fleet, routes, and trips." />
    <DashboardActions actions={actions} />
    <DashboardStats metrics={metrics} error={summaryError} platform />
    <UpcomingTrips initialTrips={trips} initialError={tripsError} />
  </>;
}
