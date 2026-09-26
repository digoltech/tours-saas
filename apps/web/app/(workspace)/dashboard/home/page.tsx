import { redirect } from "next/navigation";
import { getRequestUser } from "../../../../src/features/auth/server";
import { AgentBookingsDashboard } from "../../../../src/features/booking/BookingWorkspace";
import {
  loadBookingDashboardSummary,
  loadUpcomingTrips,
} from "../../../../src/features/management/dashboard-data";
import { WorkspaceDashboard } from "../../../../src/features/management/WorkspaceDashboard";

export default async function DashboardRoute() {
  const user = await getRequestUser();
  if (!user) redirect("/login?from=%2Fdashboard%2Fhome");
  if (user.role === "SUPER_ADMIN") redirect("/dashboard/superadmin");

  const [summaryResult, tripsResult] = await Promise.all([
    loadBookingDashboardSummary(),
    loadUpcomingTrips(),
  ]);

  if (user.role === "AGENT")
    return (
      <AgentBookingsDashboard
        summary={summaryResult.summary}
        summaryError={summaryResult.error}
        trips={tripsResult.trips}
        tripsError={tripsResult.error}
      />
    );

  return (
    <WorkspaceDashboard
      summary={summaryResult.summary}
      summaryError={summaryResult.error}
      trips={tripsResult.trips}
      tripsError={tripsResult.error}
    />
  );
}
