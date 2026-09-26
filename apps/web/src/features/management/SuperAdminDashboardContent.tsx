import { redirect } from "next/navigation";
import { getRequestUser } from "../auth/server";
import {
  loadUpcomingTrips,
  loadSuperAdminDashboardSummary,
} from "./dashboard-data";
import { DashboardOverview } from "./DashboardOverview";

export async function SuperAdminDashboardContent() {
  const user = await getRequestUser();
  if (!user) redirect("/login?from=%2Fdashboard%2Fsuperadmin");
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard/home");

  const [summaryResult, tripsResult] = await Promise.all([
    loadSuperAdminDashboardSummary(),
    loadUpcomingTrips(),
  ]);

  return (
    <DashboardOverview
      summary={summaryResult.summary}
      summaryError={summaryResult.error}
      trips={tripsResult.trips}
      tripsError={tripsResult.error}
    />
  );
}
