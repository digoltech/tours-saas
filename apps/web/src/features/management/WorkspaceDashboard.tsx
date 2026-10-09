"use client";

import { Armchair, Bus, CalendarDays, CircleDollarSign, Plus, Ticket, Users } from "lucide-react";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import { useFormattingLocale } from "../../i18n/format-client";
import type { Trip } from "../auth/services/api-client";
import type { BookingDashboardSummary } from "./dashboard-data";
import { DashboardActions, DashboardStats, type DashboardAction, type DashboardMetric } from "./DashboardPanels";
import { UpcomingTrips } from "./UpcomingTrips";

export function WorkspaceDashboard({ summary, summaryError, trips, tripsError }: {
  summary: BookingDashboardSummary | null; summaryError?: string; trips: Trip[]; tripsError?: string;
}) {
  const { user } = useAuth();
  const locale = useFormattingLocale();
  const owner = user?.role === "AGENCY_ADMIN";
  const can = (permission: string) => user?.permissions.includes(permission);
  const actions: DashboardAction[] = [
    ...(can("booking:create") ? [{ title: "Quick booking", description: "Find a trip and reserve seats", href: "/dashboard/bookings/new", icon: Plus, primary: true }] : []),
    ...(can("booking:read") ? [{ title: "Tickets & bookings", description: "Find tickets and manage bookings", href: "/dashboard/bookings", icon: Ticket }] : []),
    ...(can("bus:read") ? [{ title: "Manage buses", description: "Keep your fleet ready to travel", href: "/dashboard/buses", icon: Bus }] : []),
    ...(can("trip:read") ? [{ title: "Manage trips", description: "Review departures and schedules", href: "/dashboard/trips", icon: CalendarDays }] : []),
    ...(can("finance:read") ? [{ title: "Finance", description: "Payments, refunds, and balances", href: "/dashboard/finance", icon: CircleDollarSign }] : []),
    ...(can("agent:read") ? [{ title: "Manage team", description: owner ? "Manage staff and branch assignments" : "Manage employees in your assigned branch.", href: "/dashboard/team", icon: Users }] : []),
  ];
  const metrics: DashboardMetric[] = [
    { label: "Bookings today", value: summary?.todayBookings, detail: "Confirmed bookings", icon: Armchair, href: "/dashboard/bookings" },
    { label: "Sales today", value: summary == null ? undefined : `₹${summary.todaySales.toLocaleString(locale)}`, detail: "Confirmed booking value", icon: CircleDollarSign, ...(can("finance:read") ? { href: "/dashboard/finance" } : {}) },
    { label: "Upcoming trips", value: summary?.upcomingTrips, detail: "Scheduled departures", icon: CalendarDays, href: "/dashboard/trips" },
    { label: "Active buses", value: summary?.activeBuses, detail: "Ready for operations", icon: Bus, href: "/dashboard/buses" },
  ].filter((metric) => !metric.href || can(metric.href.endsWith("buses") ? "bus:read" : metric.href.endsWith("trips") ? "trip:read" : "booking:read"));
  return <>
    <PageHeader title={owner ? "Agency dashboard" : "Branch dashboard"} description={owner ? "A live overview of your agency operations." : "A live overview of your branch operations."} />
    <DashboardActions actions={actions} />
    <DashboardStats metrics={metrics} error={summaryError} />
    {can("trip:read") && <UpcomingTrips initialTrips={trips} initialError={tripsError} />}
  </>;
}
