"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardOverview } from "../../../src/features/management/DashboardOverview";
import { useAuth } from "../../../src/features/auth/components/AuthProvider";

export default function SuperAdminDashboardRoute() {
  const { user, status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated" && user?.role !== "SUPER_ADMIN") router.replace("/dashboard/home");
  }, [router, status, user?.role]);
  if (status !== "authenticated" || user?.role !== "SUPER_ADMIN") return null;
  return <DashboardOverview />;
}
