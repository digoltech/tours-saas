"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Shield } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import { EditRecordLink } from "../../ui/RecordPage";
import { PageHeader } from "../../ui/PageHeader";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { useTranslations } from "../../i18n/LocaleProvider";
import { useAuth } from "../auth/components/AuthProvider";
import {
  getAgencies,
  getWorkspaceRoles,
  type WorkspaceRole,
  type WorkspaceMember,
} from "../auth/services/api-client";
import "../../styles/roles.css";

export function RolesPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [agencyId, setAgencyId] = useState(user?.agencyId ?? "");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isPlatformAdmin = user?.role === "SUPER_ADMIN";
  const admin = isPlatformAdmin || user?.role === "AGENCY_ADMIN";
  const query = isPlatformAdmin
    ? `?agencyId=${encodeURIComponent(agencyId)}`
    : "";
  const load = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getWorkspaceRoles(
        isPlatformAdmin ? agencyId : undefined,
      );
      setRoles(data.roles);
      setMembers(data.users);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load roles");
    } finally {
      setLoading(false);
    }
  }, [agencyId, isPlatformAdmin]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    void getAgencies()
      .then((values) => {
        if (active) setAgencies(values as { id: string; name: string }[]);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load agencies",
        ),
      );
    return () => {
      active = false;
    };
  }, [isPlatformAdmin]);
  if (!admin)
    return (
      <PageHeader
        title="Advanced access settings"
        description="Only agency owners can manage advanced access."
      />
    );
  return (
    <>
      <PageHeader
        title="Advanced access settings"
        description="Manage team access across your agency."
      />
      {isPlatformAdmin && (
        <label className="roles-agency-picker">
          {t("Agency")}
          <select
            value={agencyId}
            onChange={(event) => {
              setAgencyId(event.target.value);
              setRoles([]);
              setMembers([]);
            }}
          >
            <option value="">{t("Select agency")}</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {agencyId ? (
        <>
          <Card className="roles-section">
            <div className="roles-section-heading">
              <div>
                <p className="eyebrow">{t("ACCESS CONTROL")}</p>
                <h2>{t("Agency roles")}</h2>
                <p>{t("Choose a role to review its permissions.")}</p>
              </div>
              {admin && (
                <Link
                  prefetch={false}
                  className="button button-primary"
                  href={`/dashboard/roles/new${query}`}
                >
                  <Plus size={16} />
                  {t("Create role")}
                </Link>
              )}
            </div>
            {loading ? (
              <p role="status">{t("Loading records...")}</p>
            ) : (
              <div className="roles-grid">
                {roles.map((role) => (
                  <article className="roles-card" key={role.id}>
                    <div className="roles-card-top">
                      <span className="roles-card-icon">
                        <Shield size={20} />
                      </span>
                      <span className="roles-scope">
                        {role.scope.toLowerCase()}
                      </span>
                    </div>
                    <h3>
                      <Link
                        prefetch={false}
                        className="text-link"
                        href={`/dashboard/roles/${role.id}${query}`}
                      >
                        {role.name}
                      </Link>
                    </h3>
                    <p>
                      {role.permissions.length} {t("permissions")} ·{" "}
                      {role.userCount} {t("members")}
                    </p>
                    <div className="roles-card-permissions">
                      {role.permissions.slice(0, 3).map((permission) => (
                        <span key={permission}>{permission}</span>
                      ))}
                    </div>
                    {admin && !role.isSystem && (
                      <EditRecordLink
                        href={`/dashboard/roles/${role.id}/edit${query}`}
                      />
                    )}
                  </article>
                ))}
              </div>
            )}
          </Card>
          <Card className="roles-section">
            <div className="roles-section-heading">
              <div>
                <p className="eyebrow">{t("TEAM ACCESS")}</p>
                <h2>{t("All team members")}</h2>
                <p>
                  {t(
                    "Open a member to review their access or edit their assigned role.",
                  )}
                </p>
              </div>
            </div>
            <DataTable
              title="All team members"
              data={members}
              rowKey={(member) => member.id}
              loading={loading}
              searchPlaceholder="Search team members"
              searchText={(member) =>
                `${member.firstName} ${member.lastName} ${member.email} ${member.branchName ?? ""}`
              }
              filters={[
                {
                  id: "status",
                  label: "Status",
                  options: Array.from(
                    new Set(members.map((member) => member.status)),
                  ).map((value) => ({ value, label: value })),
                  matches: (member, value) => member.status === value,
                },
                {
                  id: "role",
                  label: "Role",
                  options: roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  })),
                  matches: (member, value) => member.roleId === value,
                },
                {
                  id: "branch",
                  label: "Branch",
                  options: Array.from(
                    new Set(
                      members.map(
                        (member) => member.branchName ?? "Agency wide",
                      ),
                    ),
                  ).map((value) => ({ value, label: value })),
                  matches: (member, value) =>
                    (member.branchName ?? "Agency wide") === value,
                },
              ]}
              columns={[
                {
                  id: "name",
                  header: "Team member",
                  render: (member) => (
                    <div className="roles-member">
                      <span className="roles-avatar">
                        {member.firstName[0]}
                        {member.lastName[0]}
                      </span>
                      <span>
                        <Link
                          prefetch={false}
                          className="text-link"
                          href={`/dashboard/team/${member.id}`}
                        >
                          <strong>
                            {member.firstName} {member.lastName}
                          </strong>
                        </Link>
                        <small>{member.email}</small>
                      </span>
                    </div>
                  ),
                },
                {
                  id: "branch",
                  header: "Branch",
                  render: (member) => member.branchName ?? t("Agency wide"),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (member) => <Badge>{member.status}</Badge>,
                },
                {
                  id: "role",
                  header: "Role",
                  render: (member) => {
                    const role = roles.find(
                      (candidate) => candidate.id === member.roleId,
                    );
                    return role ? (
                      <Link
                        prefetch={false}
                        className="text-link"
                        href={`/dashboard/roles/${role.id}${query}`}
                      >
                        {role.name}
                      </Link>
                    ) : (
                      "—"
                    );
                  },
                },
                {
                  id: "actions",
                  header: "Actions",
                  render: (member) =>
                    member.id !== user?.id &&
                    roles.find((role) => role.id === member.roleId)?.code !==
                      "SUPER_ADMIN" &&
                    (isPlatformAdmin ||
                      user?.permissions.includes("agent:update")) ? (
                      <EditRecordLink
                        href={`/dashboard/roles/members/${member.id}/edit${query}`}
                      />
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Card>{t("Select an agency to manage its team and roles.")}</Card>
      )}
    </>
  );
}
