import "server-only";

import type { PageResult, Trip } from "../auth/services/api-client";
import { serverApiRequest } from "../../lib/server-api";

export type BookingDashboardSummary = {
  todayBookings: number;
  todaySales: number;
  upcomingTrips: number;
};

export type SuperAdminDashboardSummary = {
  totalAgencies: number;
  activeAgencies: number;
  totalBranches: number;
  totalAgents: number;
  totalBuses: number;
  totalDrivers: number;
  totalRoutes: number;
  totalTrips: number;
};

export async function loadUpcomingTrips(): Promise<{
  trips: Trip[];
  error?: string;
}> {
  const departureAfter = encodeURIComponent(new Date().toISOString());
  try {
    const result = await serverApiRequest<{ data: Trip[] }>(
      `/api/trips?status=SCHEDULED&departureAfter=${departureAfter}&limit=6`,
    );
    return { trips: result.data };
  } catch (error) {
    return {
      trips: [],
      error: error instanceof Error ? error.message : "Unable to load upcoming trips",
    };
  }
}

export async function loadInitialTripsPage(): Promise<{
  page: PageResult<Trip> | null;
  error?: string;
}> {
  try {
    return {
      page: await serverApiRequest<PageResult<Trip>>(
        "/api/trips?page=1&limit=20",
      ),
    };
  } catch (error) {
    return {
      page: null,
      error: error instanceof Error ? error.message : "Unable to load trips",
    };
  }
}

export async function loadBookingDashboardSummary(): Promise<{
  summary: BookingDashboardSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await serverApiRequest<BookingDashboardSummary>(
        "/api/bookings/summary",
      ),
    };
  } catch (error) {
    return {
      summary: null,
      error: error instanceof Error ? error.message : "Unable to load dashboard",
    };
  }
}

export async function loadSuperAdminDashboardSummary(): Promise<{
  summary: SuperAdminDashboardSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await serverApiRequest<SuperAdminDashboardSummary>(
        "/api/dashboard/summary",
      ),
    };
  } catch (error) {
    return {
      summary: null,
      error: error instanceof Error ? error.message : "Unable to load dashboard",
    };
  }
}
