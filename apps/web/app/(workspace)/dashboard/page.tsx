"use client";

import { AgentBookingsDashboard } from "../../../src/features/booking/BookingWorkspace";
import { useAuth } from "../../../src/features/auth/components/AuthProvider";
import { WorkspaceDashboard } from "../../../src/features/management/WorkspaceDashboard";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRoute() {
  const { user, status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") router.replace("/superadmin");
  }, [router, user?.role]);
  if (status === "loading") return null;
  if (user?.role === "SUPER_ADMIN") return null;
  if (user?.role === "AGENT") return <AgentBookingsDashboard />;
  return <WorkspaceDashboard />;
}
