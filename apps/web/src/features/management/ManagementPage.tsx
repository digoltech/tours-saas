"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import { EditRecordLink, ViewRecordLink } from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { PageHeader } from "../../ui/PageHeader";
import { Translate } from "../../i18n/Translate";
import { useAuth } from "../auth/components/AuthProvider";
import { isAgencyOwner, canManageTeam } from "@a-one-tours/shared/team-access";
import { useTranslations } from "../../i18n/LocaleProvider";
import {
  getAgencies,
  getAgents,
  getBranches,
} from "../auth/services/api-client";

type Resource = "agencies" | "branches" | "agents";
type Row = Record<string, unknown> & { id: string; status: string };
const labels = {
  agencies: {
    title: "Agencies",
    description: "Manage the organizations operating on the platform.",
  },
  branches: {
    title: "Branches",
    description: "Keep each agency's operating locations accurate.",
  },
  agents: {
    title: "Team",
    description: "Manage branch admins and employees across your agency.",
  },
};
export function ManagementPage({ resource, initialAgencyId = "", initialBranchId = "" }: { resource: Resource; initialAgencyId?: string; initialBranchId?: string }) {
  const { user } = useAuth();
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState(initialAgencyId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(initialBranchId);
  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scopeAgencyId = user?.agencyId ?? selectedAgencyId;
  const path = resource === "agents" ? "team" : resource;
  const singular =
    resource === "agencies"
      ? "agency"
      : resource === "branches"
        ? "branch"
        : "agent";
  const load = useCallback(async () => {
    if (resource !== "agencies" && !scopeAgencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const values =
        resource === "agencies"
          ? await getAgencies(search, statusFilter)
          : resource === "branches"
            ? await getBranches(scopeAgencyId, search, statusFilter)
            : await getAgents(scopeAgencyId, search, statusFilter, branchFilter);
      setRows(values as Row[]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load records",
      );
    } finally {
      setLoading(false);
    }
  }, [resource, scopeAgencyId, search, statusFilter, branchFilter]);
  useEffect(() => {
    if (resource !== "agents" || !scopeAgencyId || !isAgencyOwner(user?.role)) return;
    let active = true;
    void getBranches(scopeAgencyId).then((values) => { if (active) setBranchOptions(values as { id: string; name: string }[]); }).catch(() => { if (active) setBranchOptions([]); });
    return () => { active = false; };
  }, [resource, scopeAgencyId, user?.role]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN" || resource === "agencies") return;
    let active = true;
    void getAgencies()
      .then((values) => {
        if (active) {
          const options = values as { id: string; name: string }[];
          setAgencies(options);
          setSelectedAgencyId((current) => current || options[0]?.id || "");
        }
      })
      .catch(() => setAgencies([]));
    return () => {
      active = false;
    };
  }, [resource, user?.role]);
  const can = (action: string) =>
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(`${singular}:${action}`);
  if (resource === "agents" && !canManageTeam(user?.role)) return <PageHeader title="Team" description="Only agency owners and branch admins can manage employees." />;
  return (
    <>
      <PageHeader
        title={labels[resource].title}
        description={resource === "agents" && user?.role === "BRANCH_ADMIN" ? "Manage employees in your assigned branch." : labels[resource].description}
      />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      <DataTable
        title={labels[resource].title}
        data={rows}
        rowKey={(row) => row.id}
        loading={loading}
        manualFiltering
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={resource === "agents" ? "Search team members" : `Search ${resource}`}
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
          ...(resource === "agents" && isAgencyOwner(user?.role) ? [{
            id: "branch", label: "Branch", value: branchFilter, onChange: setBranchFilter,
            options: branchOptions.map((branch) => ({ value: branch.id, label: branch.name })),
          }] : []),
        ]}
        toolbarActions={
          <>
            {user?.role === "SUPER_ADMIN" && resource !== "agencies" && (
              <label>
                <Translate text="Agency" />
                <select
                  aria-label="Agency"
                  value={selectedAgencyId}
                  onChange={(event) => setSelectedAgencyId(event.target.value)}
                >
                  <option value="">Select agency</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {resource === "agents" && isAgencyOwner(user?.role) && <Link prefetch={false} className="button button-secondary" href={`/dashboard/roles/new${scopeAgencyId ? `?agencyId=${encodeURIComponent(scopeAgencyId)}` : ""}`}><Plus size={16}/>{t("Add custom role")}</Link>}
            {can("create") && (
              <Link
                prefetch={false}
                className="button button-primary"
                href={`/dashboard/${path}/new${scopeAgencyId ? `?agencyId=${encodeURIComponent(scopeAgencyId)}` : ""}`}
              >
                <Plus size={16} />
                {t(resource === "agents" ? "Add team member" : `Add ${singular}`)}
              </Link>
            )}
          </>
        }
        columns={[
          {
            id: "name",
            header: "Name",
            render: (row) => (
              <Link
                prefetch={false}
                className="text-link"
                href={`/dashboard/${path}/${row.id}`}
              >
                <strong>
                  {String(
                    row.name ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`,
                  )}
                </strong>
              </Link>
            ),
          },
          {
            id: "code",
            header: "Code / email",
            render: (row) => String(row.slug ?? row.code ?? row.email ?? "—"),
          },
          {
            id: "status",
            header: "Status",
            render: (row) => <Badge>{row.status}</Badge>,
          },
          ...(resource === "agents" ? [
            { id: "role", header: "Role", render: (row: Row) => t(String(row.roleName ?? "Employee")) },
            { id: "branch", header: "Branch", render: (row: Row) => String(row.branchName ?? "—") },
          ] : []),
          ...(resource === "branches" ? [{ id: "admin", header: "Branch admin", render: (row: Row) => {
            const admins = row.branchAdmins as { id: string; firstName: string; lastName: string }[] | undefined;
            return admins?.length ? admins.map((admin) => `${admin.firstName} ${admin.lastName}`).join(", ") : <span>{t("Admin not assigned")} {isAgencyOwner(user?.role) && <Link prefetch={false} className="text-link" href={`/dashboard/team/new?agencyId=${encodeURIComponent(String(row.agencyId))}&branchId=${encodeURIComponent(row.id)}&role=BRANCH_ADMIN`}>{t("Appoint admin")}</Link>}</span>;
          } }] : []),
          {
            id: "actions",
            header: "Actions",
            render: (row) => <div className="table-actions">
              <ViewRecordLink href={`/dashboard/${path}/${row.id}`} />
              {can("update") && row.id !== user?.id && <EditRecordLink href={`/dashboard/${path}/${row.id}/edit`} />}
            </div>,
          },
        ]}
      />
    </>
  );
}
