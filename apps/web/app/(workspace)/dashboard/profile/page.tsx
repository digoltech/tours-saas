"use client";

import { cn } from "../../../../src/lib/utils";
import { Card } from "../../../../src/ui/Card";
import { PageHeader } from "../../../../src/ui/PageHeader";
import { useAuth } from "../../../../src/features/auth/components/AuthProvider";

export default function ProfilePage() {
  const { user } = useAuth();
  return <>
    <PageHeader title="Your profile" description="Review the account details associated with your workspace access." />
    <Card className={cn("profile-details-card")}>
      <dl>
        <div><dt>Name</dt><dd>{user ? `${user.firstName} ${user.lastName}` : "Loading…"}</dd></div>
        <div><dt>Email</dt><dd>{user?.email ?? "—"}</dd></div>
        <div><dt>Role</dt><dd>{user?.role.replaceAll("_", " ") ?? "—"}</dd></div>
        <div><dt>Agency</dt><dd>{user?.agencyName ?? "—"}</dd></div>
      </dl>
    </Card>
  </>;
}
